(function () {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shell-rail-button';
  button.title = 'Large files';
  button.setAttribute('aria-label', 'Large files');
  button.innerHTML = '<span aria-hidden="true" style="font-size:20px">▤</span><span class="shell-tooltip">Large files</span>';
  document.querySelector('.shell-rail-main')?.append(button);
  const dialog = document.createElement('dialog');
  dialog.className = 'storage-dialog';
  dialog.innerHTML = '<div class="storage-heading"><div><small>STORAGE / LARGE FILES</small><h1>Make space, thoughtfully.</h1><p>Files from your scan dated December 10, 2025 or later. Verify each file before removing it.</p></div><button class="storage-close" aria-label="Close">×</button></div><div class="storage-toolbar"><input aria-label="Search files" placeholder="Search file paths"><span class="storage-count">Loading…</span><button class="storage-delete" disabled>Move selected to Recycle Bin</button></div><div class="storage-note">Only files in Desktop, Documents, Downloads, Pictures and Videos can be selected. Sizes and dates reflect the scan; changed files are skipped.</div><div class="storage-status" role="status"></div><div class="storage-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Select visible files"></th><th>File and location</th><th>Size</th><th>Created</th></tr></thead><tbody></tbody></table></div>';
  document.body.append(dialog);
  const tbody = dialog.querySelector('tbody');
  const search = dialog.querySelector('input[placeholder]');
  const all = dialog.querySelector('thead input');
  const del = dialog.querySelector('.storage-delete');
  const count = dialog.querySelector('.storage-count');
  const status = dialog.querySelector('.storage-status');
  let files = [], selected = new Set();
  const size = (bytes) => `${(bytes / 1073741824).toFixed(2)} GB`;
  function render() {
    const visible = files.filter((file) => file.path.toLowerCase().includes(search.value.toLowerCase()));
    tbody.replaceChildren();
    for (const file of visible) {
      const tr = document.createElement('tr');
      const check = document.createElement('input'); check.type = 'checkbox'; check.disabled = !file.eligible; check.checked = selected.has(file.id); check.setAttribute('aria-label', `Select ${file.path}`);
      check.onchange = () => { if (check.checked) selected.add(file.id); else selected.delete(file.id); render(); };
      const a = document.createElement('td'); a.append(check); tr.append(a);
      const b = document.createElement('td'); const name = document.createElement('strong'); name.textContent = file.path.split(/[\\/]/).pop(); const sizeLabel = document.createElement('span'); sizeLabel.className = 'storage-file-size'; sizeLabel.textContent = size(file.size); const path = document.createElement('div'); path.className = 'storage-path'; path.textContent = file.path; b.append(name, sizeLabel, path); if (!file.eligible) { const badge = document.createElement('small'); badge.textContent = 'Protected location'; b.append(badge); } tr.append(b);
      const c = document.createElement('td'); c.textContent = size(file.size); tr.append(c);
      const d = document.createElement('td'); d.textContent = file.created.slice(0, 10); tr.append(d); tbody.append(tr);
    }
    const choices = visible.filter((file) => file.eligible);
    all.checked = choices.length > 0 && choices.every((file) => selected.has(file.id));
    count.textContent = `${visible.length} files shown · ${selected.size} selected`;
    del.disabled = !selected.size; del.textContent = selected.size ? `Move ${selected.size} selected to Recycle Bin` : 'Move selected to Recycle Bin';
  }
  button.onclick = async () => {
    dialog.showModal(); status.textContent = 'Loading scan…';
    try { const response = await fetch('/api/storage/large-files', { headers: { 'X-Storage-Dashboard': '1' } }); const data = await response.json(); if (!response.ok) throw new Error(data.error); files = data.files; selected.clear(); status.textContent = ''; render(); }
    catch (error) { status.textContent = error.message; }
  };
  dialog.querySelector('.storage-close').onclick = () => dialog.close();
  search.oninput = render;
  all.onchange = () => { for (const file of files.filter((item) => item.eligible && item.path.toLowerCase().includes(search.value.toLowerCase()))) { if (all.checked) selected.add(file.id); else selected.delete(file.id); } render(); };
  del.onclick = async () => {
    if (selected.size > 50) { status.textContent = 'Select up to 50 files at a time.'; return; }
    const chosen = files.filter((file) => selected.has(file.id));
    if (!window.confirm(`Move these ${chosen.length} files (${size(chosen.reduce((sum, file) => sum + file.size, 0))}) to the Recycle Bin?\n\n${chosen.map((file) => file.path).join('\n')}`)) return;
    del.disabled = true; status.textContent = 'Moving files…';
    try {
      const response = await fetch('/api/storage/recycle', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Storage-Dashboard': '1' }, body: JSON.stringify({ ids: [...selected] }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      const success = new Set(data.results.filter((result) => result.ok).map((result) => result.id));
      files = files.filter((file) => !success.has(file.id)); selected = new Set(data.results.filter((result) => !result.ok).map((result) => result.id));
      status.textContent = `Moved ${success.size} file(s). ${data.results.filter((result) => !result.ok).map((result) => `${files.find((file) => file.id === result.id)?.path}: ${result.error}`).join(' | ')}`;
    } catch (error) { status.textContent = error.message; }
    render();
  };
  if (document.body.hasAttribute('data-storage-standalone')) {
    dialog.addEventListener('cancel', (event) => event.preventDefault());
    button.click();
  }
})();
