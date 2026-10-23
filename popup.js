const DEFAULTS = { enabled: true, accent: "#38e1ff", uppercase: true, fx: true };
const $ = (id) => document.getElementById(id);
const $accent = $("accent");
const $custom = $("custom");
const $reset = $("reset");
const $saved = $("saved");
const $savedText = $("saved-text");
const swatches = [...document.querySelectorAll(".sw[data-c]")];

const MESSAGES = {
  en: { subtitle:"for karasu.live", active:"Active", paused:"Paused", enable:"Enable theme", instant:"Applies instantly", uppercase:"Uppercase labels", uppercaseHint:"Use uppercase text across the theme", effects:"Visual effects", effectsHint:"Lighting, glass and motion", accent:"Accent color", accentHint:"Buttons and highlights", cyan:"Karasu cyan", orange:"Orange", crimson:"Crimson", gold:"Gold", emerald:"Emerald", violet:"Violet", custom:"Custom color", dismissed:"Dismissed notices", hidden:n=>`${n} hidden`, show:"Show", reset:"Reset", resetHint:"Back to Karasu cyan", saved:"Saved", accentSwatches:"Accent color" },
  es: { subtitle:"para karasu.live", active:"Activo", paused:"Pausado", enable:"Activar tema", instant:"Se aplica al instante", uppercase:"Etiquetas en mayúsculas", uppercaseHint:"Usar mayúsculas en todo el tema", effects:"Efectos visuales", effectsHint:"Iluminación, cristal y movimiento", accent:"Color de acento", accentHint:"Botones y elementos destacados", cyan:"Cian Karasu", orange:"Naranja", crimson:"Carmesí", gold:"Dorado", emerald:"Esmeralda", violet:"Violeta", custom:"Color personalizado", dismissed:"Avisos ocultos", hidden:n=>`${n} ocultos`, show:"Mostrar", reset:"Restablecer", resetHint:"Volver al cian Karasu", saved:"Guardado", accentSwatches:"Color de acento" },
  fr: { subtitle:"pour karasu.live", active:"Actif", paused:"En pause", enable:"Activer le thème", instant:"Application immédiate", uppercase:"Libellés en majuscules", uppercaseHint:"Utiliser les majuscules dans le thème", effects:"Effets visuels", effectsHint:"Éclairage, verre et mouvement", accent:"Couleur d’accentuation", accentHint:"Boutons et éléments mis en évidence", cyan:"Cyan Karasu", orange:"Orange", crimson:"Cramoisi", gold:"Doré", emerald:"Émeraude", violet:"Violet", custom:"Couleur personnalisée", dismissed:"Notifications masquées", hidden:n=>`${n} masquées`, show:"Afficher", reset:"Réinitialiser", resetHint:"Revenir au cyan Karasu", saved:"Enregistré", accentSwatches:"Couleur d’accentuation" },
  de: { subtitle:"für karasu.live", active:"Aktiv", paused:"Pausiert", enable:"Design aktivieren", instant:"Wird sofort angewendet", uppercase:"Beschriftungen in Großbuchstaben", uppercaseHint:"Großbuchstaben im gesamten Design verwenden", effects:"Visuelle Effekte", effectsHint:"Licht, Glas und Bewegung", accent:"Akzentfarbe", accentHint:"Schaltflächen und Hervorhebungen", cyan:"Karasu-Cyan", orange:"Orange", crimson:"Karmesinrot", gold:"Gold", emerald:"Smaragdgrün", violet:"Violett", custom:"Eigene Farbe", dismissed:"Ausgeblendete Hinweise", hidden:n=>`${n} ausgeblendet`, show:"Anzeigen", reset:"Zurücksetzen", resetHint:"Zu Karasu-Cyan zurückkehren", saved:"Gespeichert", accentSwatches:"Akzentfarbe" },
  pt: { subtitle:"para karasu.live", active:"Ativo", paused:"Pausado", enable:"Ativar tema", instant:"Aplicado instantaneamente", uppercase:"Rótulos em maiúsculas", uppercaseHint:"Usar maiúsculas em todo o tema", effects:"Efeitos visuais", effectsHint:"Iluminação, vidro e movimento", accent:"Cor de destaque", accentHint:"Botões e destaques", cyan:"Ciano Karasu", orange:"Laranja", crimson:"Carmesim", gold:"Dourado", emerald:"Esmeralda", violet:"Violeta", custom:"Cor personalizada", dismissed:"Avisos ocultos", hidden:n=>`${n} ocultos`, show:"Mostrar", reset:"Redefinir", resetHint:"Voltar ao ciano Karasu", saved:"Guardado", accentSwatches:"Cor de destaque" },
  it: { subtitle:"per karasu.live", active:"Attivo", paused:"In pausa", enable:"Attiva tema", instant:"Applicato subito", uppercase:"Etichette maiuscole", uppercaseHint:"Usa le maiuscole in tutto il tema", effects:"Effetti visivi", effectsHint:"Luce, vetro e movimento", accent:"Colore principale", accentHint:"Pulsanti ed evidenziazioni", cyan:"Ciano Karasu", orange:"Arancione", crimson:"Cremisi", gold:"Oro", emerald:"Smeraldo", violet:"Viola", custom:"Colore personalizzato", dismissed:"Avvisi nascosti", hidden:n=>`${n} nascosti`, show:"Mostra", reset:"Ripristina", resetHint:"Torna al ciano Karasu", saved:"Salvato", accentSwatches:"Colore principale" },
  ru: { subtitle:"для karasu.live", active:"Включена", paused:"Приостановлена", enable:"Включить тему", instant:"Применяется сразу", uppercase:"Заглавные подписи", uppercaseHint:"Использовать заглавные буквы в теме", effects:"Визуальные эффекты", effectsHint:"Подсветка, стекло и анимация", accent:"Акцентный цвет", accentHint:"Кнопки и выделения", cyan:"Бирюзовый Karasu", orange:"Оранжевый", crimson:"Малиновый", gold:"Золотой", emerald:"Изумрудный", violet:"Фиолетовый", custom:"Свой цвет", dismissed:"Скрытые уведомления", hidden:n=>`Скрыто: ${n}`, show:"Показать", reset:"Сбросить", resetHint:"Вернуть бирюзовый Karasu", saved:"Сохранено", accentSwatches:"Акцентный цвет" },
  ja: { subtitle:"karasu.live 用", active:"有効", paused:"一時停止", enable:"テーマを有効にする", instant:"すぐに適用", uppercase:"ラベルを大文字にする", uppercaseHint:"テーマ全体の文字を大文字にする", effects:"視覚効果", effectsHint:"照明、ガラス、モーション", accent:"アクセントカラー", accentHint:"ボタンと強調表示", cyan:"Karasu シアン", orange:"オレンジ", crimson:"深紅", gold:"ゴールド", emerald:"エメラルド", violet:"バイオレット", custom:"カスタムカラー", dismissed:"非表示のお知らせ", hidden:n=>`${n} 件を非表示`, show:"表示", reset:"リセット", resetHint:"Karasu シアンに戻す", saved:"保存しました", accentSwatches:"アクセントカラー" },
  zh: { subtitle:"适用于 karasu.live", active:"已启用", paused:"已暂停", enable:"启用主题", instant:"立即应用", uppercase:"标签使用大写", uppercaseHint:"在主题中使用大写文字", effects:"视觉效果", effectsHint:"灯光、玻璃和动态效果", accent:"强调色", accentHint:"按钮和突出显示", cyan:"Karasu 青色", orange:"橙色", crimson:"深红色", gold:"金色", emerald:"祖母绿", violet:"紫色", custom:"自定义颜色", dismissed:"已隐藏通知", hidden:n=>`已隐藏 ${n} 条`, show:"显示", reset:"重置", resetHint:"恢复 Karasu 青色", saved:"已保存", accentSwatches:"强调色" },
  ko: { subtitle:"karasu.live용", active:"사용 중", paused:"일시중지", enable:"테마 사용", instant:"즉시 적용", uppercase:"레이블 대문자 표시", uppercaseHint:"테마 전체에 대문자 사용", effects:"시각 효과", effectsHint:"조명, 유리 효과 및 모션", accent:"강조 색상", accentHint:"버튼 및 강조 표시", cyan:"Karasu 시안", orange:"주황색", crimson:"진홍색", gold:"금색", emerald:"에메랄드", violet:"보라색", custom:"사용자 지정 색상", dismissed:"숨긴 알림", hidden:n=>`${n}개 숨김`, show:"표시", reset:"초기화", resetHint:"Karasu 시안으로 되돌리기", saved:"저장됨", accentSwatches:"강조 색상" }
};
let lang = "en";
let messages = MESSAGES.en;
function applyLanguage(rawLang) {
  const base = String(rawLang || "en").toLowerCase().split(/[-_]/)[0];
  lang = MESSAGES[base] ? base : "en";
  messages = MESSAGES[lang];
  document.documentElement.lang = MESSAGES[base] ? rawLang : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => { const value = messages[el.dataset.i18n]; if (value) el.textContent = value; });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => { const value = messages[el.dataset.i18nTitle]; if (value) el.title = value; });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => { const value = messages[el.dataset.i18nAria]; if (value) el.setAttribute("aria-label", value); });
  const group = document.querySelector(".swatches");
  if (group) group.setAttribute("aria-label", messages.accentSwatches);
}
let state = { ...DEFAULTS };
applyLanguage("en");
function render() {
  const accent = state.accent.toLowerCase();
  document.documentElement.style.setProperty("--accent", accent);
  document.body.classList.toggle("off", !state.enabled);
  $("status-text").textContent = state.enabled ? messages.active : messages.paused;
  $("hex").textContent = accent.toUpperCase();
  for (const key of ["enabled"]) $(key).checked = !!state[key];
  let preset = false;
  swatches.forEach((sw) => { const on = sw.dataset.c === accent; preset ||= on; sw.setAttribute("aria-pressed", on); });
  $custom.setAttribute("aria-pressed", !preset);
  $accent.value = accent;
  $reset.disabled = accent === DEFAULTS.accent;
  syncPicker();
}
let savedTimer;
function flashSaved() {
  $saved.classList.add("on"); $savedText.textContent = messages.saved;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { $saved.classList.remove("on"); $savedText.textContent = messages.instant; }, 1400);
}
function save(patch) { Object.assign(state, patch); render(); chrome.storage.sync.set(patch, flashSaved); }
chrome.storage.sync.get({ ...DEFAULTS, accentV2: false }, (stored) => {
  if (!stored.accentV2) { if (stored.accent === "#ff4b00") stored.accent = DEFAULTS.accent; chrome.storage.sync.set({ accent: stored.accent, accentV2: true }); }
  delete stored.accentV2; state = { ...DEFAULTS, ...stored }; render();
});
chrome.storage.local.get({ siteLanguage: "" }, ({ siteLanguage }) => { if (siteLanguage) { applyLanguage(siteLanguage); render(); } });
for (const key of ["enabled"]) $(key).addEventListener("change", (e) => save({ [key]: e.target.checked }));
swatches.forEach((sw) => sw.addEventListener("click", () => save({ accent: sw.dataset.c })));
let accentTimer;
$accent.addEventListener("input", () => { state.accent = $accent.value; render(); clearTimeout(accentTimer); accentTimer = setTimeout(() => save({ accent: $accent.value }), 250); });
$reset.addEventListener("click", () => save({ accent: DEFAULTS.accent }));
function renderNotices(list) { const n = list.length; $("notices").hidden = n === 0; $("notices-count").textContent = messages.hidden(n); }
chrome.storage.local.get({ dismissedAlerts: [] }, (s) => renderNotices(s.dismissedAlerts));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.dismissedAlerts) renderNotices(changes.dismissedAlerts.newValue || []);
  if (changes.siteLanguage?.newValue) {
    applyLanguage(changes.siteLanguage.newValue);
    render();
    chrome.storage.local.get({ dismissedAlerts: [] }, (s) => renderNotices(s.dismissedAlerts));
  }
});
$("notices-reset").addEventListener("click", () => chrome.storage.local.set({ dismissedAlerts: [] }, flashSaved));

