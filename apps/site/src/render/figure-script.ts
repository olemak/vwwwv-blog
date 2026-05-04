// Inline runtime for the halftone-image-gating system.
//
// The site renders featured images in a deliberately under-fetched state:
// a pixelated grayscale plate proof in the figure's ::before background,
// with the real <img> kept opacity:0 and stripped of its src/srcset (only
// data-src / data-srcset are emitted in the HTML). This script promotes
// data-src → src in two situations:
//
//   1. The user opens a <details class="post"> — load that post's image.
//   2. The user trips the global #slop-toggle checkbox — load (or unload)
//      every figure on the page, and persist the choice in localStorage.
//
// Posts that the server already renders [open] (i.e. /post/<slug>) get a
// real src up front and don't need this script — the script's loadFigure
// is idempotent and skips them.
//
// Kept tiny on purpose: ships inline in every <head>, so every byte
// counts against the 14 KB-bundled-and-bragged-about budget.

export const figureScript = /* js */`
(() => {
  const STORAGE_KEY = 'vwwwv:slop';

  function loadFigure(figure) {
    const img = figure.querySelector('img.figure__media');
    if (!img) return;
    // Re-show: drop the hidden class. CSS opacity transition runs back to 1.
    img.classList.remove('figure__media--hidden');
    // First-ever load: promote data-src/data-srcset to src/srcset.
    // No-op on subsequent calls because the attributes are already there.
    if (!img.getAttribute('src')) {
      const ds = img.getAttribute('data-srcset');
      const d  = img.getAttribute('data-src');
      if (ds) img.setAttribute('srcset', ds);
      if (d)  img.setAttribute('src', d);
    }
  }

  function unloadFigure(figure) {
    const img = figure.querySelector('img.figure__media');
    if (!img) return;
    // Keep src/srcset — bytes already paid for, leaving them in memory
    // means the next "show slop" flip is an instant fade with no refetch
    // and no flicker. Just toggle visibility via the hidden class so the
    // opacity transition runs the other way and the halftone re-emerges
    // from underneath.
    img.classList.add('figure__media--hidden');
  }

  // Per-post: when a <details> opens, load its figure. We don't unload
  // on close — once the user has asked for the bytes, keep them; only
  // the global toggle reverts to halftone.
  document.querySelectorAll('details.post').forEach((post) => {
    post.addEventListener('toggle', () => {
      if (!post.open) return;
      const fig = post.querySelector('.figure');
      if (fig) loadFigure(fig);
    });
  });

  // Global "Drop the plate" toggle — the printing-press metaphor for
  // committing ink to paper. Checkbox in the masthead.
  const toggle = document.getElementById('slop-toggle');
  const allFigures = () => document.querySelectorAll('.figure');

  function applyState(on) {
    if (on) allFigures().forEach(loadFigure);
    else    allFigures().forEach(unloadFigure);
    if (toggle) toggle.checked = on;
    document.documentElement.dataset.slop = on ? 'on' : 'off';
  }

  // Restore prior choice on load.
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'on') applyState(true);
  } catch (_) { /* localStorage may be blocked — proceed without persistence */ }

  if (toggle) {
    toggle.addEventListener('change', (e) => {
      const on = e.target.checked;
      try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch (_) {}
      applyState(on);
    });
  }
})();
`;
