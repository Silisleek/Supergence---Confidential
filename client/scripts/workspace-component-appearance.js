const KEY = 'sis-component-appearance';
const SCOPES =
  '#supergenceWorkspace, #sgTopDynamicIsland, #sgFloatingAgentDock, #sgAddAgentModalBackdrop, #sgAppearanceContextMenu';
const CONTROL = 'button, a, summary, select, input, [role="button"], [role="tab"]';
const COMPONENT = `${CONTROL}, dialog, [role="dialog"], [popover], svg, img,
  article, section, aside, nav, header, footer, label, h1, h2, h3, h4, h5, h6, textarea`;
const SURFACE = /(?:^|-)(?:card|pane|toolbar|badge|icon|tile|capsule|item|header|nav|footer|bar|chip)(?:-|$)/;
const OVERLAY = /(?:^|-)(?:overlay|modal|popover|drawer|backdrop)(?:-|$)/;
const TEXT_LABEL = `${CONTROL}, label, h1, h2, h3, h4, h5, h6, p`;
const IDENTITY_ATTRIBUTES = ['data-agent', 'data-tab', 'data-action', 'data-turn-id', 'data-conversation-id', 'data-date'];
const HEX = /^#[\da-f]{6}$/i;

function componentChoices(element, scope) {
  const choices = [];
  const graphic = element.closest('svg, img');
  const control = graphic?.closest(CONTROL);
  for (let node = control || graphic || element; node !== scope; node = node.parentElement) {
    if (node.id || node.matches(COMPONENT) ||
      Array.from(node.classList).some((name) => SURFACE.test(name) || OVERLAY.test(name))) {
      choices.push(node);
    }
  }
  const clicked = graphic || element;
  if (clicked !== scope && !choices.includes(clicked)) {
    choices.splice(choices.length ? 1 : 0, 0, clicked);
  }
  if (scope !== document.body && scope.id !== 'supergenceWorkspace') choices.push(scope);
  return choices;
}

function componentLabel(element) {
  const label = element.getAttribute('aria-label') || element.getAttribute('title') ||
    element.ariaLabelledByElements?.map((part) => part.textContent.trim()).join(' ') ||
    ({ sgActiveConversationCard: 'Conversation panel', sgTopDynamicIsland: 'Toolbar' })[element.id] ||
    element.labels?.[0]?.textContent.trim().slice(0, 60) ||
    (element.matches(TEXT_LABEL) ? element.textContent.trim().slice(0, 60) : '');
  if (label) return label;
  if (element.matches('svg')) return 'Icon';
  if (element.matches('img')) return element.alt || 'Image';
  const name = Array.from(element.classList).find((value) => SURFACE.test(value) || OVERLAY.test(value)) || element.id;
  if (!name) return 'Selected component';
  const words = name.replace(/^sg-?|^workspace-/, '').replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function componentSelector(element, scope) {
  const anchor = scope === document.body ? 'body' : `#${CSS.escape(scope.id)}`;
  const path = [];
  for (let node = element; node !== scope; node = node.parentElement) {
    if (node.id) {
      path.unshift(`#${CSS.escape(node.id)}`);
      return `${anchor} ${path.join(' > ')}`;
    }
    const tag = node.localName;
    const identity = IDENTITY_ATTRIBUTES.find((attr) => node.hasAttribute(attr));
    const className = [...node.classList].find((name) =>
      SURFACE.test(name) || (scope === document.body && OVERLAY.test(name)),
    );
    const part = tag + (identity ? `[${identity}=${CSS.escape(node.getAttribute(identity)) || '""'}]`
      : className ? `.${CSS.escape(className)}` : '');
    const siblings = [...node.parentElement.children].filter((child) => child.matches(part));
    const ordinal = [...node.parentElement.children].filter((child) => child.localName === tag).indexOf(node) + 1;
    path.unshift(siblings.length === 1 ? part : `${part}:nth-of-type(${ordinal})`);
  }
  return [anchor, ...path].join(' > ');
}

function loadOverrides() {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(KEY)) || {}).filter(([selector, value]) =>
      CSS.supports(`selector(${selector})`) && value && HEX.test(value.tint) &&
      (value.ink === null || HEX.test(value.ink)) && ['solid', 'glass'].includes(value.finish) &&
      Number.isInteger(value.opacity) && value.opacity >= 25 && value.opacity <= 95,
    ));
  } catch {
    return new Map();
  }
}

