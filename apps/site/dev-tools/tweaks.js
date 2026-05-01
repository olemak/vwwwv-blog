/* Tweaks panel — vanilla JS edition.
   Dev-only design tool. The production site doesn't load this file. */
(function () {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "posterRed": "#C8102E",
    "paperCream": "#EDE3CE",
    "ink": "#141210",
    "displayFont": "Oswald",
    "density": "newspaper",
    "noir": false,
    "grain": true,
    "rules": "double"
  }/*EDITMODE-END*/;

  const FONT_STACKS = {
    "Oswald":          `"Oswald", "Impact", "Haettenschweiler", "Arial Narrow Bold", system-ui, sans-serif`,
    "Impact":          `"Impact", "Haettenschweiler", "Arial Narrow Bold", system-ui, sans-serif`,
    "Helvetica Black": `"Helvetica Neue", "Helvetica", "Arial Black", "Arial", sans-serif`,
    "System UI":       `system-ui, -apple-system, sans-serif`,
  };

  let state = { ...TWEAK_DEFAULTS };
  let visible = false;

  // ─── Apply state to the page ────────────────────────────
  function apply() {
    const r = document.documentElement;
    r.style.setProperty("--poster-red", state.posterRed);
    r.style.setProperty("--paper-cream", state.paperCream);
    r.style.setProperty("--ink", state.ink);
    r.style.setProperty("--font-display", FONT_STACKS[state.displayFont] || FONT_STACKS["Oswald"]);

    const gut = state.density === "tight" ? "16px"
              : state.density === "loose" ? "32px" : "24px";
    r.style.setProperty("--gut", gut);

    document.body.classList.toggle("theme-noir", !!state.noir);

    let g = document.getElementById("__grain_override");
    if (!g) { g = document.createElement("style"); g.id = "__grain_override"; document.head.appendChild(g); }
    g.textContent = `body::before { opacity: ${state.grain ? '.55' : '0'} !important; }`;

    let r2 = document.getElementById("__rule_override");
    if (!r2) { r2 = document.createElement("style"); r2.id="__rule_override"; document.head.appendChild(r2); }
    r2.textContent = state.rules === "single"
      ? `.rule-double::after { display:none; } .rule-double { border-top-width: 2px !important; }`
      : ``;
  }

  function set(key, value) {
    state[key] = value;
    apply();
    // Persist to disk (host rewrites the EDITMODE block).
    try {
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [key]: value } }, "*");
    } catch (e) {}
    syncControls();
  }

  // ─── Build the panel ────────────────────────────────────
  const panel = document.createElement("div");
  panel.id = "tweaks";
  panel.innerHTML = `
    <style>
      #tweaks {
        position: fixed; right: 18px; bottom: 18px; z-index: 9999;
        width: 280px; background: #EDE3CE; color: #141210;
        border: 3px solid #141210;
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 12px;
        display: none;
      }
      #tweaks.is-open { display: block; }
      #tweaks header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 8px 10px; background: #141210; color: #EDE3CE;
        font-weight: 700; text-transform: uppercase; letter-spacing: .12em;
      }
      #tweaks header button {
        background: transparent; color: #EDE3CE; border: 0;
        font-family: inherit; font-size: 14px; line-height: 1; cursor: pointer;
        padding: 0 4px;
      }
      #tweaks .body { padding: 10px 12px 14px; max-height: 70vh; overflow: auto; }
      #tweaks h4 {
        margin: 12px 0 6px; font-family: inherit; font-size: 11px;
        text-transform: uppercase; letter-spacing: .14em; color: #C8102E;
        border-bottom: 1px solid #141210; padding-bottom: 4px;
      }
      #tweaks h4:first-child { margin-top: 0; }
      #tweaks .row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 5px 0; }
      #tweaks label { flex: 1; }
      #tweaks input[type="color"] {
        width: 38px; height: 22px; padding: 0; border: 1px solid #141210; background: transparent; cursor: pointer;
      }
      #tweaks select, #tweaks .seg {
        font-family: inherit; font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
        background: #EDE3CE; border: 1px solid #141210; padding: 3px 6px;
      }
      #tweaks .seg { display: inline-flex; padding: 0; border: 1px solid #141210; }
      #tweaks .seg button {
        font-family: inherit; font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
        padding: 4px 8px; background: transparent; color: #141210; border: 0; border-right: 1px solid #141210; cursor: pointer;
      }
      #tweaks .seg button:last-child { border-right: 0; }
      #tweaks .seg button.is-on { background: #C8102E; color: #EDE3CE; }
      #tweaks .toggle {
        width: 30px; height: 16px; background: #EDE3CE; border: 1px solid #141210;
        position: relative; cursor: pointer; padding: 0;
      }
      #tweaks .toggle::after {
        content: ""; position: absolute; top: 1px; left: 1px;
        width: 12px; height: 12px; background: #141210; transition: transform .15s;
      }
      #tweaks .toggle.is-on { background: #C8102E; }
      #tweaks .toggle.is-on::after { transform: translateX(14px); background: #EDE3CE; }
    </style>
    <header>
      <span>Tweaks</span>
      <button data-act="close" aria-label="Close">×</button>
    </header>
    <div class="body">
      <h4>Palette</h4>
      <div class="row"><label>Poster red</label><input type="color" data-key="posterRed"></div>
      <div class="row"><label>Paper cream</label><input type="color" data-key="paperCream"></div>
      <div class="row"><label>Ink</label><input type="color" data-key="ink"></div>
      <div class="row"><label>Noir mode</label><button class="toggle" data-toggle="noir"></button></div>
      <div class="row"><label>Paper grain</label><button class="toggle" data-toggle="grain"></button></div>

      <h4>Type</h4>
      <div class="row">
        <label>Display face</label>
        <select data-key="displayFont">
          ${Object.keys(FONT_STACKS).map(k => `<option value="${k}">${k}</option>`).join("")}
        </select>
      </div>

      <h4>Layout</h4>
      <div class="row">
        <label>Density</label>
        <span class="seg" data-seg="density">
          <button data-val="tight">Tight</button>
          <button data-val="newspaper">News</button>
          <button data-val="loose">Loose</button>
        </span>
      </div>
      <div class="row">
        <label>Rules</label>
        <span class="seg" data-seg="rules">
          <button data-val="single">Single</button>
          <button data-val="double">Double</button>
        </span>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // ─── Sync controls to current state ─────────────────────
  function syncControls() {
    panel.querySelectorAll("input[type=color]").forEach(el => {
      el.value = state[el.dataset.key];
    });
    panel.querySelectorAll("select").forEach(el => {
      el.value = state[el.dataset.key];
    });
    panel.querySelectorAll("[data-toggle]").forEach(el => {
      el.classList.toggle("is-on", !!state[el.dataset.toggle]);
    });
    panel.querySelectorAll("[data-seg]").forEach(seg => {
      const k = seg.dataset.seg;
      seg.querySelectorAll("button").forEach(b => {
        b.classList.toggle("is-on", b.dataset.val === state[k]);
      });
    });
  }

  // ─── Wire events ─────────────────────────────────────────
  panel.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("input[type=color]")) set(t.dataset.key, t.value);
    if (t.matches("select")) set(t.dataset.key, t.value);
  });
  panel.addEventListener("click", (e) => {
    const t = e.target;
    if (t.matches("[data-act='close']")) { hide(); return; }
    if (t.matches(".toggle")) { set(t.dataset.toggle, !state[t.dataset.toggle]); return; }
    if (t.matches(".seg button")) { set(t.parentElement.dataset.seg, t.dataset.val); return; }
  });

  // ─── Host protocol ───────────────────────────────────────
  function show() { visible = true; panel.classList.add("is-open"); }
  function hide() {
    visible = false;
    panel.classList.remove("is-open");
    try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch (e) {}
  }
  window.addEventListener("message", (e) => {
    const d = e.data || {};
    if (d.type === "__activate_edit_mode") show();
    if (d.type === "__deactivate_edit_mode") hide();
  });
  try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch (e) {}

  // ─── Boot ────────────────────────────────────────────────
  apply();
  syncControls();
})();
