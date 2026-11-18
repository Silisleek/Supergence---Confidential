const STORAGE_KEY = 'sis-workspace-appearance';
const WALLPAPERS = {
  cosmic: { label: 'Cosmic Hyperspace', path: '/wallpapers/cosmic-hyperspace-warp.jpg' },
  horizon: { label: 'Interstellar Horizon', path: '/wallpapers/interstellar-horizon.jpg' },
  nebula: { label: 'Quantum Nebula', path: '/wallpapers/quantum-nebula.jpg' },
};
const DEFAULTS = {
  background: 'solid',
  backgroundColor: null,
  panelFinish: 'solid',
  panelColor: null,
  panelOpacity: 60,
};
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const IMAGE_LIMIT = 20 * 1024 * 1024;
const isColor = (value) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);

function useDarkPanelText(tint, opacity, background) {
  const luminance = [0.2126, 0.7152, 0.0722].reduce((sum, weight, channel) => {
    const start = 1 + channel * 2;
    const foreground = Number.parseInt(tint.slice(start, start + 2), 16);
    const backdrop = Number.parseInt(background.slice(start, start + 2), 16);
    const mixed = (foreground * opacity + backdrop * (1 - opacity)) / 255;
    const linear = mixed <= 0.04045 ? mixed / 12.92 : ((mixed + 0.055) / 1.055) ** 2.4;
    return sum + weight * linear;
  }, 0);
  return luminance > 0.18;
}

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      background: Object.hasOwn(WALLPAPERS, saved.background) ||
        ['solid', 'custom'].includes(saved.background) ? saved.background : DEFAULTS.background,
      backgroundColor: isColor(saved.backgroundColor) ? saved.backgroundColor : DEFAULTS.backgroundColor,
      panelFinish: saved.panelFinish === 'glass' ? 'glass' : DEFAULTS.panelFinish,
      panelColor: isColor(saved.panelColor) ? saved.panelColor : DEFAULTS.panelColor,
      panelOpacity: Number.isInteger(saved.panelOpacity) &&
        saved.panelOpacity >= 25 && saved.panelOpacity <= 95 ? saved.panelOpacity : DEFAULTS.panelOpacity,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