export function mountComponentAppearance(openBackgroundSettings) {
  const overrides = loadOverrides();
  const applied = new Set();
  let choices;
  let selector;
  let returnFocus;
  let frame;

  const menu = document.createElement('div');
  menu.id = 'sgAppearanceContextMenu';
  menu.className = 'sg-appearance-menu';
  menu.setAttribute('popover', 'auto');
  menu.setAttribute('aria-label', 'Component actions');
  menu.innerHTML = '<button type="button" aria-haspopup="dialog">Appearance</button>';
  const openAppearance = menu.firstElementChild;

  const editor = document.createElement('dialog');
  editor.id = 'sgAppearanceEditor';
  editor.className = 'supergence-styles-dialog sg-component-appearance';
  editor.setAttribute('aria-labelledby', 'sgComponentAppearanceTitle');
  editor.innerHTML = `
    <form method="dialog">
      <header>
        <h2 id="sgComponentAppearanceTitle">Appearance</h2>
      </header>
      <div class="sw-field-group">
        <label for="sgAppearanceComponent" class="sw-field-label">Component</label>
        <select id="sgAppearanceComponent" name="component" class="sw-select"></select>
      </div>
      <div class="sw-field-group">
        <label for="sgAppearanceFinish" class="sw-field-label">Finish</label>
        <select id="sgAppearanceFinish" name="finish" class="sw-select">
          <option value="solid">Solid color</option>
          <option value="glass">Liquid glass</option>
        </select>
      </div>
      <div class="sg-component-colors">
        <label class="sw-field-group">
          <span class="sw-field-label">Surface color</span>
          <input name="tint" type="color" class="sw-color-input">
        </label>
        <label class="sw-field-group">
          <span class="sw-field-label">Icon and text color</span>
          <input name="ink" type="color" class="sw-color-input">
        </label>
      </div>
      <label class="sw-field-group" id="sgComponentOpacity">
        <span class="sw-field-label">Glass opacity <output></output></span>
        <input name="opacity" type="range" min="25" max="95">
      </label>
      <p class="sw-card-desc" role="status" hidden></p>
      <footer class="sw-appearance-actions">
        <button type="button" class="sw-btn sw-btn-secondary" data-reset>Reset</button>
        <button class="sw-btn sw-btn-primary" value="done">Done</button>
      </footer>
    </form>
  `;
  document.body.append(menu, editor);
  const form = editor.querySelector('form');
  const { component, finish, tint, ink, opacity } = form.elements;
  const reset = form.querySelector('[data-reset]');
  const status = form.querySelector('[role="status"]');
  let customInk = null;

  function paint(element, preference) {
    element.toggleAttribute('data-sg-item-ink', Boolean(preference?.ink));
    if (!preference) {
      element.removeAttribute('data-sg-item-finish');
      for (const key of ['tint', 'ink', 'opacity']) element.style.removeProperty(`--sg-item-${key}`);
      return;
    }
    element.setAttribute('data-sg-item-finish', preference.finish);
    element.style.setProperty('--sg-item-tint', preference.tint);
    element.style.setProperty('--sg-item-ink', preference.ink || '');
    element.style.setProperty('--sg-item-opacity', `${preference.opacity}%`);
  }

  function applyOverrides() {
    const current = new Set();
    for (const [query, preference] of overrides) {
      const element = document.body.querySelector(query);
      if (element instanceof HTMLElement || element instanceof SVGElement) {
        paint(element, preference);
        current.add(element);
      }
    }
    for (const element of applied) if (element.isConnected && !current.has(element)) paint(element);
    applied.clear();
    for (const element of current) applied.add(element);
  }

  function save(preference) {
    if (preference) overrides.set(selector, preference);
    else overrides.delete(selector);
    applyOverrides();
    reset.disabled = !preference;
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(overrides)));
      status.hidden = true;
    } catch {
      status.textContent = 'This browser could not save the appearance change.';
      status.hidden = false;
    }
  }

  function fillEditor(element) {
    const preference = overrides.get(selector);
    const toHex = (color) => {
      const rgb = color.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
      return rgb && rgb[4] !== '0'
        ? '#' + rgb.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')
        : '';
    };
    const style = getComputedStyle(element);
    finish.value = preference?.finish || (style.backdropFilter === 'none' ? 'solid' : 'glass');
    tint.value = preference?.tint || toHex(style.backgroundColor) ||
      style.getPropertyValue('--sg-material-pane').trim() || '#151517';
    customInk = preference?.ink || null;
    ink.value = customInk || toHex(style.color) || '#f9efe5';
    opacity.value = preference?.opacity ?? 60;
    reset.disabled = !preference;
    showOpacity();
  }

  function showOpacity() {
    form.querySelector('#sgComponentOpacity').hidden = finish.value !== 'glass';
    form.querySelector('output').value = `${opacity.value}%`;
  }

  function showMenu(event) {
    const node = event.target;
    if (event.defaultPrevented || !(node instanceof Element) || !document.body.contains(node) ||
      node.closest('iframe, .agent-browser-stage')) return;
    const scope = node.closest(SCOPES) || document.body;
    choices = componentChoices(node, scope).map((element) => ({
      label: componentLabel(element),
      selector: componentSelector(element, scope),
    }));
    if (!editor.open) returnFocus = node.closest(CONTROL) || document.activeElement;
    event.preventDefault();
    const host = (menu.contains(node) ? menu.parentElement : node.closest(':popover-open, :modal')) || document.body;
    if (menu.parentElement !== host) {
      if (menu.matches(':popover-open')) menu.hidePopover();
      host.append(menu);
    }
    if (!menu.matches(':popover-open')) menu.showPopover();
    const keyboard = event.type === 'keydown' || (event.clientX === 0 && event.clientY === 0);
    const point = keyboard ? node.getBoundingClientRect() : event;
    menu.style.left = `${Math.max(4, Math.min(keyboard ? point.left : point.clientX, innerWidth - menu.offsetWidth - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(keyboard ? point.bottom : point.clientY, innerHeight - menu.offsetHeight - 4))}px`;
    openAppearance.focus();
  }
  document.addEventListener('contextmenu', (event) => {
    if (!event.shiftKey) showMenu(event);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (editor.open || menu.matches(':popover-open'))) {
      event.stopImmediatePropagation();
      return;
    }
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) showMenu(event);
  }, true);

  openAppearance.addEventListener('click', () => {
    menu.hidePopover();
    if (!choices.length) {
      openBackgroundSettings();
      return;
    }
    component.replaceChildren(...choices.map(({ label, selector }) => new Option(label, selector)));
    selector = component.value;
    const element = document.querySelector(selector);
    if (!element) return;
    status.hidden = true;
    fillEditor(element);
    if (!editor.open) editor.showModal();
    else component.focus();
  });
  form.addEventListener('input', (event) => {
    if (event.target === component) {
      selector = component.value;
      const element = document.querySelector(selector);
      if (element) fillEditor(element);
      return;
    }
    if (event.target === ink) customInk = ink.value;
    showOpacity();
    save({ finish: finish.value, tint: tint.value, ink: customInk, opacity: Number(opacity.value) });
  });
  reset.addEventListener('click', () => {
    save(null);
    const element = document.querySelector(selector);
    if (element) fillEditor(element);
    finish.focus();
  });
  editor.addEventListener('close', () => returnFocus?.focus({ preventScroll: true }));

  if (overrides.size) applyOverrides();
  new MutationObserver(() => {
    if (!overrides.size || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      applyOverrides();
    });
  }).observe(document.body, { childList: true, subtree: true });
}
