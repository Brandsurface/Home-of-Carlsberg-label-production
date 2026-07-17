// ══ Can Artwork & Production — order form logic ══

const T = window.__T || {};
const LANG = window.__LANG || 'en';
const VARIANTS = window.__VARIANTS || {};                 // { "Tuborg": ["Classic", ...], ... }
const PANT_EXEMPT = (window.__PANT_EXEMPT || 'Border');   // region that hides the deposit mark

// ── State ──
const state = {
  brand: null,        // brand name, '' = "I don't know yet"
  brandUnknown: false,
  variant: '',
  size: '',
  region: '',
  labelType: '',
  artwork: false,
  smash: false,
};
let uploadedFiles = []; // { path, name, size }
window.__editId = null;

function g(id) { return document.getElementById(id)?.value?.trim() || ''; }
function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ── Ingredients rich text (bold support) ──
// Canonical stored format: HTML-escaped text + <b>…</b> for bold + literal "\n".
function boldWrap(text, bold) { return text === '' ? '' : (bold ? '<b>' + text + '</b>' : text); }
function serializeRich(el) {
  if (!el) return '';
  let out = '';
  (function walk(node, bold) {
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) { out += boldWrap(escHtml(n.nodeValue), bold); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName;
      if (tag === 'BR') { out += '\n'; return; }
      let b = bold;
      const fw = n.style && n.style.fontWeight;
      if (tag === 'B' || tag === 'STRONG' || fw === 'bold' || (fw && parseInt(fw, 10) >= 600)) b = true;
      const block = (tag === 'DIV' || tag === 'P');
      if (block && out && !out.endsWith('\n')) out += '\n';
      walk(n, b);
      if (block && !out.endsWith('\n')) out += '\n';
    });
  })(el, false);
  return out.replace(/<\/b><b>/g, '').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
}
// Render stored value to safe HTML: keep only <b>, neutralise stray tags, \n → <br>.
function richToSafeHtml(stored) {
  const s = String(stored == null ? '' : stored);
  const re = /<\s*(\/?)\s*(b|strong)\s*>/gi;
  let out = '', last = 0, m;
  while ((m = re.exec(s)) !== null) {
    out += s.slice(last, m.index).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    out += m[1] ? '</b>' : '<b>';
    last = re.lastIndex;
  }
  out += s.slice(last).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return out.replace(/\r\n|\r|\n/g, '<br>');
}
function decodeEntities(s) {
  return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
}
function extractBold(stored) {
  const out = [];
  const re = /<\s*(b|strong)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi;
  let m;
  while ((m = re.exec(String(stored || ''))) !== null) {
    const t = decodeEntities(m[2].replace(/<[^>]*>/g, '')).trim();
    if (t) out.push(t);
  }
  return out.filter((v, i) => out.indexOf(v) === i);
}
function updateMarked() {
  const el = document.getElementById('ingredients');
  if (!el) return;
  el.classList.toggle('is-empty', el.textContent.trim() === '');
  const marks = extractBold(serializeRich(el));
  const box = document.getElementById('ingredients-marked');
  const list = document.getElementById('ingredients-marked-list');
  if (!box || !list) return;
  if (marks.length) {
    list.innerHTML = marks.map(m => `<span class="marked-chip">${escHtml(m)}</span>`).join('');
    box.hidden = false;
  } else {
    list.innerHTML = '';
    box.hidden = true;
  }
}
function refreshBoldBtn() {
  const btn = document.getElementById('ing-bold-btn');
  if (!btn) return;
  let on = false;
  try { on = document.queryCommandState('bold'); } catch (e) {}
  btn.classList.toggle('active', on);
}
function toggleIngredientBold() {
  const el = document.getElementById('ingredients');
  if (!el) return;
  el.focus();
  try { document.execCommand('styleWithCSS', false, false); } catch (e) {}
  document.execCommand('bold');
  updateMarked();
  refreshBoldBtn();
}

// ── Brand selection ──
function selectBrand(el) {
  document.querySelectorAll('.brand-tile.selected').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  state.brandUnknown = el.dataset.unknown === '1';
  state.brand = state.brandUnknown ? '' : (el.dataset.brand || '');
  populateVariants();
  document.getElementById('err-brand')?.classList.remove('show');
}