async function wallpaperFile(file) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_KEY, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('wallpapers');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('wallpapers', file ? 'readwrite' : 'readonly');
      const store = tx.objectStore('wallpapers');
      const request = file ? store.put(file, 'custom') : store.get('custom');
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function mountWorkspaceAppearance(root) {
  root.innerHTML = `
    <h3 class="sw-card-title">Background and panels</h3>
    <div class="sw-appearance-grid">
      <div class="sw-field-group">
        <label class="sw-field-label" for="swBackground">Workspace background</label>
        <select id="swBackground" class="sw-select">
          ${Object.entries(WALLPAPERS).map(([key, { label }]) => `<option value="${key}">${label}</option>`).join('')}
          <option value="custom">Custom wallpaper</option>
          <option value="solid">Solid color</option>
        </select>
        <div id="swBackgroundColorField" class="sw-field-group" hidden>
          <label class="sw-field-label" for="swBackgroundColor">Background color</label>
          <input id="swBackgroundColor" type="color" class="sw-color-input">
        </div>
        <div id="swWallpaperField" class="sw-field-group" hidden>
          <label class="sw-field-label" for="swWallpaperFile">Wallpaper image</label>
          <input id="swWallpaperFile" type="file" accept="${IMAGE_TYPES.join(',')}"
            aria-describedby="swWallpaperInfo">
          <p id="swWallpaperInfo" class="sw-card-desc"></p>
        </div>
      </div>
      <div class="sw-field-group">
        <label class="sw-field-label" for="swPanelFinish">Panel finish</label>
        <select id="swPanelFinish" class="sw-select">
          <option value="glass">Liquid glass</option>
          <option value="solid">Solid color</option>
        </select>
        <label class="sw-field-label" for="swPanelColor">Panel color</label>
        <div class="sw-input-row">
          <input id="swPanelColor" type="color" class="sw-color-input">
          <button id="swPalettePanelColor" type="button" class="sw-btn sw-btn-secondary" hidden>Use palette color</button>
        </div>
        <div id="swPanelOpacityField" class="sw-field-group">
          <label class="sw-field-label" for="swPanelOpacity">
            Glass opacity <output for="swPanelOpacity" id="swPanelOpacityValue"></output>
          </label>
          <input id="swPanelOpacity" type="range" min="25" max="95">
        </div>
      </div>
    </div>
    <div class="sw-appearance-actions">
      <button id="swResetAppearance" type="button" class="sw-btn sw-btn-secondary">Reset background and panels</button>
      <span id="swAppearanceStatus" class="sw-feedback" role="status"></span>
    </div>
  `;

  const get = (id) => root.querySelector(`#sw${id}`);
  const background = get('Background');
  const backgroundColor = get('BackgroundColor');
  const fileInput = get('WallpaperFile');
  const panelFinish = get('PanelFinish');
  const panelColor = get('PanelColor');
  const panelOpacity = get('PanelOpacity');
  const reset = get('ResetAppearance');
  const status = get('AppearanceStatus');
  let preferences = loadPreferences();
  let customUrl;
  let customName;

  function render() {
    const body = document.body;
    const { background: source, panelFinish: finish, panelColor: tint, panelOpacity: opacity } = preferences;
    const solid = source === 'solid';
    const custom = source === 'custom';
    const image = custom ? customUrl || WALLPAPERS.cosmic.path : WALLPAPERS[source]?.path;
    const palette = getComputedStyle(body);
    const paletteColor = palette.getPropertyValue('--sg-material-pane').trim();
    const pageColor = palette.getPropertyValue('--sg-material-page').trim();
    const backdrop = preferences.backgroundColor || (isColor(pageColor) ? pageColor : '#101012');
    const fill = tint || (isColor(paletteColor) ? paletteColor : '#151517');

    body.style.setProperty('--sg-workspace-wallpaper', solid ? 'none' : image ? `url("${image}")` : '');
    body.style.setProperty('--sg-workspace-fill', solid ? preferences.backgroundColor || '' : '');
    body.style.setProperty('--sg-panel-tint', tint || '');
    body.style.setProperty('--sg-panel-opacity', `${opacity}%`);
    body.dataset.sgPanelFinish = finish;
    body.toggleAttribute('data-sg-dark-panel-text', useDarkPanelText(
      fill, finish === 'solid' ? 1 : opacity / 100, solid ? backdrop : '#15131a',
    ));

    background.value = source;
    backgroundColor.value = backdrop;
    get('BackgroundColorField').hidden = !solid;
    get('WallpaperField').hidden = !custom;
    get('WallpaperInfo').textContent = customName || 'JPEG, PNG, WebP or AVIF · Up to 20 MB';
    panelFinish.value = finish;
    panelColor.value = fill;
    get('PalettePanelColor').hidden = !tint;
    get('PanelOpacityField').hidden = finish !== 'glass';
    panelOpacity.value = opacity;
    get('PanelOpacityValue').value = `${opacity}%`;
  }

  function update(changes, message = '') {
    preferences = { ...preferences, ...changes };
    render();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      status.textContent = message;
    } catch {
      status.textContent = 'Changes could not be saved in this browser.';
    }
  }

  background.addEventListener('change', () => update({ background: background.value }));
  backgroundColor.addEventListener('input', () => update({ backgroundColor: backgroundColor.value }));
  panelFinish.addEventListener('change', () => update({ panelFinish: panelFinish.value }));
  panelColor.addEventListener('input', () => update({ panelColor: panelColor.value }));
  panelOpacity.addEventListener('input', () => update({ panelOpacity: Number(panelOpacity.value) }));
  get('PalettePanelColor').addEventListener('click', () => {
    update({ panelColor: null });
    panelColor.focus();
  });
  reset.addEventListener('click', () => update(DEFAULTS, 'Default appearance restored.'));

  render();
  const restore = wallpaperFile().then((file) => {
    if (!file) return;
    customUrl = URL.createObjectURL(file);
    customName = file.name;
    render();
  }).catch(() => {
    if (preferences.background === 'custom') status.textContent = 'The saved wallpaper could not be opened.';
  });

  fileInput.addEventListener('change', async () => {
    const [file] = fileInput.files;
    fileInput.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > IMAGE_LIMIT) {
      status.textContent = 'Choose a JPEG, PNG, WebP or AVIF image up to 20 MB.';
      return;
    }

    background.disabled = fileInput.disabled = reset.disabled = true;
    status.textContent = 'Opening image…';
    const candidate = URL.createObjectURL(file);
    let error = 'This image could not be opened.';
    try {
      await restore;
      const image = new Image();
      image.src = candidate;
      await image.decode();
      error = 'This image could not be saved in the browser.';
      await wallpaperFile(file);
      const previous = customUrl;
      customUrl = candidate;
      customName = file.name;
      update({ background: 'custom' }, 'Wallpaper saved.');
      if (previous) URL.revokeObjectURL(previous);
    } catch {
      URL.revokeObjectURL(candidate);
      status.textContent = error;
    } finally {
      background.disabled = fileInput.disabled = reset.disabled = false;
    }
  });

  new MutationObserver(render).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
