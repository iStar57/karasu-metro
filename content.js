// Activa el tema añadiendo la clase "kft" al <html>. Todo el CSS de theme.css
// está acotado a html.kft, así que quitar la clase apaga el tema al instante.
(() => {
  const root = document.documentElement;
  const DEFAULTS = { enabled: true, accent: "#38e1ff", uppercase: true, fx: true };
  let settings = { ...DEFAULTS };

  function savePageLanguage() {
    const lang = document.documentElement?.lang?.trim();
    if (lang) chrome.storage.local.set({ siteLanguage: lang });
  }
  savePageLanguage();
  new MutationObserver(savePageLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  // Fuentes empaquetadas (Geist y Michroma, licencia OFL). Se declaran aquí
  // con runtime.getURL porque la URL de la extensión cambia entre navegadores
  // (chrome-extension://<id> en Chrome, moz-extension://<uuid> en Firefox) y
  // el CSS de un content script no puede resolverla en ambos.
  const FONTS = [
    ["Geist", "100 900", "geist-latin.woff2", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
    ["Geist", "100 900", "geist-latin-ext.woff2", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
    ["Geist", "100 900", "geist-cyrillic.woff2", "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116"],
    ["Michroma", "400", "michroma-latin.woff2", ""],
  ];
  const fontStyle = document.createElement("style");
  fontStyle.id = "kft-fonts";
  fontStyle.textContent = FONTS.map(
    ([family, weight, file, range]) =>
      `@font-face{font-family:${family};font-style:normal;font-weight:${weight};font-display:swap;` +
      `src:url("${chrome.runtime.getURL("fonts/" + file)}") format("woff2");${range ? `unicode-range:${range};` : ""}}`
  ).join("\n");
  root.appendChild(fontStyle);

  function hexToHslTriplet(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return null;
    const n = parseInt(m[1], 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  function apply() {
    root.classList.toggle("kft", settings.enabled);
    // Mayúsculas y efectos son parte del tema (ya no son opciones): siempre
    // activos, aunque una versión antigua guardara uppercase/fx = false
    root.classList.toggle("kft-upper", settings.enabled);
    root.classList.toggle("kft-fx", settings.enabled);
    const triplet = hexToHslTriplet(settings.accent);
    if (settings.enabled && triplet) {
      root.style.setProperty("--kft-accent", triplet, "important");
      root.style.setProperty("--kft-accent-hex", settings.accent, "important");
      root.style.setProperty("--kft-on-accent", onAccent(settings.accent), "important");
    } else {
      root.style.removeProperty("--kft-accent");
      root.style.removeProperty("--kft-accent-hex");
      root.style.removeProperty("--kft-on-accent");
    }
  }

  // Texto sobre el acento: blanco mientras se lea (contraste WCAG ≥ 3:1, el
  // mínimo para texto grande/negrita, que es lo que va sobre el acento) y
  // casi negro solo con acentos claros. Naranja → blanco (3.3:1);
  // cian de Karasu → oscuro (el blanco daría 1.6:1), como hace la web.
  function onAccent(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    return 1.05 / (L + 0.05) >= 3 ? "#fff" : "#0b1215";
  }

  // Karasu escribe los títulos de sección como "PARTIDAS.EN.DIRECTO";
  // aquí se muestran como frases normales ("Partidas en directo").
  // Exige al menos una letra: "0.0020" (float de un skin) no es un título.
  const DOTTED = /^(?=.*\p{Lu})[\p{Lu}\d]+(?:\.[\p{Lu}\d]+)+$/u;
  const originals = new WeakMap();

  // "Level 7" -> medidor de nivel (un color por nivel)
  const LEVEL = /^(?:Level|Nivel|Nível|Lvl|Niveau|Stufe|Livello|Nivå|Poziom|Szint|Уровень|Рівень|レベル|等级|레벨)\s*(\d{1,2})$/iu;
  const LEVEL_COLORS = ["#eeeeee", "#1ce400", "#1ce400", "#ffc800", "#ffc800", "#ffc800", "#ffc800", "#ff6309", "#ff6309", "#fe1f00"];

  function levelBadge(node, text) {
    const m = LEVEL.exec(text);
    const el = node.parentElement;
    if (!m || !el || el.childNodes.length !== 1) return false;
    const n = Math.max(1, Math.min(10, +m[1]));
    originals.set(node, node.nodeValue);
    el.dataset.kftLevel = n;
    el.title = el.title || text;
    el.style.setProperty("--kft-lvl", LEVEL_COLORS[n - 1]);
    el.style.setProperty("--kft-lvl-n", n);
    node.nodeValue = String(+m[1]);
    return true;
  }

  function prettify(node) {
    const text = node.nodeValue.trim();
    if (levelBadge(node, text)) return;
    if (text.length < 5 || !DOTTED.test(text)) return;
    const pretty = text.toLowerCase().replace(/\./g, " ");
    originals.set(node, node.nodeValue);
    node.nodeValue = pretty.charAt(0).toUpperCase() + pretty.slice(1);
  }

  function scan(el) {
    if (!settings.enabled || !el) return;
    if (el.nodeType === Node.TEXT_NODE) return prettify(el);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) prettify(n);
  }

  // Avisos de Karasu ("If you like what you see", "Bug Abusing"): botón para
  // cerrarlos. Se recuerdan por su texto, así que un aviso nuevo o editado
  // vuelve a aparecer.
  let dismissed = new Set();
  // Icono × construido con el DOM (sin innerHTML: el validador de
  // addons.mozilla.org lo marca aunque el contenido sea fijo)
  function closeIcon() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    const attrs = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.2", "stroke-linecap": "round", "aria-hidden": "true" };
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", "M6 6l12 12M18 6 6 18");
    svg.appendChild(path);
    return svg;
  }

  function alertKey(alert) {
    const text = alert.textContent.replace(/\s+/g, " ").trim();
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function dismissAlert(row, key) {
    dismissed.add(key);
    chrome.storage.local.set({ dismissedAlerts: [...dismissed] });
    // Se pliega primero (CSS anima grid-template-rows) y luego se oculta
    row.dataset.kftClosing = "";
    setTimeout(() => {
      row.dataset.kftDismissed = "";
      delete row.dataset.kftClosing;
    }, root.classList.contains("kft-fx") ? 320 : 0);
  }

  function decorateAlerts() {
    if (!settings.enabled || !document.body) return;
    for (const alert of document.querySelectorAll('.alert-row [role="alert"]')) {
      const row = alert.closest(".alert-row");
      const key = alert.dataset.kftKey || (alert.dataset.kftKey = alertKey(alert));
      if (dismissed.has(key)) {
        row.dataset.kftDismissed = "";
        continue;
      }
      delete row.dataset.kftDismissed;
      if (alert.querySelector(":scope > .kft-close")) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kft-close";
      btn.title = "×";
      btn.setAttribute("aria-label", "×");
      btn.appendChild(closeIcon());
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        dismissAlert(row, key);
      });
      alert.appendChild(btn);
    }
  }

  // Inventario: filtro por tipo de cuchillo (o de guantes) en el selector.
  // Karasu no lo tiene y su buscador no combina términos ("karambit fade" no
  // da nada), así que se filtran las tarjetas por el nombre interno que lleva
  // su imagen (…/weapon_knife_karambit_am_doppler_1a2b3c4d.webp) y el
  // buscador queda libre para el nombre del skin.
  const ITEM_TYPES = [
    ["weapon_bayonet", "Bayonet", "knife"],
    ["weapon_knife_m9_bayonet", "M9 Bayonet", "knife"],
    ["weapon_knife_css", "Classic", "knife"],
    ["weapon_knife_flip", "Flip", "knife"],
    ["weapon_knife_gut", "Gut", "knife"],
    ["weapon_knife_karambit", "Karambit", "knife"],
    ["weapon_knife_tactical", "Huntsman", "knife"],
    ["weapon_knife_falchion", "Falchion", "knife"],
    ["weapon_knife_survival_bowie", "Bowie", "knife"],
    ["weapon_knife_butterfly", "Butterfly", "knife"],
    ["weapon_knife_push", "Shadow Daggers", "knife"],
    ["weapon_knife_cord", "Paracord", "knife"],
    ["weapon_knife_canis", "Survival", "knife"],
    ["weapon_knife_ursus", "Ursus", "knife"],
    ["weapon_knife_gypsy_jackknife", "Navaja", "knife"],
    ["weapon_knife_outdoor", "Nomad", "knife"],
    ["weapon_knife_stiletto", "Stiletto", "knife"],
    ["weapon_knife_widowmaker", "Talon", "knife"],
    ["weapon_knife_skeleton", "Skeleton", "knife"],
    ["weapon_knife_kukri", "Kukri", "knife"],
    ["sporty_gloves", "Sport", "gloves"],
    ["slick_gloves", "Driver", "gloves"],
    ["leather_handwraps", "Hand Wraps", "gloves"],
    ["motorcycle_gloves", "Moto", "gloves"],
    ["specialist_gloves", "Specialist", "gloves"],
    ["studded_hydra_gloves", "Hydra", "gloves"],
    ["studded_bloodhound_gloves", "Bloodhound", "gloves"],
    ["studded_brokenfang_gloves", "Broken Fang", "gloves"],
  ];
  // El prefijo más largo primero: "weapon_knife_survival_bowie" antes que
  // cualquier otro que pudiera empezar igual
  const TYPE_MATCH = [...ITEM_TYPES].sort((a, b) => b[0].length - a[0].length);
  const TYPE_INFO = Object.fromEntries(ITEM_TYPES.map(([k, label, family]) => [k, { label, family }]));
  const FILTER_ALL = { es: "Todos", fr: "Tout", de: "Alle", pt: "Todos", it: "Tutti", ru: "Все", ja: "すべて", zh: "全部", ko: "전체" };
  function allLabel() {
    const lang = (document.documentElement.lang || "en").toLowerCase().split(/[-_]/)[0];
    return FILTER_ALL[lang] || "All";
  }
  const typeFilter = { family: null, active: "", emptyTimer: 0 };

  function itemType(item) {
    const src = item.querySelector("img")?.getAttribute("src") || "";
    const m = /images\/([a-z0-9_]+?)_[0-9a-f]{8}\.webp/.exec(src);
    if (!m) return "";
    const hit = TYPE_MATCH.find(([k]) => m[1] === k || m[1].startsWith(k + "_"));
    return hit ? hit[0] : "";
  }

  function pickerParts() {
    const sheet = document.querySelector('[style*="--acc:"] section.absolute.bottom-0');
    return {
      grid: sheet?.querySelector('div[style*="grid"]'),
      bar: sheet?.querySelector(".border-b"),
    };
  }

  function removeTypeUi() {
    document.querySelectorAll(".kft-type, .kft-empty").forEach((el) => el.remove());
    document.querySelectorAll("[data-kft-hide]").forEach((el) => el.removeAttribute("data-kft-hide"));
    typeFilter.family = null;
    typeFilter.active = "";
  }

  function setTypeLabel(ui) {
    const label = ui.querySelector(".kft-type-label");
    label.textContent = typeFilter.active ? TYPE_INFO[typeFilter.active].label : allLabel();
    ui.classList.toggle("is-active", !!typeFilter.active);
    ui.querySelectorAll(".kft-type-opt").forEach((o) => o.setAttribute("aria-selected", o.dataset.type === typeFilter.active));
  }

  function toggleTypeMenu(ui, open) {
    const menu = ui.querySelector(".kft-type-menu");
    open = open ?? menu.hidden;
    menu.hidden = !open;
    ui.querySelector(".kft-type-btn").setAttribute("aria-expanded", open);
    if (open) ui.querySelector('.kft-type-opt[aria-selected="true"]')?.focus();
  }

  function buildTypeUi(bar) {
    let ui = bar.querySelector(":scope > .kft-type");
    if (ui && ui.dataset.family === typeFilter.family) return ui;
    ui?.remove();
    ui = document.createElement("div");
    ui.className = "kft-type";
    ui.dataset.family = typeFilter.family;
    const opts = [["", allLabel()]].concat(
      ITEM_TYPES.filter(([, , f]) => f === typeFilter.family)
        .map(([k, label]) => [k, label])
        .sort((a, b) => a[1].localeCompare(b[1]))
    );
    ui.innerHTML = `
      <button type="button" class="kft-type-btn" aria-haspopup="listbox" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4"/></svg>
        <span class="kft-type-label"></span>
        <svg class="kft-type-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="kft-type-menu" role="listbox" hidden></div>`;
    const menu = ui.querySelector(".kft-type-menu");
    for (const [k, label] of opts) {
      const o = document.createElement("button");
      o.type = "button";
      o.className = "kft-type-opt" + (k ? "" : " is-all");
      o.setAttribute("role", "option");
      o.dataset.type = k;
      o.textContent = label;
      menu.appendChild(o);
    }
    ui.querySelector(".kft-type-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTypeMenu(ui);
    });
    menu.addEventListener("click", (e) => {
      const o = e.target.closest(".kft-type-opt");
      if (!o) return;
      e.stopPropagation();
      typeFilter.active = o.dataset.type;
      toggleTypeMenu(ui, false);
      setTypeLabel(ui);
      const { grid } = pickerParts();
      if (grid) grid.scrollTop = 0;
      updateTypeFilter();
    });
    ui.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        toggleTypeMenu(ui, false);
        ui.querySelector(".kft-type-btn").focus();
      }
    });
    bar.appendChild(ui);
    setTypeLabel(ui);
    return ui;
  }

  function updateTypeFilter() {
    if (!settings.enabled) return;
    const { grid, bar } = pickerParts();
    if (!grid || !bar) {
      if (typeFilter.family) removeTypeUi();
      return;
    }
    const items = [...grid.children].filter((el) => !el.matches(".col-span-full, .kft-empty"));
    const types = items.map(itemType);
    const first = types.find(Boolean);
    const family = first ? TYPE_INFO[first].family : null;
    if (!family) {
      // Ranura sin tipos (pistolas, rifles…), o lista vacía por la búsqueda
      if (typeFilter.family && items.length > 1) removeTypeUi();
      return;
    }
    if (family !== typeFilter.family) {
      typeFilter.family = family;
      typeFilter.active = "";
    }
    buildTypeUi(bar);

    let visible = 0;
    items.forEach((it, i) => {
      // Se ocultan también las que tienen imagen pero ningún tipo (guantes por
      // defecto); la tarjeta "+ Craft" no lleva imagen y se queda siempre
      const hide = !!typeFilter.active && types[i] !== typeFilter.active && !!it.querySelector("img");
      it.toggleAttribute("data-kft-hide", hide);
      if (!hide && types[i]) visible++;
    });

    // No hace falta forzar la carga: Karasu carga por scroll y, si lo visible
    // no llena el panel, sigue cargando solo hasta llenarlo.

    // Mensaje si, terminada la carga, no queda ninguno de ese tipo
    const note = grid.querySelector(":scope > .kft-empty");
    if (!typeFilter.active || visible > 0) {
      clearTimeout(typeFilter.emptyTimer);
      note?.remove();
    } else if (!note) {
      clearTimeout(typeFilter.emptyTimer);
      typeFilter.emptyTimer = setTimeout(() => {
        if (grid.querySelector(":scope > .kft-empty")) return;
        const note = document.createElement("div");
        note.className = "kft-empty";
        note.textContent = "0";
        grid.prepend(note);
      }, 1500);
    }
  }

  // Cerrar el desplegable al pulsar fuera
  document.addEventListener("click", (e) => {
    if (e.target.closest?.(".kft-type")) return;
    document.querySelectorAll(".kft-type").forEach((ui) => toggleTypeMenu(ui, false));
  });

  // Rail derecho: reutiliza nombres localizados que Karasu ya haya añadido.
  function labelRail() {
    if (!settings.enabled) return;
    for (const svg of document.querySelectorAll('div.w-14.border-l > button svg[class*="lucide-"]')) {
      const m = /lucide-(bell|tent|users|message-square|mic|clock|chevrons-left|chevrons-right)\b/.exec(svg.getAttribute("class"));
      const btn = svg.closest("button");
      if (!m || !btn) continue;
      // Reuse Karasu's localized accessible name when it provides one.
      // Never replace it with a hard-coded translation from the extension.
      const label = btn.getAttribute("aria-label") || btn.getAttribute("title") ||
        btn.querySelector('[class*="sr-only"]')?.textContent.trim() || "";
      if (label && btn.dataset.kftTip !== label) btn.dataset.kftTip = label;
    }
  }

  // Barra lateral en carpetas. Lo diario (Buscar, Jugar, Estadísticas, Ver)
  // queda siempre visible; el resto va en carpetas tipo acordeón: una abierta
  // a la vez y la de la página actual se abre sola al navegar. Las cabeceras
  // son botones propios añadidos al final del contenedor de Karasu (Vue no
  // los toca); el CSS las coloca con "order".
  const FOLDERS = [
    ["compete", ["/tournaments", "/league", "/scrims", "/public-servers"],
      "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"],
    ["community", ["/teams", "/leaderboard", "/highlights"],
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"],
    ["arsenal", ["/apps/inventory", "/settings/cosmetics", "/utility"],
      "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7 12 12l8.7-5M12 22V12"],
  ];
  let openFolder = null; // null = aún no decidido (se abre la de la página actual)
  let lastPath = "";

  function svgIcon(d, cls) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    const attrs = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" };
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    if (cls) svg.setAttribute("class", cls);
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    return svg;
  }

  function folderItems(content, hrefs) {
    return hrefs
      .map((h) => content.querySelector(`[data-sidebar="menu-item"]:has(> a[href="${h}"])`))
      .filter(Boolean);
  }
  function folderLabel(items) {
    // Sidebar group headings come from the current Karasu locale.
    const labels = items.map((item) => item.closest('[data-sidebar="group"]')
      ?.querySelector('[data-sidebar="group-label"]')?.textContent.trim()).filter(Boolean);
    if (labels.length) return labels.sort((a, b) => labels.filter((v) => v === b).length - labels.filter((v) => v === a).length)[0];
    // Some layouts omit group headings; reuse the localized route names.
    return items.map((item) => item.querySelector('a[data-sidebar="menu-button"]')?.textContent.trim())
      .filter(Boolean).slice(0, 2).join(" · ");
  }

  function updateFolders() {
    if (!settings.enabled) return;
    const content = document.querySelector('.group[data-side="left"] [data-sidebar="content"]');
    if (!content) return;

    // Al cambiar de página, se abre la carpeta que la contiene
    const path = location.pathname;
    let activeFolder = null;
    for (const [id, hrefs] of FOLDERS) {
      if (hrefs.some((h) => path === h || path.startsWith(h + "/"))) activeFolder = id;
    }
    if (path !== lastPath) {
      lastPath = path;
      if (activeFolder) openFolder = activeFolder;
    }

    for (const [id, hrefs, icon] of FOLDERS) {
      const items = folderItems(content, hrefs);
      const label = folderLabel(items);
      let head = content.querySelector(`:scope > .kft-folder[data-folder="${id}"]`);
      if (!head) {
        head = document.createElement("button");
        head.type = "button";
        head.className = "kft-folder";
        head.dataset.folder = id;
        head.appendChild(svgIcon(icon));
        const text = document.createElement("span");
        text.className = "kft-folder-label";
        text.textContent = label;
        const count = document.createElement("span");
        count.className = "kft-folder-count";
        head.append(text, count, svgIcon("m9 18 6-6-6-6", "kft-folder-chev"));
        head.addEventListener("click", () => {
          // Barra plegada: la carpeta se abre desplegando la barra
          const rail = head.closest(".group[data-side=\"left\"]");
          if (rail && rail.dataset.collapsible === "icon") {
            openFolder = id;
            document.querySelector("[data-sidebar=\"trigger\"]")?.click();
          } else openFolder = openFolder === id ? "" : id;
          updateFolders();
        });
        content.appendChild(head);
      }
      const labelEl = head.querySelector(".kft-folder-label");
      if (labelEl && labelEl.textContent !== label) labelEl.textContent = label;
      if (head.title !== label) head.title = label;
      if (head.getAttribute("aria-label") !== label) head.setAttribute("aria-label", label);
      const open = openFolder === id;
      if (head.getAttribute("aria-expanded") !== String(open)) head.setAttribute("aria-expanded", open);
      head.classList.toggle("has-active", activeFolder === id);
      const countEl = head.querySelector(".kft-folder-count");
      if (countEl.textContent !== String(items.length)) countEl.textContent = items.length;
      for (const li of items) {
        if (!li.hasAttribute("data-kft-in-folder")) li.setAttribute("data-kft-in-folder", "");
        if (li.hasAttribute("data-kft-folded") === open) li.toggleAttribute("data-kft-folded", !open);
      }
    }
  }

  // /play: marca las piezas de la página (data-kft-play) para que el CSS
  // pueda reorganizarlas sin depender de clases genéricas de Tailwind.
  // También limpia los nombres de mapa ("de_ancient" → "Ancient") y marca el
  // contador de tiempo cuando está vacío ("--:--", fuera de cola).
  function setPlay(el, name) {
    if (el && el.dataset.kftPlay !== name) el.dataset.kftPlay = name;
  }
  // /play: los baneos recientes como ticker. Se desliza solo hacia la
  // derecha; al llegar al final, fundido y vuelta al principio. Pausa con el
  // ratón encima. Sin animación si todo cabe o con "reducir movimiento".
  const ticker = { el: null, raf: 0, last: 0, pos: 0, wait: 0 };
  function startBansTicker(el) {
    if (!el || ticker.el === el) return;
    ticker.el = el;
    ticker.pos = el.scrollLeft;
    ticker.last = 0;
    el.dataset.kftTicker = "";
    // Rueda del ratón encima de la barra: abajo avanza, arriba retrocede.
    // Mientras el cursor está encima el ticker está en pausa; al salir sigue
    // desde donde la dejó el usuario.
    if (!el.dataset.kftWheel) {
      el.dataset.kftWheel = "";
      el.addEventListener("wheel", (e) => {
        if (!settings.enabled || e.ctrlKey) return;
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 2) return;
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1;
        const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
        if (!d) return;
        e.preventDefault();
        el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + d));
      }, { passive: false });
    }
    cancelAnimationFrame(ticker.raf);
    const SPEED = 30; // px por segundo
    const step = (now) => {
      ticker.raf = requestAnimationFrame(step);
      const cur = ticker.el;
      if (!cur || !cur.isConnected) {
        cancelAnimationFrame(ticker.raf);
        ticker.el = null;
        return;
      }
      const dt = ticker.last ? Math.min(now - ticker.last, 100) / 1000 : 0;
      ticker.last = now;
      const max = cur.scrollWidth - cur.clientWidth;
      if (max <= 2 || document.hidden || reduceMotion.matches || cur.matches(":hover") || !settings.enabled) return;
      if (ticker.wait > 0) {
        ticker.wait -= dt;
        return;
      }
      // Si el usuario ha desplazado la lista (rueda, arrastre), seguir desde ahí
      if (Math.abs(cur.scrollLeft - ticker.pos) > 2) ticker.pos = cur.scrollLeft;
      ticker.pos = Math.min(max, ticker.pos + SPEED * dt);
      cur.scrollLeft = ticker.pos;
      if (ticker.pos >= max) {
        // Final: pausa breve, fundido, vuelta al inicio y fundido de entrada
        ticker.wait = 1.6;
        setTimeout(() => cur.classList.add("kft-ticker-fade"), 1000);
        setTimeout(() => {
          ticker.pos = 0;
          cur.scrollLeft = 0;
          cur.classList.remove("kft-ticker-fade");
        }, 1450);
      }
    };
    ticker.raf = requestAnimationFrame(step);
  }

  function decoratePlay() {
    // Ojo: "/players/…" también empieza por "/play"; solo vale /play exacto
    if (!settings.enabled || !/^\/play\/?$/.test(location.pathname)) {
      // Al salir de /play por navegación interna, quitar las marcas que queden
      document.querySelectorAll("[data-kft-play]").forEach((el) => delete el.dataset.kftPlay);
      return;
    }
    // La página puede estar en español o inglés según el idioma de la cuenta.
    // Ancla el rediseño por la estructura de las tres tarjetas de estadísticas,
    // no por el texto localizado de sus rótulos.
    const stats = [...document.querySelectorAll("main div.grid")].find((grid) => {
      const cards = [...grid.children];
      return cards.length === 3 && cards.every((card) =>
        [...card.children].some((child) => child.matches("div.font-mono")));
    });
    const left = stats?.parentElement;
    const root = left?.parentElement;
    if (!root) return;
    setPlay(root, "root");
    setPlay(left, "left");
    setPlay(stats, "stats");
    for (const c of root.children) if (c !== left) setPlay(c, "right");
    for (const card of left.children) {
      if (card === stats) continue;
      if (card.querySelector('div[style*="grid-template-columns"]')) setPlay(card, "party");
      else if (card.querySelector('[class*="grid-cols-7"]')) setPlay(card, "maps");
      else if (card.querySelector('[class*="snap-x"] p.line-clamp-2')) setPlay(card, "bans");
      else if (card.querySelector('[class*="snap-x"]')) setPlay(card, "streams");
    }
    for (const tile of stats.children) {
      const value = tile.children[1];
      const idle = !!value && /^[-–:\s]+$/.test(value.textContent.trim());
      if (tile.hasAttribute("data-kft-idle") !== idle) tile.toggleAttribute("data-kft-idle", idle);
    }
    startBansTicker(left.querySelector('[data-kft-play="bans"] [class*="snap-x"]'));
    const maps = left.querySelector('[data-kft-play="maps"]');
    for (const span of maps ? maps.querySelectorAll("button span") : []) {
      const n = span.firstChild;
      if (span.childNodes.length === 1 && n.nodeType === Node.TEXT_NODE && /^de_[a-z0-9]+$/.test(n.nodeValue.trim())) {
        originals.set(n, n.nodeValue);
        const name = n.nodeValue.trim().slice(3);
        n.nodeValue = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }

  // /matches/<id>: marca las piezas de la sala (data-kft-match) y añade datos
  // que Karasu no muestra: ELO medio de cada equipo (en la cabecera, vía
  // atributo + ::after, sin meter nodos en el árbol de Vue), si el turno del
  // veto es de TU equipo, y si el marcador aún no tiene datos (antes de
  // empezar se muestra como dos alineaciones en lugar de 110 rayas).
  function setMatch(el, name) {
    if (el && el.dataset.kftMatch !== name) el.dataset.kftMatch = name;
  }
  function setData(el, key, value) {
    if (!el) return;
    if (value == null) {
      if (key in el.dataset) delete el.dataset[key];
    } else if (el.dataset[key] !== value) el.dataset[key] = value;
  }
  // Tu nombre, del botón de usuario del pie: el texto que no es bandera ni ELO
  function myName() {
    const b = document.querySelector('[data-sidebar="footer"] button[aria-haspopup="menu"]');
    const leaf = b && [...b.querySelectorAll("*")].find((e) => {
      const t = e.childElementCount === 0 ? e.textContent.trim() : "";
      // ni número (ELO) ni solo bandera (emoji sin letras)
      return t && !/^\d+$/.test(t) && /[\p{L}\d]/u.test(t);
    });
    return leaf ? leaf.textContent.trim() : "";
  }
  function decorateMatch() {
    if (!settings.enabled || !location.pathname.startsWith("/matches/")) return;
    const main = document.querySelector("main");
    if (!main) return;

    // Banner de turno (VetoTurnBanner). Vue reutiliza el mismo nodo en sus dos
    // modos, así que el modo se recalcula en cada pasada:
    //   "you":  franja "Your Turn · 51s" + titular (+ subtítulo) + barra
    //   "wait": fila [equipo · acción · BAN] [segundos] + barra
    const turn = main.querySelector('div.mx-auto.max-w-lg.overflow-hidden.rounded-md[class*="backdrop-blur"]');
    setMatch(turn, "turn");
    if (turn) {
      const head = turn.firstElementChild;
      const you = !!head && /\bpy-1\b/.test(String(head.className)) && !head.querySelector("span.truncate");
      setData(turn, "kftTurn", you ? "you" : "wait");
      const activeName = turn.querySelector('span.truncate[class*="tac-amber"]');
      setData(turn, "kftMyturn", you || activeName ? "" : null);
    }
    // Bloque del veto en curso (región, localización o mapas): el hijo de la
    // columna de estadísticas que lo contiene sube a la fila de la cabecera.
    // Al terminar, Karasu muestra el historial en la columna central.
    const tabsCol = main.querySelector('[data-kft-match="tabs"]');
    const vetoRoot = (el) => {
      while (el && el.parentElement && el.parentElement.parentElement !== tabsCol) el = el.parentElement;
      return el && el.parentElement ? el : null;
    };
    const vetoBlock = tabsCol && vetoRoot(turn && tabsCol.contains(turn) ? turn : tabsCol.querySelector(".picks-grid"));
    setMatch(vetoBlock, "vetoblock");
    setMatch(main.querySelector(".match-tabs"), "stats");
    const vetoCard = [...main.querySelectorAll("div")].find((d) => /^relative w-\[1[5-9]0px\]/.test(String(d.className)));
    setMatch(vetoCard?.parentElement, "veto");

    // Cabecera de la sala (equipos + VS/marcador): se compacta en una franja
    for (const h of main.querySelectorAll("header")) {
      setData(h, "kftHead", String(h.children[1]?.className).includes("grid-cols-[1fr_auto_1fr]") ? "" : null);
    }

    // Crédito de Mercurial: locate its provider link independent of the label.
    const credit = main.querySelector('a[href*="mercurial"]');
    setMatch(credit?.closest("div.rounded-md"), "credit");

    // Marcador: alineaciones, ELO medio, mi equipo y si ya hay datos
    decorateRoles(main);
    const table = main.querySelector("table");
    if (!table) return;
    const me = myName();
    const teams = [];
    for (const head of table.querySelectorAll(":scope > thead")) {
      const body = head.nextElementSibling;
      if (!body || body.tagName !== "TBODY") continue;
      const name = head.querySelector("th")?.textContent.trim() || "";
      const elos = [...body.querySelectorAll("tr > td:first-child")].map((td) => {
        const num = [...td.querySelectorAll("span, div")].find((e) => e.childElementCount === 0 && /^\d{2,5}$/.test(e.textContent.trim()));
        return num ? +num.textContent.trim() : null;
      }).filter((n) => n != null);
      const mine = !!me && [...body.querySelectorAll("tr > td:first-child *")].some((e) => e.childElementCount === 0 && e.textContent.trim() === me);
      teams.push({ name, avg: elos.length ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : null, mine });
    }
    const stats = [...table.querySelectorAll("tbody td:not(:first-child)")];
    const prelive = stats.length > 0 && stats.every((td) => !/\d/.test(td.textContent));
    setData(table, "kftPrelive", prelive ? "" : null);

    // Cabecera: ELO medio bajo cada nombre (Alineación 1 a la izquierda, 2 a la derecha)
    const header = [...main.querySelectorAll("header")].find((h) =>
      h.querySelectorAll(":scope > div:nth-child(2) > div").length >= 3 &&
      h.querySelectorAll(".flip-stat__char").length >= 2);
    const lineup = header?.children[1];
    const blocks = lineup ? [lineup.children[0], lineup.children[2]].filter(Boolean) : [];
    blocks.slice(0, 2).forEach((b, i) => {
      const t = teams[i];
      setData(b, "kftElo", t && t.avg != null ? `ELO ${t.avg}` : null);
      setData(b, "kftMine", t && t.mine ? "" : null);
    });

    // Resultado: ganador y perdedor según los dígitos del marcador
    const digits = header ? [...header.querySelectorAll(".flip-stat__char")].map((d) => d.closest("[class*=flip]")?.parentElement) : [];
    const scoreEls = [...new Set(digits)].filter(Boolean);
    const scores = scoreEls.map((e) => parseInt(e.textContent.replace(/\D/g, ""), 10));
    const finished = /finished|finalizad|terminad|beendet|terminé|zakończ|concluíd|完了|заверш/i.test(header?.textContent || "") &&
      scores.length === 2 && !scores.some(isNaN);
    blocks.slice(0, 2).forEach((b, i) => {
      const res = finished && scores[0] !== scores[1] ? (scores[i] > scores[1 - i] ? "win" : "lose") : null;
      setData(b, "kftResult", res);
    });

    renderRosters(main, table, teams, finished ? scores : null);

  }

  // Alineaciones a los lados, como en las salas de partida clásicas. Karasu solo las
  // tiene dentro de la tabla del marcador (en una pestaña), así que se leen
  // de ahí y se pintan en tarjetas propias. Solo se rehace si los datos
  // cambian. Las columnas se localizan por su cabecera, no por posición.
  const STAT_COLS = { k: /Bajas|Kills|Eliminaciones|Frags/i, a: /Asistencias|Assists/i, d: /Muertes|Deaths/i, kd: /^K\s*\/\s*D$/i, hs: /HS\s*%|Headshot/i, adr: /^ADR$/i };
  let rosterSig = "";
  function renderRosters(main, table, teams, scores) {
    const body = [...main.querySelectorAll("div.grid")].find((d) => String(d.className).includes("lg:grid-cols-[minmax(320px"));
    if (!body || body.children.length < 2) return;
    setMatch(body, "body");
    const center = body.children[0];
    setMatch(center, "center");
    setMatch(body.children[1], "tabs");
    // Piezas del centro: conectar, mapa (+ historial del veto), chat, comms
    for (const kid of center.children) {
      if (kid.querySelector(".lucide-headphones")) setMatch(kid, "comms");
      else if (kid.querySelector("form")) setMatch(kid, "chat");
      else if (kid.querySelector("img")) {
        setMatch(kid, "mapgroup");
        for (const part of kid.children) {
          setMatch(part, part.querySelector(".picks-grid") ? "vetohist" : "map");
        }
      } else setMatch(kid, "connect");
    }
    // Botón "Voz" en la cabecera del chat: abre/cierra el panel de comms
    const chatBar = center.querySelector(':scope > [data-kft-match="chat"] div.mb-2');
    const commsPanel = center.querySelector(':scope > [data-kft-match="comms"]');
    if (chatBar && commsPanel) {
      let vbtn = chatBar.querySelector(":scope > .kft-voice");
      if (!vbtn) {
        vbtn = document.createElement("button");
        vbtn.type = "button";
        vbtn.className = "kft-voice";

        vbtn.appendChild(svgIcon("M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"));
        const lab = document.createElement("span");
        vbtn.appendChild(lab);
        vbtn.addEventListener("click", (e) => {
          e.stopPropagation();
          commsPanel.toggleAttribute("data-kft-open");
          vbtn.classList.toggle("is-open", commsPanel.hasAttribute("data-kft-open"));
        });
        chatBar.insertBefore(vbtn, chatBar.lastElementChild);
      }
      const localizedCommsLabel = commsPanel.firstElementChild?.textContent.trim();
      if (localizedCommsLabel) vbtn.setAttribute("aria-label", localizedCommsLabel);
      const count = /(?:^|\D)(\d+)\s+\p{L}/u.exec(commsPanel.textContent)?.[1] || "0";
      const label = count;
      if (vbtn.lastChild.textContent !== label) vbtn.lastChild.textContent = label;
      vbtn.classList.toggle("is-live", count !== "0");
    }
    // Comms de equipo: desplegable, cerrado por defecto (casi todos usan el chat)
    const comms = center.querySelector(':scope > [data-kft-match="comms"]');
    const commsHead = comms?.firstElementChild;
    if (commsHead && !commsHead.dataset.kftToggle) {
      commsHead.dataset.kftToggle = "";
      commsHead.setAttribute("role", "button");
      commsHead.tabIndex = 0;
      const toggle = () => comms.toggleAttribute("data-kft-open");
      commsHead.addEventListener("click", toggle);
      commsHead.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    }

    const heads = [...table.querySelectorAll(":scope > thead")];
    const labels = heads[0] ? [...heads[0].querySelectorAll("th")].map((th) => th.textContent.trim()) : [];
    const fallbackIndex = { k: 1, a: 2, d: 3, kd: 4, hs: 5, adr: 6 };
    const idx = Object.fromEntries(Object.entries(STAT_COLS).map(([k, re]) => {
      const found = labels.findIndex((l) => re.test(l));
      return [k, found > 0 ? found : fallbackIndex[k]];
    }));
    const me = myName();
    const data = heads.map((head, ti) => {
      const rows = [...(head.nextElementSibling?.querySelectorAll(":scope > tr") || [])];
      return {
        name: teams[ti]?.name || head.querySelector("th")?.textContent.trim() || "",
        players: rows.map((tr) => {
          const cells = [...tr.children];
          const c0 = cells[0];
          const leaves = [...c0.querySelectorAll("*")].filter((e) => e.childElementCount === 0 && e.textContent.trim());
          const link = c0.querySelector('a[href^="/players/"]');
          const txt = (e) => e.textContent.trim();
          // Hojas: bandera (sin letras ni dígitos), nombre, ELO y, al terminar,
          // la variación ("▲+34" / "▼-20")
          const name = leaves.map(txt).find((t) => /\p{L}/u.test(t) && !/^[▲▼+\-]?\s*[+\-]?\d+$/.test(t)) || "";
          const flag = leaves.map(txt).find((t) => !/[\p{L}\d]/u.test(t) && !/^[▲▼]$/.test(t)) || "";
          const elo = leaves.map(txt).find((t) => /^\d{2,5}$/.test(t)) || "";
          const delta = (/[▲▼]?\s*([+\-]\d+)/.exec(leaves.map(txt).find((t) => /^[▲▼]?\s*[+\-]\d+$/.test(t)) || "") || [])[1] || "";
          const stat = (k) => {
            // Karasu pinta cada valor como un grupo .flip-stat (una cifra por
            // elemento) y algunas celdas llevan dos (ADR + daño total): se
            // toma el primer grupo, que es el valor principal
            const cell = idx[k] > 0 ? cells[idx[k]] : null;
            const first = cell?.querySelector(".flip-stat");
            const t = (first || cell)?.textContent.trim() || "";
            const m = /^-?\d+(?:\.\d{1,2})?%?/.exec(t);
            return m ? m[0] : "";
          };
          return { name, flag, elo, delta, href: link?.getAttribute("href") || "", avatar: c0.querySelector("img")?.getAttribute("src") || "",
            k: stat("k"), a: stat("a"), d: stat("d"), kd: stat("kd"), hs: stat("hs"), adr: stat("adr"), me: !!me && name === me };
        }),
      };
    });
    const sig = JSON.stringify([data, scores]);
    let wrap = body.querySelector(":scope > .kft-rosters");
    if (wrap && sig === rosterSig) return;
    rosterSig = sig;
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "kft-rosters";
      body.appendChild(wrap);
    }
    const hasStats = data.some((t) => t.players.some((p) => p.k !== ""));
    const topK = hasStats ? Math.max(...data.flatMap((t) => t.players.map((p) => +p.k || 0))) : -1;
    wrap.replaceChildren(...data.slice(0, 2).map((team, ti) => {
      const col = document.createElement("section");
      col.className = "kft-team";
      col.dataset.side = ti;
      if (scores && scores[0] !== scores[1]) col.dataset.result = scores[ti] > scores[1 - ti] ? "win" : "lose";
      const h = document.createElement("header");
      h.className = "kft-team-head";
      const hn = document.createElement("span");
      hn.textContent = team.name;
      h.appendChild(hn);
      if (col.dataset.result) {
        const r = document.createElement("span");
        r.className = "kft-team-res";
        r.textContent = col.dataset.result === "win" ? "W" : "L";
        h.appendChild(r);
      }
      col.appendChild(h);
      for (const p of team.players) {
        const card = document.createElement(p.href ? "a" : "div");
        card.className = "kft-player";
        if (p.href) card.href = p.href;
        if (p.me) card.dataset.me = "";
        if (hasStats && +p.k === topK && topK > 0) card.dataset.mvp = "";
        const av = document.createElement("img");
        av.className = "kft-player-av";
        av.alt = "";
        if (p.avatar) av.src = p.avatar;
        const id = document.createElement("div");
        id.className = "kft-player-id";
        const nm = document.createElement("div");
        nm.className = "kft-player-name";
        nm.textContent = `${p.flag} ${p.name}`.trim();
        const sub = document.createElement("div");
        sub.className = "kft-player-sub";
        sub.textContent = p.elo ? `${p.elo} ELO` : "";
        if (p.delta) {
          const dl = document.createElement("span");
          dl.className = "kft-player-delta";
          dl.dataset.sign = p.delta.startsWith("-") ? "neg" : "pos";
          dl.textContent = p.delta;
          sub.appendChild(dl);
        }
        id.append(nm, sub);
        card.append(av, id);
        if (hasStats) {
          const st = document.createElement("div");
          st.className = "kft-player-stats";
          for (const [label, v] of [["K/A/D", `${p.k}/${p.a}/${p.d}`], ["K/D", p.kd], ["ADR", p.adr], ["HS", p.hs]]) {
            if (!v || v === "//") continue;
            const s = document.createElement("span");
            const b = document.createElement("b");
            b.textContent = v;
            s.append(b, label);
            st.appendChild(s);
          }
          card.appendChild(st);
        }
        col.appendChild(card);
      }
      return col;
    }));
  }

  // Buscador en la barra superior, tras la ruta (PANEL › …), en el que se
  // escribe directamente. Los resultados son los de la paleta de Karasu
  // (Ctrl+K): se abre por detrás, se le pasa lo escrito y se muestra como
  // desplegable bajo el campo, sin fondo oscuro ni ventana. Así se conservan
  // su búsqueda, filtros y enlaces. El buscador de la barra lateral queda
  // oculto por CSS; su texto se reutiliza, así sale en el idioma del jugador.
  const PALETTE = 'div.fixed.inset-0[class*="backdrop-blur"]';
  const palette = () => [...document.querySelectorAll(PALETTE)].find((o) => o.querySelector("input"));
  const setNative = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  let ourCtrlK = false;

  function positionDropdown(field) {
    const r = field.getBoundingClientRect();
    root.style.setProperty("--kft-sx", r.left + "px");
    root.style.setProperty("--kft-sy", r.bottom + 6 + "px");
  }
  function syncPalette(field, input, tries = 0) {
    const ov = palette();
    if (!ov) {
      if (tries === 0) {
        ourCtrlK = true;
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK", ctrlKey: true, bubbles: true }));
        ourCtrlK = false;
      }
      if (tries < 20) setTimeout(() => syncPalette(field, input, tries + 1), 30);
      return;
    }
    root.classList.add("kft-inline-search");
    positionDropdown(field);
    const pi = ov.querySelector("input");
    if (pi.value !== input.value) {
      setNative.call(pi, input.value);
      pi.dispatchEvent(new Event("input", { bubbles: true }));
    }
    // La paleta se queda el foco al abrirse: se devuelve al campo
    if (document.activeElement !== input) input.focus({ preventScroll: true });
  }
  function closeInline(input) {
    const pi = palette()?.querySelector("input");
    if (pi) pi.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    root.classList.remove("kft-inline-search");
    if (input) input.value = "";
  }

  function placeSearch() {
    if (!settings.enabled) return;
    const original = document.querySelector('.group[data-side="left"] [data-sidebar="content"] button[data-sidebar="menu-button"]');
    const nav = document.querySelector('main header nav[aria-label="breadcrumb"]');
    if (!original || !nav) return;
    let box = document.querySelector(".kft-search");
    if (!box) {
      box = document.createElement("label");
      box.className = "kft-search";
      box.appendChild(svgIcon("m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"));
      const input = document.createElement("input");
      input.type = "search";
      input.className = "kft-search-input";
      input.autocomplete = "off";
      input.spellcheck = false;
      const kbd = document.createElement("span");
      kbd.className = "kft-search-kbd";
      kbd.textContent = "Ctrl K";
      box.append(input, kbd);
      input.addEventListener("focus", () => syncPalette(box, input));
      input.addEventListener("input", () => syncPalette(box, input));
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeInline(input);
          input.blur();
          return;
        }
        // Flechas y Enter se reenvían a la paleta (selección de resultado)
        if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
          const pi = palette()?.querySelector("input");
          if (!pi) return;
          e.preventDefault();
          e.stopPropagation(); // si no, la paleta recibe la tecla dos veces
          pi.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, code: e.code, bubbles: true }));
        }
      });
      // Clic fuera del campo y del desplegable: se cierra
      document.addEventListener("mousedown", (e) => {
        if (!root.classList.contains("kft-inline-search")) return;
        const panel = palette()?.firstElementChild;
        if (box.contains(e.target) || panel?.contains(e.target)) return;
        closeInline(input);
      }, true);
      // Ctrl+K enfoca este campo en lugar de abrir la ventana
      window.addEventListener("keydown", (e) => {
        if (ourCtrlK || !settings.enabled || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
        if (!document.contains(box)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        box.querySelector("input").focus();
      }, true);
      window.addEventListener("resize", () => {
        if (root.classList.contains("kft-inline-search")) positionDropdown(box);
      });
    }
    if (box.previousElementSibling !== nav) nav.insertAdjacentElement("afterend", box);
    const text = [...original.childNodes].map((n) => (n.nodeType === Node.TEXT_NODE ? n.nodeValue : n.matches?.("svg, kbd, [class*=kbd]") ? "" : n.textContent)).join("").replace(/Ctrl|K$/g, "").trim() ||
      original.getAttribute("aria-label") || original.title || box.querySelector("input").placeholder;
    const input = box.querySelector("input");
    if (text && input.placeholder !== text) input.placeholder = text;
    // Si la paleta se cerró por su cuenta (p. ej. al elegir un resultado)
    if (root.classList.contains("kft-inline-search") && !palette()) {
      root.classList.remove("kft-inline-search");
      input.value = "";
    }
  }

  // Pestaña "Roles" de la partida: cada jugador tiene tres barras (Sniper,
  // Entry, Utilidad) y una etiqueta de rol. Se marca qué barra decide su rol
  // (las otras se atenúan) y se añade una leyenda con el significado.
  const ROLE_OF = {
    sniper: "sniper", awper: "sniper", atirador: "sniper", "tireur d'élite": "sniper", снайпер: "sniper", "狙击手": "sniper", "スナイパー": "sniper",
    entry: "entry", "entry fragger": "entry", entrada: "entry", "fragger de entrada": "entry", энтри: "entry",
    support: "support", suporte: "support", soporte: "support", soutien: "support", unterstützer: "support", помощник: "support",
    rifler: "rifler", rifle: "rifler", fusilero: "rifler", fuzileiro: "rifler", fusilier: "rifler",
  };
  const METRICS = ["sniper", "entry", "util"];
  const ROLE_LEGEND = [
    ["sniper", "Sniper"],
    ["entry", "Entry"],
    ["support", "Support"],
    ["rifler", "Rifler"],
  ];
  function decorateRoles(main) {
    const cards = [...main.querySelectorAll("div.rounded-md")].filter((c) => c.querySelector(":scope > div.grid-cols-3") && c.querySelector(":scope > div:first-child > span[style]"));
    if (!cards.length) return;
    const localizedRoleNames = {};
    for (const card of cards) {
      const badge = card.querySelector(":scope > div:first-child > span[style]");
      const label = badge.textContent.trim();
      const role = ROLE_OF[label.toLowerCase()] || "rifler";
      localizedRoleNames[role] ||= label;
      if (card.dataset.kftRole !== role) card.dataset.kftRole = role;
      [...card.querySelectorAll(":scope > div.grid-cols-3 > div")].forEach((cell, i) => {
        if (METRICS[i] && cell.dataset.kftMetric !== METRICS[i]) cell.dataset.kftMetric = METRICS[i];
      });
    }
    // Leyenda, una vez, encima de los dos equipos
    const panel = cards[0].closest("div.grid")?.parentElement;
    if (panel && !panel.querySelector(":scope > .kft-role-legend")) {
      const legend = document.createElement("div");
      legend.className = "kft-role-legend";
      for (const [key] of ROLE_LEGEND) {
        if (!localizedRoleNames[key]) continue;
        const item = document.createElement("div");
        item.className = "kft-role-item";
        item.dataset.kftRole = key;
        const b = document.createElement("b");
        b.textContent = localizedRoleNames[key];
        item.append(b);
        legend.appendChild(item);
      }
      panel.insertBefore(legend, cards[0].closest("div.grid"));
    }
  }

  // /play: fondo de malla en perspectiva que ondula (canvas). Un suelo de
  // líneas hacia el horizonte con relieve senoidal que se mueve despacio;
  // más brillante cerca y desvanecido al fondo. 30 fps, en pausa con la
  // pestaña oculta y apagado con "reducir movimiento".
  const wave = { canvas: null, raf: 0, last: 0, t: 0, color: "56,225,255", colorAt: 0 };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function waveColor() {
    const hex = getComputedStyle(root).getPropertyValue("--kft-accent-hex").trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return wave.color;
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  function drawWave(now) {
    wave.raf = requestAnimationFrame(drawWave);
    const cv = wave.canvas;
    if (!cv || document.hidden || now - wave.last < 33) return;
    wave.t += Math.min(now - wave.last, 100) / 1000;
    wave.last = now;
    if (now - wave.colorAt > 1000) {
      wave.color = waveColor();
      wave.colorAt = now;
    }
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const t = wave.t;
    const horizon = h * 0.52, f = h * 0.7, camH = 1.1, cx = w / 2;
    const X0 = -22, X1 = 22, Z0 = 1.3, Z1 = 16, COLS = 72, ROWS = 32;
    const dz = (Z1 - Z0) / ROWS;
    const drift = (t * 0.55) % dz; // el suelo avanza hacia el espectador
    const height = (x, z) =>
      0.42 * Math.sin(x * 0.42 + t * 0.8) * Math.cos(z * 0.33 - t * 0.55) +
      0.22 * Math.sin(z * 0.75 - t * 1.25 + x * 0.12);
    const proj = (x, z) => {
      const y = height(x, z);
      return [cx + (x * f) / z, horizon + ((camH - y) * f) / z];
    };
    const alpha = (z) => {
      const d = (z - Z0) / (Z1 - Z0);
      return Math.max(0, 0.5 * (1 - d) ** 1.4);
    };

    g.lineWidth = 1;
    // Líneas transversales (de lado a lado), de lejos a cerca
    for (let r = ROWS; r >= 0; r--) {
      const z = Z0 + r * dz - drift;
      if (z < Z0 * 0.9) continue;
      g.strokeStyle = `rgba(${wave.color},${alpha(z)})`;
      g.beginPath();
      for (let c = 0; c <= COLS; c++) {
        const [sx, sy] = proj(X0 + ((X1 - X0) * c) / COLS, z);
        c ? g.lineTo(sx, sy) : g.moveTo(sx, sy);
      }
      g.stroke();
    }
    // Líneas de fuga (hacia el horizonte), tramo a tramo para degradar
    for (let c = 0; c <= COLS; c++) {
      const x = X0 + ((X1 - X0) * c) / COLS;
      for (let r = 0; r < ROWS; r++) {
        const za = Z0 + r * dz - drift, zb = za + dz;
        if (za < Z0 * 0.9) continue;
        g.strokeStyle = `rgba(${wave.color},${alpha(za) * 0.8})`;
        const [ax, ay] = proj(x, za), [bx, by] = proj(x, zb);
        g.beginPath();
        g.moveTo(ax, ay);
        g.lineTo(bx, by);
        g.stroke();
      }
    }
  }

  function updateWaveBg() {
    // Karasu anida dos <main>; el canvas va en el más interno (el exterior
    // queda tapado por el fondo opaco del interior)
    const main = document.querySelector('[data-kft-play="root"]')?.closest("main");
    const want = settings.enabled && !reduceMotion.matches && !!main;
    if (!want) {
      if (wave.canvas) {
        cancelAnimationFrame(wave.raf);
        wave.canvas.remove();
        wave.canvas = null;
      }
      return;
    }
    if (wave.canvas && main.contains(wave.canvas)) return;
    wave.canvas?.remove();
    const cv = document.createElement("canvas");
    cv.className = "kft-wave";
    cv.setAttribute("aria-hidden", "true");
    main.prepend(cv);
    wave.canvas = cv;
    wave.last = performance.now();
    cancelAnimationFrame(wave.raf);
    wave.raf = requestAnimationFrame(drawWave);
  }

  // Perfil de jugador (/players/<id>): marca las secciones (data-kft-prof)
  // para reordenarlas por CSS y añade a cada cifra una valoración
  // (Bajo / Medio / Bueno) según referencias habituales de CS2.
  const STAT_TIERS = [
    // [regex de la etiqueta, umbral "medio", umbral "bueno", más alto = mejor]
    [/victorias|win/i, 45, 55, true],
    [/^ADR$/i, 65, 85, true],
    [/^K\/D$/i, 0.9, 1.1, true],
    [/^KPR$/i, 0.6, 0.78, true],
    [/^DPR$/i, 0.75, 0.65, false],
  ];
  const TIER_TEXT = { low: "C", mid: "B", high: "A" };
  function setProf(el, name) {
    if (el && el.dataset.kftProf !== name) el.dataset.kftProf = name;
  }
  function decorateProfile() {
    if (!settings.enabled || !/^\/players\/[^/]+/.test(location.pathname)) return;
    const hero = document.querySelector("main header.relative.isolate")?.parentElement;
    const col = hero?.parentElement;
    if (!col || !hero.classList.contains("grid")) return;
    setProf(col, "col");
    setProf(hero, "hero");
    // La foto del jugador, para el fondo difuminado de la ficha
    const header = hero.querySelector(":scope > header");
    const av = header?.querySelector('span[class*="h-[156px]"] img')?.getAttribute("src");
    if (header && av && header.dataset.kftAv !== av) {
      header.dataset.kftAv = av;
      header.style.setProperty("--kft-av", `url("${av.replace(/"/g, "%22")}")`);
    }
    for (const kid of col.children) {
      if (kid === hero) continue;
      if (kid.querySelector(":scope > div > h3")) setProf(kid, "merc");
      else if (kid.tagName === "SECTION") setProf(kid, "queue");
      else if (kid.querySelector('[class*="snap-x"]')) setProf(kid, "clips");
      else if (kid.querySelector(".scroll-mt-4")) {
        setProf(kid, "statswrap");
        for (const part of kid.children) {
          if (part.querySelector(".scroll-mt-4")) setProf(part, "stats");
          else if (part.querySelector('[class*="min-w-[58"], nav')) setProf(part, "matches");
        }
      }
    }
    // Valoración de cada cifra del resumen
    const tiles = col.querySelector('[data-kft-prof="stats"] div.grid[class*="lg:grid-cols-5"]');
    for (const tile of tiles ? tiles.children : []) {
      const label = tile.querySelector(":scope > div:first-child")?.textContent.trim() || "";
      const value = parseFloat((tile.querySelector(".flip-stat")?.textContent || "").replace(/[^\d.,-]/g, "").replace(",", "."));
      const rule = STAT_TIERS.find(([re]) => re.test(label));
      let tier = null;
      if (rule && !isNaN(value)) {
        const [, mid, good, up] = rule;
        tier = up ? (value >= good ? "high" : value >= mid ? "mid" : "low") : value <= good ? "high" : value <= mid ? "mid" : "low";
      }
      if (tier) {
        if (tile.dataset.kftTier !== tier) tile.dataset.kftTier = tier;
        if (tile.dataset.kftTierText !== TIER_TEXT[tier]) tile.dataset.kftTierText = TIER_TEXT[tier];
      } else {
        delete tile.dataset.kftTier;
        delete tile.dataset.kftTierText;
      }
    }

    // Aclara el badge de nivel sin añadir texto duplicado a la ficha.
    const levelBadgeEl = header?.querySelector("[data-kft-level]");
    if (levelBadgeEl) {
      const lang = (document.documentElement.lang || "en").toLowerCase().split(/[-_]/)[0];
      const labels = { es: "Nivel", en: "Level", fr: "Niveau", de: "Level", pt: "Nível", it: "Livello", ru: "Уровень", ja: "レベル", zh: "等级", ko: "레벨" };
      const label = labels[lang] || labels.en;
      levelBadgeEl.setAttribute("aria-label", `${label} ${levelBadgeEl.textContent.trim()}`);
      levelBadgeEl.dataset.kftProfileLevel = "";
    }

    // Los SVG de gráficas suelen guardar el dato accesible en aria-label,
    // data-* o <title>. Refleja ese mismo dato en el tooltip nativo si falta.
    const eloChart = hero.querySelector('div.relative[class*="min-h-[150px"]');
    for (const point of eloChart?.querySelectorAll("svg circle, svg [role=img], svg [data-value]") || []) {
      if (point.hasAttribute("title")) continue;
      const title = point.getAttribute("aria-label") || point.getAttribute("data-tooltip") ||
        point.getAttribute("data-value") || point.querySelector(":scope > title")?.textContent.trim();
      if (title) point.setAttribute("title", title);
    }
  }

  // Leaderboard ("standings"): marca el podio y la tabla para el CSS, y
  // calcula para cada fila su distancia al #1 (barra junto al ELO). Fuera
  // la columna de país: la bandera ya va con el nombre.
  // /utility/<mapa>: la biblioteca de lineups. Vacía (lo normal hoy) solo
  // enseñaba controles que no hacen nada. Se marca el estado vacío para que
  // el CSS explique qué es y lleve a la única acción útil (Practice Server).
  // El texto va en un atributo (pintado con ::before), sin nodos en Vue.
  const UTIL_HELP = {
    en: [
      "Lineups are saved grenade throws: where to stand, where to aim and where it lands.",
      "",
      "1   Open a Practice Server (top of the map)",
      "2   Throw the grenade in game",
      "3   Save it: it shows up here and on the map",
      "",
      "Using filters? Clear them to see everything.",
    ].join("\n"),
    es: [
      "Un lineup es una granada guardada: dónde ponerte, dónde apuntar y dónde cae.",
      "",
      "1   Abre un Practice Server (arriba del mapa)",
      "2   Lanza la granada en el juego",
      "3   Guárdala: aparece aquí y en el mapa",
      "",
      "¿Tienes filtros puestos? Quítalos para verlo todo.",
    ].join("\n"),
  };
  function decorateUtility() {
    if (!settings.enabled || !/^\/utility\/[^/]+/.test(location.pathname)) return;
    const board = document.querySelector(".utility-board");
    const root = board?.parentElement;
    if (!root) return;
    setData(root, "kftUtil", "");
    const empty = root.querySelector("div.border-dashed.text-center");
    setData(root, "kftUtilEmpty", empty ? "" : null);
    if (empty) setData(empty, "kftUtilHelp", UTIL_HELP[/^es/i.test(document.documentElement.lang) ? "es" : "en"]);
  }

  function decorateLeaderboard() {
    if (!settings.enabled || !/^\/leaderboard/.test(location.pathname)) return;
    const podium = [...document.querySelectorAll("main div.grid")].find((d) => d.children.length === 3 && [...d.children].every((a) => a.matches("a.rounded-xl.border")));
    if (podium && podium.dataset.kftPodium !== "") podium.dataset.kftPodium = "";
    // Franja de 4 tarjetas de datos (jugadores, tu puesto, tu ELO, top ELO)
    const strip = [...document.querySelectorAll("main div.grid")].find((d) => d.children.length === 4 && [...d.children].every((c) => String(c.className).includes("bg-card/60")));
    if (strip && strip.dataset.kftLbstats !== "") strip.dataset.kftLbstats = "";
    // Ventaja del #1 sobre el #2 (orden de Karasu: [#2, #1, #3])
    if (podium) {
      const eloOf = (a) => parseInt(a?.querySelector(":scope > div > span:nth-child(4)")?.textContent.replace(/\D/g, ""), 10);
      const lead = eloOf(podium.children[1]) - eloOf(podium.children[0]);
      const box = podium.children[1]?.firstElementChild;
      const es = /^es/i.test(document.documentElement.lang);
      const text = isNaN(lead) ? null : es ? `+${lead} ELO sobre el #2` : `+${lead} ELO over #2`;
      if (box && box.dataset.kftLead !== text) {
        if (text) box.dataset.kftLead = text;
        else delete box.dataset.kftLead;
      }
    }
    const table = document.querySelector("main table");
    if (!table) return;
    const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    const idxCountry = heads.findIndex((t) => /^(country|país|pais)$/i.test(t));
    const idxElo = heads.findIndex((t) => /^elo$/i.test(t));
    table.dataset.kftStandings = "";
    table.querySelectorAll("thead th").forEach((th, i) => th.toggleAttribute("data-kft-hidecol", i === idxCountry));
    const rows = [...table.querySelectorAll("tbody tr")].map((tr) => {
      const cells = [...tr.children];
      return { tr, cells, rank: parseInt(cells[0]?.textContent.trim(), 10), elo: parseInt(cells[idxElo]?.textContent.replace(/\D/g, ""), 10) };
    });
    const elos = rows.map((r) => r.elo).filter((n) => !isNaN(n));
    const top = Math.max(...elos), low = Math.min(...elos);
    for (const { tr, cells, rank, elo } of rows) {
      cells.forEach((td, i) => td.toggleAttribute("data-kft-hidecol", i === idxCountry));
      // Segunda línea del jugador vacía ("—"): fuera, solo ensucia la fila
      const sub = tr.querySelector("td a.grid .text-left > div:nth-child(2)");
      if (sub) sub.toggleAttribute("data-kft-empty", sub.textContent.trim() === "—" || sub.textContent.trim() === "");
      const pos = rank === 1 ? "1" : rank === 2 ? "2" : rank === 3 ? "3" : null;
      if (pos) tr.dataset.kftPos = pos;
      else if ("kftPos" in tr.dataset) delete tr.dataset.kftPos;
      const cell = cells[idxElo];
      if (cell && !isNaN(elo) && top > low) {
        cell.dataset.kftElo = "";
        cell.style.setProperty("--kft-elo", (12 + ((elo - low) / (top - low)) * 88).toFixed(1) + "%");
      }
    }
  }

  // Logo: cuervo (烏, "karasu") de papiroflexia, facetas plateadas y el ojo
  // en el color de acento, junto al nombre y el kanji. Se dibuja una vez.
  const CROW = [
    ["4,12 9,6 17,4.5 22,7.5 18.5,12.5", "#f1f3f5"],
    ["22,7.5 30,11.5 18.5,12.5", "#d9dde2"],
    ["18.5,12.5 30,11.5 20,15", "#8a9099"],
    ["4,12 18.5,12.5 20,15 13,20", "#b9bfc7"],
    ["13,20 20,15 17.5,22.5 14.5,21", "#6e747d"],
    ["13,20 14.5,24 11,22.5 9.5,27 8.5,22", "#575c64"],
    ["4,12 13,20 8.5,22 3,30 5,18", "#9aa1aa"],
  ];
  function brandLogo() {
    if (!settings.enabled) return;
    const a = document.querySelector('[data-sidebar="header"] > a');
    if (!a || a.querySelector(":scope > .kft-logo-mark")) return;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("class", "kft-logo-mark");
    svg.setAttribute("aria-hidden", "true");
    for (const [pts, fill] of CROW) {
      const p = document.createElementNS(NS, "polygon");
      p.setAttribute("points", pts);
      p.setAttribute("fill", fill);
      svg.appendChild(p);
    }
    const eye = document.createElementNS(NS, "circle");
    eye.setAttribute("cx", "15");
    eye.setAttribute("cy", "9.2");
    eye.setAttribute("r", "1.1");
    eye.setAttribute("class", "kft-logo-eye");
    svg.appendChild(eye);
    const kanji = document.createElement("span");
    kanji.className = "kft-logo-kanji";
    kanji.setAttribute("aria-hidden", "true");
    kanji.textContent = "烏";
    a.prepend(svg);
    a.appendChild(kanji);
  }

  function restoreAll() {
    document.querySelectorAll(".kft-logo-mark, .kft-logo-kanji").forEach((el) => el.remove());
    document.querySelectorAll(".kft-search, .kft-role-legend").forEach((el) => el.remove());
    updateWaveBg();
    root.classList.remove("kft-inline-search");
    document.querySelectorAll(".kft-rosters").forEach((el) => el.remove());
    rosterSig = "";
    document.querySelectorAll("[data-kft-result]").forEach((el) => delete el.dataset.kftResult);
    document.querySelectorAll("[data-kft-match]").forEach((el) => delete el.dataset.kftMatch);
    document.querySelectorAll("[data-kft-prelive], [data-kft-elo], [data-kft-mine], [data-kft-myturn], [data-kft-turn], [data-kft-head], [data-kft-util], [data-kft-util-empty], [data-kft-util-help]").forEach((el) => {
      delete el.dataset.kftPrelive;
      delete el.dataset.kftElo;
      delete el.dataset.kftMine;
      delete el.dataset.kftMyturn;
      delete el.dataset.kftTurn;
      delete el.dataset.kftHead;
      delete el.dataset.kftUtil;
      delete el.dataset.kftUtilEmpty;
      delete el.dataset.kftUtilHelp;
    });
    document.querySelectorAll("[data-kft-play]").forEach((el) => delete el.dataset.kftPlay);
    document.querySelectorAll("[data-kft-prof], [data-kft-tier]").forEach((el) => { delete el.dataset.kftProf; delete el.dataset.kftTier; delete el.dataset.kftTierText; });
    document.querySelectorAll("[data-kft-idle]").forEach((el) => el.removeAttribute("data-kft-idle"));
    document.querySelectorAll(".kft-folder").forEach((b) => b.remove());
    document.querySelectorAll("[data-kft-in-folder]").forEach((li) => {
      li.removeAttribute("data-kft-in-folder");
      li.removeAttribute("data-kft-folded");
    });
    document.querySelectorAll("[data-kft-tip]").forEach((b) => {
      delete b.dataset.kftTip;
      if ("kftAria" in b.dataset) {
        b.removeAttribute("aria-label");
        delete b.dataset.kftAria;
      }
    });
    removeTypeUi();
    document.querySelectorAll(".kft-close").forEach((b) => b.remove());
    document.querySelectorAll(".alert-row[data-kft-dismissed], .alert-row[data-kft-closing]").forEach((row) => {
      delete row.dataset.kftDismissed;
      delete row.dataset.kftClosing;
    });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (originals.has(n)) n.nodeValue = originals.get(n);
    }
    document.querySelectorAll("[data-kft-level]").forEach((el) => {
      delete el.dataset.kftLevel;
      el.style.removeProperty("--kft-lvl");
      el.style.removeProperty("--kft-lvl-n");
    });
    document.querySelectorAll("[data-kft-profile-level]").forEach((el) => {
      el.removeAttribute("aria-label");
      el.removeAttribute("title");
      delete el.dataset.kftProfileLevel;
    });
  }

  let pending = new Set();
  let scheduled = false;
  function queue(node) {
    pending.add(node);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const nodes = pending;
      pending = new Set();
      nodes.forEach(scan);
      decorateAlerts();
      updateTypeFilter();
      labelRail();
      updateFolders();
      decoratePlay();
      decorateProfile();
      decorateLeaderboard();
      decorateUtility();
      updateWaveBg();
      decorateMatch();
      placeSearch();
      brandLogo();
    });
  }

  function startTextObserver() {
    if (!document.body) return;
    scan(document.body);
    decorateAlerts();
    labelRail();
    updateFolders();
    decoratePlay();
    decorateProfile();
    decorateLeaderboard();
    decorateUtility();
    decorateMatch();
    placeSearch();
    brandLogo();
    updateWaveBg();
    new MutationObserver((muts) => {
      if (!settings.enabled) return;
      for (const m of muts) {
        if (m.type === "characterData") queue(m.target);
        else m.addedNodes.forEach(queue);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // Aplicar en seguida (antes del primer pintado) con los valores por defecto,
  // y corregir cuando lleguen los ajustes guardados.
  apply();
  chrome.storage.sync.get({ ...DEFAULTS, accentV2: false }, (stored) => {
    // v1.3: el acento por defecto pasa del naranja antiguo al cian de Karasu.
    // Quien tenía guardado el naranja de antes pasa al cian una sola vez;
    // si después elige el naranja a mano, se respeta.
    if (!stored.accentV2) {
      if (stored.accent === "#ff4b00") stored.accent = DEFAULTS.accent;
      chrome.storage.sync.set({ accent: stored.accent, accentV2: true });
    }
    delete stored.accentV2;
    settings = { ...DEFAULTS, ...stored };
    apply();
  });

  chrome.storage.local.get({ dismissedAlerts: [] }, (stored) => {
    dismissed = new Set(stored.dismissedAlerts);
    decorateAlerts();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.dismissedAlerts) {
      // El popup puede vaciar la lista para volver a mostrarlos
      dismissed = new Set(changes.dismissedAlerts.newValue || []);
      decorateAlerts();
      return;
    }
    if (area !== "sync") return;
    const wasEnabled = settings.enabled;
    for (const [key, { newValue }] of Object.entries(changes)) {
      settings[key] = newValue;
    }
    apply();
    if (wasEnabled && !settings.enabled) restoreAll();
    if (!wasEnabled && settings.enabled) {
      scan(document.body);
      decorateAlerts();
    }
  });

  // Foco de luz que sigue al cursor sobre las tarjetas pulsables. Mismo
  // selector que en la sección 12 de theme.css; el CSS lee --kft-mx/--kft-my.
  const SPOTLIGHT = [
    ':is(a, button, [role="button"], .cursor-pointer):is(.bg-card, [class^="bg-card/"], [class*=" bg-card/"], .rounded-xl.border, .rounded-lg.border, [class^="bg-muted/30"], [class*=" bg-muted/30"])',
    '[class*="hover:shadow-primary"]',
    ".cursor-pointer.group.border",
  ].join(",");
  let lastMove = null;
  let moveFrame = 0;
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!settings.enabled || e.pointerType !== "mouse") return;
      lastMove = e;
      if (moveFrame) return;
      moveFrame = requestAnimationFrame(() => {
        moveFrame = 0;
        const card = lastMove.target.closest?.(SPOTLIGHT);
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--kft-mx", `${Math.round(lastMove.clientX - r.left)}px`);
        card.style.setProperty("--kft-my", `${Math.round(lastMove.clientY - r.top)}px`);
      });
    },
    { passive: true }
  );

  // Nuxt/unhead puede reescribir el atributo class del <html>; volver a poner
  // nuestras clases si desaparecen.
  new MutationObserver(() => {
    if (settings.enabled && !root.classList.contains("kft")) apply();
  }).observe(root, { attributes: true, attributeFilter: ["class"] });

  if (document.body) startTextObserver();
  else document.addEventListener("DOMContentLoaded", startTextObserver, { once: true });
})();