function populateVariants() {
  const sel = document.getElementById('variant');
  if (!sel) return;
  const prev = state.variant;
  const list = (!state.brandUnknown && state.brand && Array.isArray(VARIANTS[state.brand])) ? VARIANTS[state.brand] : [];
  let html = `<option value="">${escHtml(T.variant_ph || 'Choose variant…')}</option>`;
  list.forEach(v => { html += `<option value="${escHtml(v)}">${escHtml(v)}</option>`; });
  html += `<option value="__unknown__">${escHtml(T.brand_unknown || "I don't know yet")}</option>`;
  sel.innerHTML = html;
  sel.disabled = false;
  // keep previous selection if still valid
  if (prev && (prev === '__unknown__' || list.includes(prev))) sel.value = prev;
  else { sel.value = ''; state.variant = ''; }
}

// ── Segmented controls ──
function selectSize(el) {
  document.querySelectorAll('#size-chips .size-chip.selected').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.size = el.dataset.size || '';
  document.getElementById('err-size')?.classList.remove('show');
}
function selectRegion(el) {
  document.querySelectorAll('#region-seg .seg-btn.selected').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.region = el.dataset.region || '';
  updatePantmaerke();
}
function selectLabelType(el) {
  document.querySelectorAll('#labeltype-seg .seg-btn.selected').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.labelType = el.dataset.labeltype || '';
  // Finish options are identical for both print types, so keep the current pick.
  populateFinish(state.labelType, document.getElementById('finish')?.value || '');
  updatePaperVisibility();
}
// Finish options depend on the print type. Nothing is pre-selected unless `selectVal`
// is passed (used when restoring a saved order) and is valid for the print type.
function populateFinish(printType, selectVal) {
  const sel = document.getElementById('finish');
  if (!sel) return;
  const opts = (window.__FINISHES && window.__FINISHES[printType]) || [];
  const keep = selectVal && opts.indexOf(selectVal) !== -1;
  sel.innerHTML = `<option value="" disabled${keep ? '' : ' selected'} hidden>${escHtml(T.finish_ph || 'Choose finish…')}</option>` +
    opts.map(o => `<option value="${escHtml(o)}"${o === selectVal ? ' selected' : ''}>${escHtml(o)}</option>`).join('');
  sel.classList.remove('error');
}
// Paper applies to the "Label" print type only. Nothing is pre-selected unless a
// valid `selectVal` is passed (used when restoring a saved order).
function populatePaper(selectVal) {
  const sel = document.getElementById('paper');
  if (!sel) return;
  const opts = window.__PAPERS || [];
  const keep = selectVal && opts.indexOf(selectVal) !== -1;
  sel.innerHTML = `<option value="" disabled${keep ? '' : ' selected'} hidden>${escHtml(T.paper_ph || 'Choose paper…')}</option>` +
    opts.map(o => `<option value="${escHtml(o)}"${o === selectVal ? ' selected' : ''}>${escHtml(o)}</option>`).join('');
  sel.classList.remove('error');
}
// Show/hide the paper column only; Finish stays visible in the same row regardless.
function updatePaperVisibility() {
  const paperField = document.getElementById('paper-field');
  if (!paperField) return;
  const show = state.labelType === 'Label';
  paperField.hidden = !show;
  if (!show) {
    const sel = document.getElementById('paper');
    if (sel) { sel.value = ''; sel.classList.remove('error'); }
    document.getElementById('err-paper')?.classList.remove('show');
  }
}
// Hide/omit the deposit mark when the exempt region (e.g. Border) is chosen
function updatePantmaerke() {
  const card = document.getElementById('pantmaerke-card');
  if (!card) return;
  const exempt = state.region && state.region.toLowerCase() === String(PANT_EXEMPT).toLowerCase();
  card.classList.toggle('hidden', exempt);
}

// ── Toggles ──
function toggleLegal() {
  const toggle = document.getElementById('legal-toggle');
  const active = toggle.classList.toggle('active');
  document.getElementById('legal-expand').classList.toggle('show', active);
  if (active) document.getElementById('consent-error').classList.remove('visible');
}
function toggleArtwork() {
  state.artwork = !state.artwork;
  document.getElementById('artwork-toggle').classList.toggle('active', state.artwork);
}
function toggleSmash() {
  state.smash = !state.smash;
  document.getElementById('smash-toggle').classList.toggle('active', state.smash);
}