const $picker = $("picker"), $sv = $("sv"), $svKnob = $("sv-knob"), $hue = $("hue"), $hueKnob = $("hue-knob"), $hexIn = $("hex-in");
let hsv = { h: 190, s: 0.8, v: 1 };
function hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}
function hsvToHex({ h, s, v }) {
  const f = (k) => { const x = (k + h / 60) % 6; return v - v * s * Math.max(0, Math.min(x, 4 - x, 1)); };
  return "#" + [f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
}
function paintPicker() {
  $sv.style.setProperty("--h", hsv.h);
  $hue.style.setProperty("--h", hsv.h);
  $svKnob.style.left = hsv.s * 100 + "%";
  $svKnob.style.top = (1 - hsv.v) * 100 + "%";
  $hueKnob.style.left = (hsv.h / 360) * 100 + "%";
  $hue.setAttribute("aria-valuenow", Math.round(hsv.h));
  if (document.activeElement !== $hexIn) $hexIn.value = hsvToHex(hsv).slice(1).toUpperCase();
}
function syncPicker() {
  queueMicrotask(() => {
    if ($picker.hidden || $picker.contains(document.activeElement)) return;
    hsv = hexToHsv(state.accent);
    paintPicker();
  });
}
function commit() {
  $accent.value = hsvToHex(hsv);
  $accent.dispatchEvent(new Event("input"));
  paintPicker();
}
function drag(el, onMove) {
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    el.focus();
    const move = (ev) => {
      const r = el.getBoundingClientRect();
      onMove(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
      commit();
    };
    move(e);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", () => el.removeEventListener("pointermove", move), { once: true });
  });
}
drag($sv, (x, y) => { hsv.s = x; hsv.v = 1 - y; });
drag($hue, (x) => { hsv.h = Math.min(359.9, x * 360); });
$sv.addEventListener("keydown", (e) => {
  const d = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, 0.02], ArrowDown: [0, -0.02] }[e.key];
  if (!d) return;
  e.preventDefault();
  hsv.s = Math.min(1, Math.max(0, hsv.s + d[0]));
  hsv.v = Math.min(1, Math.max(0, hsv.v + d[1]));
  commit();
});
$hue.addEventListener("keydown", (e) => {
  const d = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key];
  if (!d) return;
  e.preventDefault();
  hsv.h = (hsv.h + d + 360) % 360;
  commit();
});
$hexIn.addEventListener("input", () => {
  const v = $hexIn.value.replace(/[^0-9a-f]/gi, "").slice(0, 6);
  if (v.length === 6) { hsv = hexToHsv("#" + v.toLowerCase()); commit(); }
});
$hexIn.addEventListener("blur", paintPicker);
$custom.addEventListener("click", () => {
  $picker.hidden = !$picker.hidden;
  $custom.setAttribute("aria-expanded", !$picker.hidden);
  hsv = hexToHsv(state.accent);
  paintPicker();
});
