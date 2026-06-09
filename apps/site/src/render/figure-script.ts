// Inline runtime for the halftone-image-gating system.
//
// Triggered figures (those whose data-triggers attribute is non-empty)
// render with data-src/data-srcset and an opacity-0 <img>. The actual
// bytes don't fetch until either:
//
//   1. The user ticks the figure's per-image checkbox (one figure, this
//      session only — no persistence).
//   2. The user has all of the figure's triggers set in their consent
//      preferences (localStorage), in which case this script applies
//      the load on page render automatically. AND-semantics: every
//      trigger on the figure must be in the consent prefs for auto-load.
//
// Untriggered figures get real src server-side and never come through
// here — they fade from halftone to colour as soon as the bytes arrive,
// which is the natural loading state.
//
// Kept tiny on purpose. Ships inline in every <head>.

import { CONSENT_STORAGE_KEY } from './content-categories';

export const figureScript = /* js */`
(() => {
  const STORAGE_KEY = ${JSON.stringify(CONSENT_STORAGE_KEY)};

  function loadFigure(figure) {
    const img = figure.querySelector('img.figure__media');
    if (!img) return;
    // Re-show: drop the hidden class. CSS opacity transition runs to 1.
    img.classList.remove('figure__media--hidden');
    // First-ever load: promote data-src/data-srcset to src/srcset.
    // Subsequent calls are no-ops because the attributes are already there.
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
    // means the next opt-in is an instant fade with no refetch. Just
    // toggle visibility via the hidden class so the opacity transition
    // runs the other way and the halftone re-emerges from underneath.
    img.classList.add('figure__media--hidden');
  }

  function readConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function figureTriggers(figure) {
    const raw = figure.getAttribute('data-triggers') || '';
    return raw.split(',').map((t) => t.trim()).filter(Boolean);
  }

  /** AND-semantics: figure is consented-to only if every trigger it
   *  carries is set true in the consent prefs. One missing → halftone. */
  function isConsented(figure, prefs) {
    const triggers = figureTriggers(figure);
    if (triggers.length === 0) return true;
    return triggers.every((t) => prefs[t] === true);
  }

  // On page load, walk every gated figure and apply persisted category
  // consent. Figures whose triggers are all opted-in get loaded with
  // their checkboxes pre-ticked; the rest stay halftone.
  const prefs = readConsent();
  document.querySelectorAll('.figure[data-triggers]').forEach((figure) => {
    const checkbox = figure.querySelector('.figure-trigger-toggle__input');
    if (isConsented(figure, prefs)) {
      if (checkbox) checkbox.checked = true;
      loadFigure(figure);
    }
  });

  // Per-image checkbox: session-scoped opt-in. Toggling on loads, off
  // unloads. State is not persisted — the consent panel is the persistent
  // surface (one image opt-in is for this image, this session, only).
  // Each toggle nudges the consent tab as a teaching cue: "you've done
  // this once, you can make it a default down here."
  function nudgeConsentTab() {
    const tab = document.querySelector('.consent-tab');
    if (!tab) return;
    tab.classList.remove('is-nudging');
    // Force a reflow so re-adding the class restarts the animation
    // even when fired in quick succession.
    void tab.offsetWidth;
    tab.classList.add('is-nudging');
  }

  document.querySelectorAll('.figure-trigger-toggle__input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const figure = e.target.closest('.figure');
      if (!figure) return;
      if (e.target.checked) loadFigure(figure);
      else                  unloadFigure(figure);
      nudgeConsentTab();
    });
  });

  // Consent panel: persistent category-level preferences. Every change
  // writes the full prefs object to localStorage and re-applies the
  // AND-semantics across every gated figure on the page. Pre-checks the
  // panel's own boxes from persisted state so the user sees their
  // current configuration on every visit.
  const consentInputs = document.querySelectorAll('.consent-panel__input');

  function applyConsentState() {
    const current = readConsent();
    const hasAnyActive = Object.values(current).some(Boolean);
    document.documentElement.dataset.consentActive = hasAnyActive ? 'true' : 'false';

    document.querySelectorAll('.figure[data-triggers]').forEach((figure) => {
      const overlay = figure.querySelector('.figure-trigger-toggle__input');
      const consented = isConsented(figure, current);
      if (consented) {
        if (overlay) overlay.checked = true;
        loadFigure(figure);
      } else {
        if (overlay) overlay.checked = false;
        unloadFigure(figure);
      }
    });
  }

  // Pre-check the panel's own checkboxes from persisted state.
  consentInputs.forEach((input) => {
    const cat = input.getAttribute('data-consent-category');
    if (cat && prefs[cat] === true) input.checked = true;
  });
  // Reflect initial active state on the tab.
  const anyInitial = Object.values(prefs).some(Boolean);
  document.documentElement.dataset.consentActive = anyInitial ? 'true' : 'false';

  // Wire checkbox changes: write prefs, re-apply.
  consentInputs.forEach((input) => {
    input.addEventListener('change', (e) => {
      const cat = e.target.getAttribute('data-consent-category');
      if (!cat) return;
      const current = readConsent();
      current[cat] = e.target.checked;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch (_) {}
      applyConsentState();
    });
  });
})();
`;