// ── File uploads (direct to Supabase Storage via signed URL) ──
const MAX_UPLOAD = 50 * 1024 * 1024;
const UPLOAD_SLOTS = ['cutterguide', 'ingredients', 'additional', 'artwork'];
// Translation keys + fallbacks for each upload category header (review + flow).
const UPLOAD_SLOT_LABEL_KEY = { cutterguide: 'upload_cat_cutterguide', ingredients: 'upload_cat_ingredients', additional: 'upload_cat_additional', artwork: 'upload_cat_artwork' };
const UPLOAD_SLOT_FALLBACK = { cutterguide: 'Cutterguide', ingredients: 'Ingredients & nutrition', additional: 'Additional information', artwork: 'Artwork' };
// Group uploaded files under their slot, keeping the slot display order.
function groupUploadsBySlot(files) {
  return UPLOAD_SLOTS
    .map(slot => ({
      label: T[UPLOAD_SLOT_LABEL_KEY[slot]] || UPLOAD_SLOT_FALLBACK[slot],
      files: files.filter(f => (UPLOAD_SLOTS.indexOf(f.slot) !== -1 ? f.slot : 'artwork') === slot),
    }))
    .filter(g => g.files.length);
}
// Open the file picker for a given slot so the files attach (and display) there.
function pickFiles(slot) {
  window.__uploadSlot = slot;
  document.getElementById('file-input').click();
}
async function handleFiles(input) {
  const slot = UPLOAD_SLOTS.indexOf(window.__uploadSlot) !== -1 ? window.__uploadSlot : 'artwork';
  const files = Array.from(input.files || []);
  input.value = '';
  for (const file of files) {
    if (file.size > MAX_UPLOAD) { showToast(file.name + ' ' + (T.upload_exceeds || 'exceeds 50 MB'), 'error'); continue; }
    showToast((T.upload_uploading || 'Uploading') + ' ' + file.name + '…', '');
    try {
      const r = await fetch('/api/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      const put = await fetch(d.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file });
      if (!put.ok) throw new Error('Upload failed (' + put.status + ')');
      uploadedFiles.push({ path: d.path, name: file.name, size: file.size, slot });
      renderUploads();
      showToast(file.name + ' ' + (T.upload_uploaded || 'uploaded'), 'success');
    } catch (e) {
      showToast((T.upload_error || 'Could not upload') + ' ' + file.name + ': ' + e.message, 'error');
    }
  }
}
function removeUpload(i) { uploadedFiles.splice(i, 1); renderUploads(); }
// Render each uploaded file as an icon card in the box belonging to the button it
// was attached with (cutterguide / ingredients / additional / artwork).
function renderUploads() {
  const buckets = {};
  UPLOAD_SLOTS.forEach(s => { buckets[s] = ''; });
  uploadedFiles.forEach((f, i) => {
    const slot = buckets.hasOwnProperty(f.slot) ? f.slot : 'artwork';
    buckets[slot] += `<div class="upload-card">${fileVisual(f)}<div class="rv-file-info"><div class="rv-file-name">${escHtml(f.name)}</div>${f.size ? `<div class="rv-file-size">${fmtSize(f.size)}</div>` : ''}</div><button type="button" class="upload-remove" onclick="removeUpload(${i})" aria-label="Remove">×</button></div>`;
  });
  UPLOAD_SLOTS.forEach(s => { const c = document.getElementById('upload-list-' + s); if (c) c.innerHTML = buckets[s]; });
}

// ── Validation ──
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function flashError() {
  const btn = document.querySelector('.review-order-btn');
  if (btn) { btn.classList.remove('btn-shake'); void btn.offsetWidth; btn.classList.add('btn-shake'); btn.addEventListener('animationend', () => btn.classList.remove('btn-shake'), { once: true }); }
  const overlay = document.getElementById('legal-overlay');
  if (overlay) { overlay.classList.remove('flash'); void overlay.offsetWidth; overlay.classList.add('flash'); }
}
function validate() {
  let ok = true;
  [
    { id: 'butiksnavn', err: 'err-butiksnavn' },
    { id: 'bestiller_navn', err: 'err-bestiller_navn' },
    { id: 'bestiller_email', err: 'err-bestiller_email' },
  ].forEach(({ id, err }) => {
    const el = document.getElementById(id);
    const errEl = document.getElementById(err);
    const val = el ? el.value.trim() : '';
    const invalid = id === 'bestiller_email' ? !isValidEmail(val) : !val;
    el.classList.toggle('error', invalid);
    if (errEl) errEl.classList.toggle('show', invalid);
    if (invalid) ok = false;
  });

  // Brand: a tile (including "I don't know yet") must be selected
  const brandPicked = !!document.querySelector('.brand-tile.selected');
  document.getElementById('err-brand')?.classList.toggle('show', !brandPicked);
  if (!brandPicked) ok = false;

  // Size required
  if (!state.size) { document.getElementById('err-size')?.classList.add('show'); ok = false; }
  else document.getElementById('err-size')?.classList.remove('show');

  // Finish required (no longer pre-selected)
  const finishSel = document.getElementById('finish');
  const finishMissing = !finishSel || !finishSel.value;
  finishSel?.classList.toggle('error', finishMissing);
  document.getElementById('err-finish')?.classList.toggle('show', finishMissing);
  if (finishMissing) ok = false;

  // Paper required when the print type is Label (the field is hidden for Can)
  const paperField = document.getElementById('paper-field');
  const paperSel = document.getElementById('paper');
  if (paperField && !paperField.hidden) {
    const paperMissing = !paperSel || !paperSel.value;
    paperSel?.classList.toggle('error', paperMissing);
    document.getElementById('err-paper')?.classList.toggle('show', paperMissing);
    if (paperMissing) ok = false;
  } else {
    paperSel?.classList.remove('error');
    document.getElementById('err-paper')?.classList.remove('show');
  }

  // GDPR consent
  const legalActive = document.getElementById('legal-toggle').classList.contains('active');
  document.getElementById('consent-error').classList.toggle('visible', !legalActive);
  if (!legalActive) ok = false;

  if (!ok) flashError();
  return ok;
}

// ── Collect the can brief ──
function collectPayload() {
  const variantSel = document.getElementById('variant');
  let variant = '';
  if (variantSel && variantSel.value) variant = variantSel.value === '__unknown__' ? (T.brand_unknown || "I don't know yet") : variantSel.value;

  const exempt = state.region && state.region.toLowerCase() === String(PANT_EXEMPT).toLowerCase();
  const pantmaerke = exempt ? false : !!document.getElementById('pantmaerke')?.checked;

  return {
    butiksnavn:    g('butiksnavn'),
    navn:          g('bestiller_navn'),
    email:         g('bestiller_email'),
    delivery_date: g('delivery_date') || null,

    brand:         state.brandUnknown ? (T.brand_unknown || "I don't know yet") : state.brand,
    variant,
    size:          state.size,
    region:        state.region,
    label_type:    state.labelType,
    cutterguide:   g('cutterguide'),
    finish:        g('finish'),
    paper:         g('paper'),
    energy_kj:     g('energy_kj'),
    energy_kcal:   g('energy_kcal'),
    units:         g('units'),
    material_old:  g('material_old'),
    material_new:  g('material_new'),
    ean:           g('ean'),
    pantmaerke,
    ingredients:   serializeRich(document.getElementById('ingredients')),

    andet:         g('andet'),
    artwork_help:  state.artwork,
    smash_link:    state.smash,
    uploads:       uploadedFiles,

    previous_id:   window.__editId || null,
    language:      LANG,
  };
}

// ── Review popup ──
function rvRow(label, val, cls) {
  const v = (val == null || val === '') ? (T.rv_none || '—') : val;
  return `<div class="rv-row${cls && cls.full ? ' full' : ''}"><div class="rv-label">${escHtml(label)}</div><div class="rv-val${cls && cls.mod ? ' ' + cls.mod : ''}">${cls && cls.html ? v : escHtml(v)}</div></div>`;
}

function goToReview() {
  if (!validate()) return;
  const p = collectPayload();
  const exempt = p.region && p.region.toLowerCase() === String(PANT_EXEMPT).toLowerCase();
  const energyStr = [p.energy_kj && (p.energy_kj + ' kJ'), p.energy_kcal && (p.energy_kcal + ' kcal')].filter(Boolean).join(' / ');

  const orderer = [
    rvRow(T.f_campaign || 'Campaign', p.butiksnavn),
    rvRow(T.f_name || 'Name', p.navn),
    rvRow(T.f_email || 'Email', p.email, { full: true, mod: 'mono' }),
    rvRow(T.f_deadline || 'Deadline', p.delivery_date ? fmtDate(p.delivery_date) : null),
  ].join('');

  const can = [
    rvRow(T.f_brand || 'Brand', p.brand),
    rvRow(T.f_variant || 'Variant', p.variant),
    rvRow(T.f_size || 'Size', p.size),
    rvRow(T.f_region || 'Region', p.region),
    rvRow(T.f_label_type || 'Label type', p.label_type),
    (p.paper ? rvRow(T.f_paper || 'Paper', p.paper) : ''),
    rvRow(T.f_finish || 'Finish', p.finish),
    rvRow(T.f_energy || 'Energy / 100 ml', energyStr),
    rvRow(T.f_units || 'Number of units', p.units),
    rvRow(T.f_cutterguide || 'Cutterguide', p.cutterguide, { full: true }),
  ].join('');

  const production = [
    rvRow(T.f_material_old || 'Material no. (old)', p.material_old),
    rvRow(T.f_material_new || 'Material no. (new)', p.material_new),
    rvRow(T.f_ean || 'EAN', p.ean),
    exempt ? '' : rvRow(T.f_pantmaerke || 'Deposit mark', p.pantmaerke ? (T.rv_yes || 'Yes') : (T.rv_no || 'No')),
    p.ingredients ? rvRow(T.f_ingredients || 'Ingredients', richToSafeHtml(p.ingredients), { full: true, mod: 'pre', html: true }) : '',
    (p.ingredients && extractBold(p.ingredients).length) ? rvRow(T.f_ingredients_marked || 'Marked in bold', extractBold(p.ingredients).join(', '), { full: true }) : '',
  ].join('');

  const additional = p.andet ? `<div class="rv-row full"><div class="rv-val pre">${escHtml(p.andet)}</div></div>` : '';

  let artwork = '';
  if (p.artwork_help) artwork += rvRow(T.f_artwork || 'Artwork', T.rv_help_requested || 'Help requested', { full: true });
  if (p.smash_link) artwork += rvRow(T.f_smash || 'Smash upload link', T.rv_smash_requested || 'Requested', { full: true });

  let html =
    `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_orderer || 'Orderer')}</div><div class="rv-grid">${orderer}</div></div>` +
    `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_can || 'Can brief')}</div><div class="rv-grid">${can}</div></div>` +
    `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_production || 'Production details')}</div><div class="rv-grid">${production}</div></div>`;

  if (additional) html += `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_additional || 'Additional information')}</div><div class="rv-grid">${additional}</div></div>`;

  if (artwork) html += `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_artwork_section || 'Artwork')}</div><div class="rv-grid">${artwork}</div></div>`;

  if (uploadedFiles.length) {
    const groupsHtml = groupUploadsBySlot(uploadedFiles).map(g =>
      `<div class="rv-files-group"><div class="rv-files-cat">${escHtml(g.label)}</div><div class="rv-files-grid">${g.files.map(fileCardHtml).join('')}</div></div>`
    ).join('');
    html += `<div class="rv-section"><div class="rv-section-label">${escHtml(T.review_files || 'Attached files')}</div>${groupsHtml}</div>`;
  }

  document.getElementById('rv-body').innerHTML = html;
  openModal();
  setPill(2);
}

function openModal() { document.getElementById('review-modal').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal() { document.getElementById('review-modal').classList.remove('open'); document.body.style.overflow = ''; }
function goBack() { closeModal(); setPill(1); }

// ── File card rendering for review ──
function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(LANG === 'da' ? 'da-DK' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function makeBadge(ext, bg, color) { const el = document.createElement('div'); el.className = 'rv-file-badge'; el.style.background = bg; el.style.color = color; el.textContent = ext.slice(0, 4) || '?'; return el; }
// Build the visual (image thumbnail or coloured extension badge) for a file.
// Shared by the review modal cards and the per-section upload boxes.
function fileVisual(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tif', 'tiff'].includes(ext);
  const supaUrl = (window.__SUPABASE_URL || '').replace(/\/+$/, '');
  const pubUrl = supaUrl ? `${supaUrl}/storage/v1/object/public/order-uploads/${f.path}` : '';
  const BADGE = {
    pdf: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    ai: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' }, eps: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' }, svg: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    psd: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' }, indd: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    zip: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  };
  const imgBadge = { bg: 'rgba(158,214,184,0.14)', color: '#9ed6b8' };
  const defBadge = { bg: 'var(--surface-3)', color: 'var(--text-3)' };
  const badge = isImg ? imgBadge : (BADGE[ext] || defBadge);
  return (isImg && pubUrl)
    ? `<img class="rv-file-thumb" src="${pubUrl}" alt="${escHtml(f.name)}" onerror="this.replaceWith(makeBadge('${ext}','${badge.bg}','${badge.color}'))"/>`
    : `<div class="rv-file-badge" style="background:${badge.bg};color:${badge.color};">${escHtml(ext.slice(0, 4) || '?')}</div>`;
}
function fileCardHtml(f) {
  return `<div class="rv-file-card">${fileVisual(f)}<div class="rv-file-info"><div class="rv-file-name">${escHtml(f.name)}</div>${f.size ? `<div class="rv-file-size">${fmtSize(f.size)}</div>` : ''}</div></div>`;
}

// ── Submit ──
async function submitOrder() {
  const btn = document.querySelector('#review-modal .btn-primary');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = (T.toast_sending || 'Sending…');

  const payload = collectPayload();
  try {
    const res = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    window.__submittedOrderId = data.orderId;
    document.getElementById('conf-email').textContent = payload.email;
    closeModal();
    showView('view-confirm'); setPill(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(T.toast_submitted || 'Order submitted! Check your email.', 'success');

    window.__editId = null;
    window.history.replaceState({}, '', '/');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

function editSubmittedOrder() {
  if (window.__submittedOrderId) window.location.href = '/?edit=' + window.__submittedOrderId;
  else { showView('view-form'); setPill(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}

// Duplicate the order just placed: open the order form pre-filled as a
// brand-new order (nothing is sent yet) so the customer can adjust the details
// and then submit it as a new order. Uses the ?copy= flow → previous_id stays
// null, so it never bumps a revision or cancels the original.
function duplicateOrder() {
  if (window.__submittedOrderId) window.location.href = '/?copy=' + window.__submittedOrderId;
  else { showView('view-form'); setPill(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}

let __closeTimer = null;
function closePage() {
  const overlay = document.getElementById('close-overlay');
  const countEl = document.getElementById('close-count');
  let n = 5;
  countEl.textContent = n;
  overlay.classList.add('open');
  __closeTimer = setInterval(() => {
    n -= 1;
    countEl.textContent = Math.max(n, 0);
    if (n <= 0) {
      clearInterval(__closeTimer); __closeTimer = null;
      window.location.href = '/godkendt';
    }
  }, 1000);
}
function cancelAutoClose() {
  if (__closeTimer) { clearInterval(__closeTimer); __closeTimer = null; }
  document.getElementById('close-overlay').classList.remove('open');
  editSubmittedOrder();
}

// ── Prefill from ?edit= (when a customer edits via the email link) ──
async function prefillFromOrder(orderId, asCopy = false) {
  try {
    const res = await fetch('/api/order-data?id=' + orderId);
    if (!res.ok) return;
    const d = await res.json();
    // Copy → keep __editId null so the submit creates a brand-new order
    // (no revision bump, the source order is not cancelled).
    window.__editId = asCopy ? null : orderId;

    if (d.butiksnavn) document.getElementById('butiksnavn').value = d.butiksnavn;
    if (d.navn) document.getElementById('bestiller_navn').value = d.navn;
    if (d.email) document.getElementById('bestiller_email').value = d.email;
    if (d.delivery_date) document.getElementById('delivery_date').value = d.delivery_date;

    // Brand + variant
    if (d.brand != null) {
      const unknownText = (T.brand_unknown || "I don't know yet");
      let tile = null;
      if (d.brand && d.brand !== unknownText) {
        tile = Array.from(document.querySelectorAll('.brand-tile')).find(t => t.dataset.brand === d.brand);
      }
      if (!tile) tile = document.querySelector('.brand-tile.unknown');
      if (tile) selectBrand(tile);
      if (d.variant) {
        const sel = document.getElementById('variant');
        if (d.variant === unknownText) sel.value = '__unknown__';
        else if (Array.from(sel.options).some(o => o.value === d.variant)) sel.value = d.variant;
        state.variant = sel.value;
      }
    }

    // Size
    if (d.size) { const c = Array.from(document.querySelectorAll('#size-chips .size-chip')).find(x => x.dataset.size === d.size); if (c) selectSize(c); }
    // Region
    if (d.region) { const b = Array.from(document.querySelectorAll('#region-seg .seg-btn')).find(x => x.dataset.region === d.region); if (b) selectRegion(b); }
    // Print type (legacy "Tryk" orders map to "Can")
    if (d.label_type) { const lt = d.label_type === 'Tryk' ? 'Can' : d.label_type; const b = Array.from(document.querySelectorAll('#labeltype-seg .seg-btn')).find(x => x.dataset.labeltype === lt); if (b) selectLabelType(b); }
    // Finish — repopulate for the current print type and restore the saved value if valid
    if (d.finish) populateFinish(state.labelType, d.finish);
    // Paper — show/hide for the current print type and restore the saved value if present
    updatePaperVisibility();
    if (d.paper) populatePaper(d.paper);

    if (d.cutterguide) document.getElementById('cutterguide').value = d.cutterguide;
    if (d.energy_kj) document.getElementById('energy_kj').value = d.energy_kj;
    if (d.energy_kcal) document.getElementById('energy_kcal').value = d.energy_kcal;
    if (d.units) document.getElementById('units').value = d.units;
    if (d.material_old) document.getElementById('material_old').value = d.material_old;
    if (d.material_new) document.getElementById('material_new').value = d.material_new;
    if (d.ean) document.getElementById('ean').value = d.ean;
    const pant = document.getElementById('pantmaerke'); if (pant) pant.checked = !!d.pantmaerke;
    const ingEl = document.getElementById('ingredients');
    if (ingEl) { ingEl.innerHTML = d.ingredients ? richToSafeHtml(d.ingredients) : ''; updateMarked(); }
    if (d.andet) { const aEl = document.getElementById('andet'); if (aEl) aEl.value = d.andet; }

    if (d.artwork_help && !state.artwork) toggleArtwork();
    if (d.smash_link && !state.smash) toggleSmash();
    if (Array.isArray(d.uploads)) { uploadedFiles = d.uploads.map(f => ({ ...f, slot: f.slot || 'artwork' })); renderUploads(); }

    updatePantmaerke();
    showToast(asCopy ? (T.toast_order_copied || 'Order copied — review and submit as a new order.')
                     : (T.toast_order_loaded || 'Order loaded — edit and resubmit'), '');
  } catch (err) {
    console.error('Prefill error:', err);
  }
}

// ── Helpers ──
function showView(id) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function setPill(n) { document.querySelectorAll('.step-pill').forEach((p, i) => { p.classList.remove('active', 'done'); if (i + 1 < n) p.classList.add('done'); else if (i + 1 === n) p.classList.add('active'); }); }
function showToast(msg, type = '') { const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast ' + (type === 'success' ? 'success' : type === 'error' ? 'error-t' : ''); t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3500); }

function setLang(l) { document.cookie = 'lang=' + l + ';path=/;max-age=31536000;SameSite=Lax'; location.reload(); }

// Prefill name/email and pre-accept the GDPR consent for a logged-in customer.
// Only fills empty fields, so an edit/copy prefill can still override afterwards.
function prefillFromAccount() {
  const me = window.__ME;
  if (!me) return;
  const emailEl = document.getElementById('bestiller_email');
  const nameEl = document.getElementById('bestiller_navn');
  if (me.email && emailEl && !emailEl.value) emailEl.value = me.email;
  if (me.name && nameEl && !nameEl.value) nameEl.value = me.name;
  const toggle = document.getElementById('legal-toggle');
  if (toggle && !toggle.classList.contains('active')) {
    toggle.classList.add('active');
    document.getElementById('consent-error').classList.remove('visible');
  }
}

// ── Onboarding tour ──
// A lightweight, dependency-free guided walkthrough. Each step anchors onto an
// existing element; a "spotlight" (a div with a huge box-shadow) dims everything
// else while a tooltip explains the field/flow. Texts come from window.__T.
const TOUR_STEPS = [
  { sel: '.step-pills',       title: 'tour_s1_title', body: 'tour_s1_body', pad: 8 },
  { sel: '#butiksnavn',       title: 'tour_s2_title', body: 'tour_s2_body' },
  { sel: '#brand-grid',       title: 'tour_s3_title', body: 'tour_s3_body' },
  { sel: '#size-chips',       title: 'tour_s4_title', body: 'tour_s4_body' },
  { sel: '#ingredients',      title: 'tour_s5_title', body: 'tour_s5_body' },
  { sel: '#andet',            title: 'tour_s6_title', body: 'tour_s6_body' },
  { sel: '#artwork-toggle',   title: 'tour_s7_title', body: 'tour_s7_body' },
  { sel: '.review-order-btn', title: 'tour_s8_title', body: 'tour_s8_body' },
];
let __tourIdx = 0;
let __tourEls = null;

function tourBuild() {
  if (__tourEls) return __tourEls;
  const overlay = document.createElement('div');
  overlay.id = 'tour-overlay';
  const spot = document.createElement('div');
  spot.id = 'tour-spot';
  const pop = document.createElement('div');
  pop.id = 'tour-pop';
  pop.innerHTML =
    '<div id="tour-pop-step"></div>' +
    '<div id="tour-pop-title"></div>' +
    '<div id="tour-pop-body"></div>' +
    '<div id="tour-pop-actions">' +
      '<button type="button" id="tour-skip" class="tour-btn-text"></button>' +
      '<span style="flex:1"></span>' +
      '<button type="button" id="tour-prev" class="tour-btn-2"></button>' +
      '<button type="button" id="tour-next" class="tour-btn-1"></button>' +
    '</div>';
  overlay.appendChild(spot);
  overlay.appendChild(pop);
  document.body.appendChild(overlay);
  pop.querySelector('#tour-skip').addEventListener('click', endTour);
  pop.querySelector('#tour-prev').addEventListener('click', () => tourGoto(__tourIdx - 1));
  pop.querySelector('#tour-next').addEventListener('click', () => {
    if (__tourIdx >= TOUR_STEPS.length - 1) endTour();
    else tourGoto(__tourIdx + 1);
  });
  __tourEls = { overlay, spot, pop };
  return __tourEls;
}

function tourPlace() {
  if (!__tourEls || !__tourEls.overlay.classList.contains('open')) return;
  const el = document.querySelector(TOUR_STEPS[__tourIdx].sel);
  if (!el) return;
  const { spot, pop } = __tourEls;
  const r = el.getBoundingClientRect();
  const pad = TOUR_STEPS[__tourIdx].pad != null ? TOUR_STEPS[__tourIdx].pad : 6;
  const top = Math.max(r.top - pad, 4);
  const left = Math.max(r.left - pad, 4);
  const w = Math.min(r.width + pad * 2, window.innerWidth - left - 4);
  const h = r.height + pad * 2;
  spot.style.top = top + 'px';
  spot.style.left = left + 'px';
  spot.style.width = w + 'px';
  spot.style.height = h + 'px';
  // Place the tooltip below the target if there's room, otherwise above.
  const popH = pop.offsetHeight || 170;
  const popW = pop.offsetWidth || 320;
  let pTop = (top + h + 14 + popH < window.innerHeight) ? top + h + 14
           : (top - 14 - popH > 0) ? top - 14 - popH
           : Math.max(window.innerHeight - popH - 8, 8);
  let pLeft = Math.min(left, window.innerWidth - popW - 8);
  if (pLeft < 8) pLeft = 8;
  pop.style.top = pTop + 'px';
  pop.style.left = pLeft + 'px';
}

function tourGoto(i) {
  __tourIdx = Math.max(0, Math.min(i, TOUR_STEPS.length - 1));
  const step = TOUR_STEPS[__tourIdx];
  const { pop } = tourBuild();
  const el = document.querySelector(step.sel);
  if (!el) { // target missing → skip forward (or finish)
    if (__tourIdx < TOUR_STEPS.length - 1) return tourGoto(__tourIdx + 1);
    return endTour();
  }
  pop.querySelector('#tour-pop-step').textContent = (T.tour_step || 'Step {n} of {total}').replace('{n}', __tourIdx + 1).replace('{total}', TOUR_STEPS.length);
  pop.querySelector('#tour-pop-title').textContent = T[step.title] || '';
  pop.querySelector('#tour-pop-body').textContent = T[step.body] || '';
  pop.querySelector('#tour-skip').textContent = T.tour_skip || 'Skip';
  const prevBtn = pop.querySelector('#tour-prev');
  prevBtn.textContent = T.tour_prev || 'Back';
  prevBtn.style.display = __tourIdx === 0 ? 'none' : '';
  pop.querySelector('#tour-next').textContent = __tourIdx >= TOUR_STEPS.length - 1 ? (T.tour_done || 'Done') : (T.tour_next || 'Next');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(tourPlace, 340);
}

function startTour() {
  tourBuild();
  __tourEls.overlay.classList.add('open');
  tourGoto(0);
}

function endTour() {
  if (__tourEls) __tourEls.overlay.classList.remove('open');
  try { localStorage.setItem('bs_tour_done', '1'); } catch (e) {}
}

window.startTour = startTour;
window.addEventListener('resize', tourPlace);
window.addEventListener('scroll', tourPlace, true);

// ── Init ──
(function init() {
  const btn = document.getElementById('lang-' + LANG);
  if (btn) btn.classList.add('active');

  document.getElementById('pill-1').addEventListener('click', () => {
    if (document.getElementById('pill-1').classList.contains('done')) goBack();
  });

  // Read server-rendered default selections into state
  state.region = document.querySelector('#region-seg .seg-btn.selected')?.dataset.region || '';
  state.labelType = document.querySelector('#labeltype-seg .seg-btn.selected')?.dataset.labeltype || '';
  populateFinish(state.labelType);
  populatePaper();
  updatePaperVisibility();
  updatePantmaerke();

  // Ingredients rich-text: live marked list + bold-button state
  const ingEl = document.getElementById('ingredients');
  if (ingEl) {
    ingEl.addEventListener('input', updateMarked);
    ingEl.addEventListener('blur', updateMarked);
    document.addEventListener('selectionchange', () => { if (document.activeElement === ingEl) refreshBoldBtn(); });
    updateMarked();
  }

  // Close modal on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('review-modal').classList.contains('open')) goBack(); });

  // Prefill from the logged-in account first; an edit/copy below may override.
  prefillFromAccount();

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  const copyId = params.get('copy');
  if (editId) prefillFromOrder(editId);
  else if (copyId) prefillFromOrder(copyId, true);

  // Auto-start the onboarding tour for first-time visitors (not when editing/copying).
  let tourDone = true;
  try { tourDone = !!localStorage.getItem('bs_tour_done'); } catch (e) {}
  if (!tourDone && !editId && !copyId) setTimeout(startTour, 600);
})();
