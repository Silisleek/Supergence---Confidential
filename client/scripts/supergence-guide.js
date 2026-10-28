import { createIcon, hydrateIcons } from './supergence-icons.js';
import { mountMotionSurface, decorateMotion, revealOnScroll } from './supergence-motion.js';

hydrateIcons();
mountMotionSurface(document.querySelector('.guide-hero'), { count: 68 });
revealOnScroll(document.querySelectorAll('.guide-section:not(.guide-hero)'));
decorateMotion(
  document.querySelectorAll('.guide-example, .guide-brief-grid article, .guide-refinement'),
);
const navIcons = ['compass', 'chat', 'layers', 'grid', 'spark', 'check'];
document
  .querySelectorAll('#guideNav a')
  .forEach((link, index) => link.prepend(createIcon(navIcons[index], 16)));

const templates = [
  {
    category: 'everyday',
    label: 'Learning something new',
    title: 'Work through an unfamiliar task',
    text: 'Learn how to do [unfamiliar task] to achieve [goal]. Find reliable instructions and inspect the available tools. Try a small example, check it against [success criteria], and use the feedback to improve your approach. Apply what works to my task and retain useful notes with their sources for future work. Deliver the result and identify anything you could not verify.',
  },
  {
    category: 'everyday',
    label: 'Everyday',
    title: 'Make a plan you can use',
    text: 'Help me plan [goal] for [people or audience]. My available time is [time] and my budget is [budget]. Work around [constraints]. Give me a practical sequence, a short checklist, and the decisions I need to make. State any assumptions instead of filling gaps with invented facts.',
  },
  {
    category: 'research',
    label: 'Research',
    title: 'Research a question with sources',
    text: 'Research [question] to help me decide [decision]. Use current primary sources where available and link the pages supporting each important claim. Compare [options or viewpoints] using [criteria]. Separate established facts, your interpretation, and what remains uncertain. End with a concise recommendation tied to my priorities.',
  },
  {
    category: 'code',
    label: 'Code',
    title: 'Fix the cause of a bug',
    text: 'In [project or file], doing [reproduction steps] produces [actual behavior or exact error]. I expect [expected behavior]. Inspect the relevant existing code, fix the cause, and preserve [working behavior]. Run the relevant checks and tell me what passed, what changed, and anything you could not verify. Give me the updated files.',
  },
  {
    category: 'code',
    label: 'Code',
    title: 'Build a working first version',
    text: 'Build [application] for [users] in [workspace or project]. The essential flows are [flows]. Reuse the existing stack and working components. Include [requirements], and preserve [constraints]. Finish a usable first version, test its critical flows in a real browser, and provide source files, a preview, run instructions, and any remaining limits.',
  },
  {
    category: 'design',
    label: 'Design & 3D',
    title: 'Design in a consistent visual language',
    text: 'Design and build [page or interface] for [audience]. Use the visual direction in [your style reference or example]. Keep [existing elements] and prioritize [user action]. Include [sections or controls]. Make it usable at mobile and desktop widths, check keyboard focus and links, then show the actual rendered result and provide the files.',
  },
  {
    category: 'design',
    label: 'Design & 3D',
    title: 'Build a detailed 3D scene',
    text: 'Build an explorable 3D [scene] in its own workspace project. Match [specific visual references] with [architecture, scale, materials, lighting, and close details]. Required interactions: [controls and actions]. Include [interiors or props]. Set a performance target for [device]. Use workspace files and terminal tools to build it, inspect wide and close views, test collisions and interactions, and repair observed problems. Deliver runnable source, assets, screenshots, and a textured GLB if supported. Distinguish verified results from untested targets.',
  },
  {
    category: 'writing',
    label: 'Writing',
    title: 'Write for a particular reader',
    text: 'Write [document] for [audience] so they can [purpose]. Use [notes or source files]. The tone should be [tone], the length [length], and the format [format]. Include [must-have points] and avoid [things to avoid]. Preserve the meaning of supplied facts, flag missing information, and give me a polished draft with a short explanation of important choices.',
  },
  {
    category: 'data',
    label: 'Data',
    title: 'Analyze the actual numbers',
    text: 'Analyze [dataset or file] to answer [business or research question]. First inspect its columns, units, missing values, and date coverage. Use [metrics or comparison groups]. Show the calculations behind the key findings and create [table, chart, or report]. Do not invent missing data. Separate observations from possible explanations and include the output files and a concise conclusion.',
  },
];

