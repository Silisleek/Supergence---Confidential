(() => {
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderModernLoader(text = 'Thinking...', options = {}) {
    const size = options.size || '';
    const align = options.align || 'left';
    const extraClass = options.className || '';
    const wrapperClass = ['loader-wrapper', size ? `loader-${size}` : '', align ? `loader-${align}` : '', extraClass]
      .filter(Boolean)
      .join(' ');

    const letters = Array.from(String(text));
    const lettersHtml = letters
      .map((char, idx) => {
        if (char === ' ') {
          return '<span class="loader-letter loader-letter-space" style="animation:none; width:0.35em;" aria-hidden="true">&nbsp;</span>';
        }
        return `<span class="loader-letter" style="animation-delay:${(idx * 0.08).toFixed(2)}s">${escapeHtml(char)}</span>`;
      })
      .join('');

    return `<div class="${wrapperClass}" role="status" aria-label="${escapeHtml(text)}"><div class="loader" aria-hidden="true"></div><div class="letter-wrapper" aria-hidden="true">${lettersHtml}</div></div>`;
  }

  function createModernLoader(text = 'Thinking...', options = {}) {
    const temp = document.createElement('div');
    temp.innerHTML = renderModernLoader(text, options);
    return temp.firstElementChild;
  }

  window.renderModernLoader = renderModernLoader;
  window.createModernLoader = createModernLoader;
})();
