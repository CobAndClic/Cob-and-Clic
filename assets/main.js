/* ====== MENU HAMBURGER ====== */
(function () {
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!btn || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeOnOutside(e) {
    if (!nav.contains(e.target) && !btn.contains(e.target)) {
      setOpen(false);
      document.removeEventListener('click', closeOnOutside);
    }
  }

  btn.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    setOpen(open);
    if (open) setTimeout(() => document.addEventListener('click', closeOnOutside), 0);
  });

  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') setOpen(false);
  });
})();

/* ====== PLANNER (créneaux 24/24, no past) ====== */
(function () {
  const root = document.getElementById('planner');
  if (!root) return;

  const profileSel = root.querySelector('[name="planner_profile"]');
  const dateInp    = document.getElementById('planner_date');
  const timeSel    = document.getElementById('planner_time');
  const urgentChk  = root.querySelector('[name="planner_urgent"]');
  const rateEl     = document.getElementById('planner_rate');
  const noteEl     = document.getElementById('planner_note');
  const hiddenIso  = root.querySelector('[name="planner_datetime"]');

  const pad = (n) => String(n).padStart(2, '0');
  const localDateStr = (date = new Date()) => {
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return `${y}-${m}-${d}`;
  };

  function getNextHalfHour(now = new Date()) {
    const n = new Date(now);
    n.setSeconds(0, 0);
    const m = n.getMinutes();
    if (m < 30) n.setMinutes(30);
    else { n.setMinutes(0); n.setHours(n.getHours() + 1); }
    return n;
  }

  function buildTimesForDate(dateStrVal) {
    const now = new Date();
    const today = localDateStr(now);
    let startH = 0, startM = 0;

    if (dateStrVal === today) {
      const next = getNextHalfHour(now);
      if (localDateStr(next) !== today) {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        dateInp.value = localDateStr(tomorrow);
      } else {
        startH = next.getHours();
        startM = next.getMinutes();
      }
    }

    const opts = [];
    for (let h = startH; h < 24; h++) {
      const minutes = (h === startH && startM === 30) ? [30] : [0, 30];
      for (const m of minutes) opts.push(`${pad(h)}:${pad(m)}`);
    }

    timeSel.innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join('');
    if (opts.length) timeSel.value = opts[0];
  }

  function compute() {
    const dateStrVal = dateInp.value;
    const timeStrVal = timeSel.value;
    if (!dateStrVal || !timeStrVal) {
      rateEl.textContent = '—';
      noteEl.textContent = 'Sélectionnez date et heure.';
      return;
    }

    if (dateStrVal === localDateStr()) {
      const selected = new Date(`${dateStrVal}T${timeStrVal}:00`);
      if (selected <= new Date()) buildTimesForDate(dateStrVal);
    }

    const isParticulier = profileSel.value === 'particulier';
    const base = isParticulier ? 70 : 90;
    const label = isParticulier ? 'TTC' : 'HT';

    const [hh] = timeStrVal.split(':').map(Number);
    const chosen = new Date(`${dateStrVal}T${timeStrVal}:00`);
    if (hiddenIso) hiddenIso.value = chosen.toISOString();

    let maj = 0;
    if (hh >= 20 && hh < 23) maj = 0.25;
    else if (hh >= 23 || hh < 6) maj = 0.50;
    else if (hh >= 6 && hh < 8) maj = 0.25;

    const urg = urgentChk.checked ? 0.25 : 0;
    const price = base * (1 + maj + urg);
    rateEl.textContent = `${price.toFixed(2)} € / h ${label}`;

    const notes = [];
    if (maj === 0.25 && hh >= 20 && hh < 23) notes.push('+25% soir 20–23');
    if (maj === 0.50) notes.push('+50% nuit 23–06');
    if (maj === 0.25 && hh >= 6 && hh < 8) notes.push('+25% matin 06–08');
    if (urg) notes.push('+25% urgence');
    if (!notes.length) notes.push('Créneau standard');
    noteEl.textContent = notes.join(' · ');
  }

  const today = localDateStr();
  dateInp.min = today;
  dateInp.value = today;
  buildTimesForDate(today);
  compute();

  dateInp.addEventListener('change', () => { buildTimesForDate(dateInp.value); compute(); });
  timeSel.addEventListener('change', compute);
  profileSel.addEventListener('change', compute);
  urgentChk.addEventListener('change', compute);
})();

/* ====== FORMULAIRE STATIQUE : prépare un e-mail ====== */
function handleContact(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const to = form.dataset.contactEmail || 'contact@cobandclic.fr';

  const plannerDate = document.getElementById('planner_date')?.value || '';
  const plannerTime = document.getElementById('planner_time')?.value || '';
  const plannerRate = document.getElementById('planner_rate')?.textContent || '';
  const plannerNote = document.getElementById('planner_note')?.textContent || '';

  const subject = `Demande Cob & Clic - ${data.get('service_type') || 'Intervention'}`;
  const body = [
    'Bonjour Cob & Clic,',
    '',
    'Je souhaite vous contacter pour la demande suivante :',
    '',
    `Nom : ${data.get('customer_name') || ''}`,
    `Email : ${data.get('customer_email') || ''}`,
    `Téléphone : ${data.get('customer_phone') || ''}`,
    `Profil : ${data.get('customer_profile') || ''}`,
    `Besoin : ${data.get('service_type') || ''}`,
    '',
    plannerDate && plannerTime ? `Créneau souhaité : ${plannerDate} à ${plannerTime}` : '',
    plannerRate ? `Estimation : ${plannerRate} (${plannerNote})` : '',
    '',
    'Message :',
    data.get('customer_message') || '',
    '',
    'Cordialement,'
  ].filter(Boolean).join('\n');

  window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