const allowedThemes = ['neutral', 'warm', 'midnight'];
function readTheme() {
  try {
    const value = localStorage.getItem('sis-ui-theme');
    return allowedThemes.includes(value) ? value : 'neutral';
  } catch {
    return 'neutral';
  }
}
function applyTheme(value) {
  document.body.dataset.theme = allowedThemes.includes(value) ? value : 'neutral';
}
applyTheme(readTheme());
window.addEventListener('storage', (event) => {
  if (event.key === 'sis-ui-theme') applyTheme(event.newValue);
});

let toastTimer;
async function copyText(text) {
  const status = document.getElementById('copyStatus');
  clearTimeout(toastTimer);
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = 'Prompt copied. Paste it into Supergence and make it your own.';
  } catch {
    status.textContent =
      'Clipboard access is unavailable. Select the prompt text and copy it manually.';
  }
  toastTimer = setTimeout(() => {
    status.textContent = '';
  }, 5000);
}

const cards = document.getElementById('promptCards');
const search = document.getElementById('promptSearch');
const filters = [...document.querySelectorAll('[data-category]')];
let category = 'all';
function renderPrompts() {
  const term = search.value.trim().toLocaleLowerCase();
  const visible = templates.filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      `${item.title} ${item.text} ${item.label}`.toLocaleLowerCase().includes(term),
  );
  cards.replaceChildren();
  for (const item of visible) {
    const card = document.createElement('article');
    card.className = 'guide-prompt-card';
    const label = document.createElement('span');
    label.className = 'guide-eyebrow';
    label.textContent = item.label;
    const heading = document.createElement('h3');
    heading.textContent = item.title;
    const text = document.createElement('p');
    text.className = 'guide-prompt-text';
    text.textContent = item.text;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy prompt';
    copy.append(createIcon('copy', 15));
    copy.setAttribute('aria-label', `Copy prompt: ${item.title}`);
    copy.addEventListener('click', () => copyText(item.text));
    card.append(label, heading, text, copy);
    cards.append(card);
  }
  decorateMotion(cards.querySelectorAll('.guide-prompt-card'));
  document.getElementById('promptCount').textContent =
    `${visible.length} ${visible.length === 1 ? 'prompt' : 'prompts'} to start from`;
  document.getElementById('promptEmpty').hidden = visible.length !== 0;
}
for (const filter of filters) {
  filter.addEventListener('click', () => {
    category = filter.dataset.category;
    for (const button of filters) {
      button.setAttribute('aria-pressed', String(button === filter));
    }
    renderPrompts();
  });
}
search.addEventListener('input', renderPrompts);
renderPrompts();

const briefForm = document.getElementById('briefForm');
const output = document.getElementById('briefOutput');
briefForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const goal = briefForm.elements.goal.value.trim();
  if (!goal) {
    briefForm.elements.goal.setCustomValidity('Describe what you want to get done.');
    briefForm.elements.goal.reportValidity();
    return;
  }
  const parts = [`Goal\n${goal}`];
  for (const [name, title] of [
    ['context', 'Context and source material'],
    ['constraints', 'Requirements and boundaries'],
    ['done', 'Deliverables and acceptance checks'],
  ]) {
    const value = briefForm.elements[name].value.trim();
    if (value) parts.push(`${title}\n${value}`);
  }
  parts.push(
    'If essential information is missing, ask a focused question. Otherwise proceed with reasonable assumptions and state them. Use the relevant available tools, check the important results, and clearly identify anything you could not verify.',
  );
  output.value = parts.join('\n\n');
  document.getElementById('briefPlaceholder').hidden = true;
  document.getElementById('briefResult').hidden = false;
  output.focus({ preventScroll: true });
});
briefForm.elements.goal.addEventListener('input', () => {
  briefForm.elements.goal.setCustomValidity('');
});
document.getElementById('copyBrief').addEventListener('click', () => copyText(output.value));

const navLinks = [...document.querySelectorAll('#guideNav a')];
function updateNavigation() {
  let current = navLinks[0];
  for (const link of navLinks) {
    const section = document.querySelector(link.getAttribute('href'));
    if (section.getBoundingClientRect().top <= 190) current = link;
  }
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
    current = navLinks.at(-1);
  }
  for (const link of navLinks) {
    if (link === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
let scrollPending = false;
window.addEventListener(
  'scroll',
  () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(() => {
      updateNavigation();
      scrollPending = false;
    });
  },
  { passive: true },
);
updateNavigation();
