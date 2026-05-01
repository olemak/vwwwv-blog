// vwwwv — same-document expand choreography for the feed.
// The Worker server-renders the post HTML; this file only handles the
// <details> toggle, View Transitions API integration, and one-open-at-a-time
// behavior. Lazily applies view-transition-name to the toggling post so the
// browser doesn't try to animate every named element on the page.

(function () {
  const feedEl = document.getElementById('feed');
  if (!feedEl) return;

  const supportsVT = typeof document.startViewTransition === 'function';

  function setNamesFor(detailsEl, on) {
    const fig = detailsEl.querySelector('.figure');
    const title = detailsEl.querySelector('.post__title');
    if (fig) {
      const n = fig.dataset.vtMedia;
      fig.style.viewTransitionName = on && n ? n : 'none';
    }
    if (title) {
      const n = title.dataset.vtTitle;
      title.style.viewTransitionName = on && n ? n : 'none';
    }
  }

  function toggleWithVT(detailsEl, willOpen) {
    if (!supportsVT) {
      detailsEl.open = willOpen;
      return;
    }
    setNamesFor(detailsEl, true);
    const t = document.startViewTransition(() => {
      detailsEl.open = willOpen;
    });
    t.finished.finally(() => setNamesFor(detailsEl, false));
  }

  feedEl.addEventListener('click', (e) => {
    const summary = e.target.closest('summary.post__summary');
    if (!summary) return;
    const det = summary.parentElement;
    if (!det || det.tagName !== 'DETAILS') return;
    e.preventDefault();
    const willOpen = !det.open;

    // Newspaper feel: collapse other open posts when opening a new one.
    // Comment out to allow multiple at once.
    if (willOpen) {
      feedEl.querySelectorAll('details.post[open]').forEach((other) => {
        if (other !== det) other.open = false;
      });
    }

    toggleWithVT(det, willOpen);

    // Sync URL hash without scrolling.
    if (willOpen) {
      history.replaceState(null, '', '#' + det.id);
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
  });

  // Open a post if the URL has a matching hash on load.
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target && target.tagName === 'DETAILS') {
      target.open = true;
      target.scrollIntoView({ block: 'start' });
    }
  }
})();
