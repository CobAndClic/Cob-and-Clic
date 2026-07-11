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

/* ====== FORMULAIRE DE CONTACT : envoi direct vers Cob & Clic ====== */
(function () {
  const form = document.getElementById('contact-request-form');
  if (!form) return;

  const endpoint = form.dataset.formsubmitEndpoint;
  const submitButton = document.getElementById('contact_submit');
  const statusElement = document.getElementById('contact-form-status');
  const subjectInput = document.getElementById('contact_subject');
  const slotInput = document.getElementById('contact_planner_slot');
  const rateInput = document.getElementById('contact_planner_rate');
  const noteInput = document.getElementById('contact_planner_note');

  function setStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = `form-status is-visible ${type}`;
    statusElement.focus({ preventScroll: true });
  }

  function updatePlannerFields() {
    const plannerDate = document.getElementById('planner_date')?.value || '';
    const plannerTime = document.getElementById('planner_time')?.value || '';
    const plannerRate = document.getElementById('planner_rate')?.textContent?.trim() || '';
    const plannerNote = document.getElementById('planner_note')?.textContent?.trim() || '';

    slotInput.value =
      plannerDate && plannerTime
        ? `${plannerDate} à ${plannerTime}`
        : 'Non renseigné';

    rateInput.value =
      plannerRate && plannerRate !== '-'
        ? plannerRate
        : 'Non renseigné';

    noteInput.value =
      plannerNote && plannerNote !== '-'
        ? plannerNote
        : 'Non renseigné';
  }

  const query = new URLSearchParams(window.location.search);
  if (query.get('envoi') === 'ok') {
    setStatus(
      'Votre demande a bien été envoyée à Cob & Clic. Vous recevrez une réponse dès que possible.',
      'success'
    );

    query.delete('envoi');
    const cleanQuery = query.toString();
    const cleanUrl =
      window.location.pathname +
      (cleanQuery ? `?${cleanQuery}` : '') +
      window.location.hash;

    window.history.replaceState({}, '', cleanUrl);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const honeyPot = form.querySelector('[name="_honey"]');
    if (honeyPot?.value) return;

    updatePlannerFields();

    const selectedService =
      document.getElementById('service_type')?.value || 'Intervention';
    subjectInput.value = `Demande Cob & Clic – ${selectedService}`;

    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Envoi en cours…';
    setStatus('Envoi de votre demande en cours…', 'pending');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: new FormData(form)
      });

      let responseData = {};
      try {
        responseData = await response.json();
      } catch (_) {
        responseData = {};
      }

      if (!response.ok || responseData.success === false) {
        throw new Error(
          responseData.message || 'Le service de formulaire a refusé la demande.'
        );
      }

      form.reset();
      setStatus(
        'Votre demande a bien été envoyée à Cob & Clic. Vous recevrez une réponse dès que possible.',
        'success'
      );
    } catch (error) {
      console.error('Échec de l’envoi du formulaire :', error);
      setStatus(
        'L’envoi automatique n’a pas abouti. Réessayez dans quelques instants, écrivez à contact@cobandclic.fr ou appelez le 07 81 02 51 18.',
        'error'
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });
})();