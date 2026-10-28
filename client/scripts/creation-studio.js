(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'creation-studio';
  dialog.id = 'creationStudio';
  dialog.setAttribute('aria-labelledby', 'studioTitle');
  dialog.innerHTML = `
    <header><h2 id="studioTitle">Local creation studio</h2><button type="button" id="studioClose" aria-label="Close studio">Close</button></header>
    <p>Persistent projects for Supergence to build, run, and check. Graphics and material maps are generated locally.</p>
    <p id="studioRoot">Loading workspace…</p>
    <p id="studioQualityEvidence" hidden></p>
    <h3>Project workspace</h3>
    <form id="studioProjectForm"><label>Project name<input name="name" required maxlength="160" placeholder="Name your project"></label><label>Brief<input name="brief" placeholder="What should it create?"></label><button>Create project</button></form>
    <div class="studio-projects" id="studioProjects"></div>
    <p id="studioSelected">Choose or create a project to save its assets.</p>
    <div id="studioSavedAssets" class="studio-saved-assets" aria-label="Saved project assets"></div>
    <h3>Material textures</h3>
    <form id="studioTextureForm"><label>Material<select name="kind"><option>wood</option><option>marble</option><option>brick</option><option>metal</option><option>fabric</option><option>noise</option><option>checker</option><option>grid</option><option>rings</option></select></label><label>Size<select name="size"><option>512</option><option>1024</option><option>2048</option></select></label><label>Seed<input name="seed" type="number" value="1" step="1"></label><button>Generate material maps</button></form>
    <h3>Custom vector graphics</h3>
    <form id="studioGraphicForm"><label>SVG source<textarea name="svg" required placeholder="Paste self-contained SVG artwork here"></textarea></label><button>Render SVG to PNG</button></form>
    <p role="status" id="studioStatus" aria-live="polite"></p><div class="studio-result" id="studioResult"></div>`;
  document.body.append(dialog);
  let selected = null;
  let selectionEpoch = 0;
  const status = dialog.querySelector('#studioStatus');
  const result = dialog.querySelector('#studioResult');
  async function tool(name, params = {}) {
    const response = await fetch('/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: name, params }),
    });
    if (!response.ok) throw new Error(`Request failed: HTTP ${response.status}`);
    const body = await response.json();
    if (!body.success || body.result?.error) throw new Error(body.result?.error || 'Tool failed.');
    return body.result;
  }
  function select(project) {
    const epoch = ++selectionEpoch;
    selected = project;
    dialog.querySelector('#studioSelected').textContent =
      `Active project: ${project.directory}. The assistant can use this directory with file and shell tools.`;
    for (const button of dialog.querySelectorAll('.studio-project'))
      button.setAttribute('aria-pressed', String(button.dataset.directory === project.directory));
    const saved = dialog.querySelector('#studioSavedAssets');
    saved.replaceChildren();
    for (const asset of project.assets || []) saved.append(link(asset.name, asset.url));
    const previewURL = `/workspace/${project.directory}/index.html`;
    fetch(previewURL, { method: 'HEAD' })
      .then((response) => {
        if (response.ok && epoch === selectionEpoch)
          saved.prepend(link('Open project preview', previewURL));
      })
      .catch(() => {});
  }
  async function refresh() {
    const data = await tool('get_creation_workspace', { includeAssets: true });
    dialog.querySelector('#studioRoot').textContent = `Local folder: ${data.studio}`;
    const evidence = dialog.querySelector('#studioQualityEvidence');
    const reportURL = '/workspace/supergence/quality/index.html';
    try {
      const response = await fetch(reportURL, { method: 'HEAD' });
      evidence.hidden = !response.ok;
      evidence.replaceChildren();
      if (response.ok)
        evidence.append(link('Open tested creations and comparison evidence', reportURL));
      const threeURL = '/workspace/supergence/quality/3d/index.html';
      if ((await fetch(threeURL, { method: 'HEAD' })).ok) {
        evidence.hidden = false;
        evidence.append(
          document.createElement('br'),
          link('Explore tested 3D architecture and games', threeURL),
        );
      }
    } catch {
      evidence.hidden = true;
    }
    const list = dialog.querySelector('#studioProjects');
    list.replaceChildren();
    for (const project of data.projects) {
      const button = document.createElement('button');
      button.className = 'studio-project';
      button.dataset.directory = project.directory;
      button.textContent = `${project.name} · ${project.directory}`;
      button.addEventListener('click', () => select(project));
      list.append(button);
    }
    if (selected)
      select(data.projects.find((project) => project.directory === selected.directory) || selected);
  }
  function link(label, url) {
    const anchor = document.createElement('a');
    anchor.textContent = label;
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    return anchor;
  }
  async function run(form, work) {
    const button = form.querySelector('button');
    button.disabled = true;
    status.textContent = 'Working locally…';
    try {
      await work(Object.fromEntries(new FormData(form)));
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }
  async function showAsset(asset) {
    const image = document.createElement('img');
    image.src = asset.url;
    image.alt = asset.kind ? `${asset.kind} material albedo` : 'Rendered SVG graphic';
    result.replaceChildren(image, link('Open PNG', asset.url));
    if (asset.source) result.append(link('Editable SVG', asset.source));
    if (asset.maps)
      for (const [name, url] of Object.entries(asset.maps)) result.append(link(`${name} map`, url));
    status.textContent = 'Saved. Checking the artifact in Chrome…';
    const check = await tool('verify_workspace_artifact', { filename: asset.filename });
    result.append(link('Chrome screenshot', check.screenshot), link('Render report', check.report));
    await refresh();
    status.textContent = check.passed
      ? `Saved ${asset.verified.width} × ${asset.verified.height} PNG. Chrome loaded it without observed errors. Review the image for visual quality.`
      : `Saved; render check failed: ${check.errors.join('; ')}`;
  }
  dialog.querySelector('#studioClose').onclick = () => dialog.close();
  const projectForm = dialog.querySelector('#studioProjectForm');
  projectForm.onsubmit = (event) => {
    event.preventDefault();
    run(projectForm, async (args) => {
      select(await tool('create_workspace_project', args));
      await refresh();
      status.textContent =
        'Project created on disk. Source, asset, render, and report folders are ready.';
    });
  };
  for (const [id, name] of [
    ['studioTextureForm', 'generate_texture'],
    ['studioGraphicForm', 'render_graphic'],
  ]) {
    const form = dialog.querySelector('#' + id);
    form.onsubmit = (event) => {
      event.preventDefault();
      run(form, async (args) => {
        if (!selected) throw new Error('Choose or create a project first.');
        const stem = name === 'generate_texture' ? args.kind : 'graphic';
        args.filename = `${selected.directory}/assets/${stem}-${Date.now()}.png`;
        await showAsset(await tool(name, args));
      });
    };
  }
  window.openCreationStudio = async () => {
    if (!dialog.open) dialog.showModal();
    try {
      await refresh();
    } catch (error) {
      status.textContent = error.message;
    }
  };
})();
