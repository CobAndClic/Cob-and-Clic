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

/* ====== PLANNER OPTIONNEL ====== */
(function () {
  const form = document.getElementById('contact-request-form');
  const root = document.getElementById('planner');
  const requestType = document.getElementById('request_type');
  const serviceType = document.getElementById('service_type');
  if (!form || !root || !requestType || !serviceType) return;

  const profileSel = document.getElementById('planner_profile');
  const customerProfile = document.getElementById('customer_profile');
  const dateInp = document.getElementById('planner_date');
  const timeSel = document.getElementById('planner_time');
  const urgentChk = document.getElementById('planner_urgent');
  const rateEl = document.getElementById('planner_rate');
  const noteEl = document.getElementById('planner_note');
  const urgentHelpEl = document.getElementById('planner_urgent_help');
  const urgentLabelEl = document.getElementById('planner_urgent_label');
  const serviceHelpEl = document.getElementById('service_type_help');

  const slotInput = document.getElementById('contact_planner_slot');
  const rateInput = document.getElementById('contact_planner_rate');
  const noteInput = document.getElementById('contact_planner_note');

  const appointmentValue = 'Demande d’intervention / prise de rendez-vous';
  const remoteServiceValue = 'Assistance informatique à distance (AnyDesk)';
  const plannerControls = [
    profileSel,
    dateInp,
    timeSel,
    urgentChk,
    slotInput,
    rateInput,
    noteInput
  ];

  const pad = (n) => String(n).padStart(2, '0');
  const priceFormatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  const localDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${year}-${month}-${day}`;
  };

  function getNextHalfHour(now = new Date()) {
    const next = new Date(now);
    next.setSeconds(0, 0);

    if (next.getMinutes() < 30) {
      next.setMinutes(30);
    } else {
      next.setMinutes(0);
      next.setHours(next.getHours() + 1);
    }

    return next;
  }

  function buildTimesForDate(dateValue) {
    if (!dateValue) {
      timeSel.innerHTML = '<option value="">Choisir une heure</option>';
      return;
    }

    const now = new Date();
    const today = localDateStr(now);
    let startHour = 0;
    let startMinute = 0;

    if (dateValue === today) {
      const next = getNextHalfHour(now);

      if (localDateStr(next) !== today) {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        dateInp.value = localDateStr(tomorrow);
      } else {
        startHour = next.getHours();
        startMinute = next.getMinutes();
      }
    }

    const times = [];

    for (let hour = startHour; hour < 24; hour += 1) {
      const minutes =
        hour === startHour && startMinute === 30 ? [30] : [0, 30];

      minutes.forEach((minute) => {
        times.push(`${pad(hour)}:${pad(minute)}`);
      });
    }

    timeSel.innerHTML =
      '<option value="">Choisir une heure</option>' +
      times
        .map((time) => `<option value="${time}">${time}</option>`)
        .join('');
  }

  function syncProfile() {
    const mapping = {
      Particulier: 'particulier',
      Professionnel: 'professionnel',
      'Collectivité / association': 'collectivite'
    };

    profileSel.value = mapping[customerProfile.value] || 'particulier';
  }

  function updateServicePresentation() {
    const isRemote = serviceType.value === remoteServiceValue;

    if (profileSel.options.length >= 3) {
      profileSel.options[0].textContent = isRemote
        ? 'Particulier – 30 € TTC / session'
        : 'Particulier – 60 € / h TTC';
      profileSel.options[1].textContent = isRemote
        ? 'Professionnel – 30 € HT / session'
        : 'Professionnel – 90 € / h HT';
      profileSel.options[2].textContent = isRemote
        ? 'Collectivité – 30 € HT / session'
        : 'Collectivité – 90 € / h HT';
    }

    if (serviceHelpEl) {
      serviceHelpEl.textContent = isRemote
        ? 'Session à distance de 30 minutes maximum avec AnyDesk. Une grille de majorations spécifique est appliquée sur la base de 30 €.'
        : 'Intervention à domicile ou sur site, facturée à l’heure selon votre profil.';
    }
  }

  function getSelectedDateTime() {
    if (!dateInp.value || !timeSel.value) return null;
    const selected = new Date(`${dateInp.value}T${timeSel.value}:00`);
    return Number.isNaN(selected.getTime()) ? null : selected;
  }

  function updateUrgentAvailability(plannerEnabled = !root.hidden, autoCheck = false) {
    const isRemote = serviceType.value === remoteServiceValue;
    const isToday = dateInp.value === localDateStr();
    const selectedDateTime = getSelectedDateTime();
    const now = new Date();
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const isWithinSixHours = Boolean(
      selectedDateTime &&
      selectedDateTime.getTime() >= now.getTime() &&
      selectedDateTime.getTime() <= sixHoursLater.getTime()
    );

    if (isRemote) {
      urgentChk.checked = plannerEnabled && isWithinSixHours;
      urgentChk.disabled = true;

      if (urgentLabelEl) {
        urgentLabelEl.textContent = 'Intervention à distance demandée sous 6 heures (+50 %)';
      }
      if (urgentHelpEl) {
        urgentHelpEl.textContent = selectedDateTime
          ? (isWithinSixHours
              ? 'Majoration appliquée automatiquement : le créneau choisi se situe dans les 6 heures.'
              : 'Aucune majoration d’urgence : le créneau choisi se situe au-delà des 6 heures.')
          : 'Choisissez une date et une heure pour vérifier automatiquement le délai de 6 heures.';
      }
      return;
    }

    const canRequestSameDay = plannerEnabled && isToday;
    urgentChk.disabled = !canRequestSameDay;

    if (canRequestSameDay) {
      if (autoCheck) urgentChk.checked = true;
    } else {
      urgentChk.checked = false;
    }

    if (urgentLabelEl) {
      urgentLabelEl.textContent = 'Intervention rapide dans la journée (+50 %)';
    }
    if (urgentHelpEl) {
      urgentHelpEl.textContent = isToday
        ? 'Demande pour le jour même : option cochée automatiquement, sous réserve de faisabilité et de confirmation.'
        : 'Cette option est disponible uniquement lorsque la date choisie est aujourd’hui.';
    }
  }

  function compute() {
    const dateValue = dateInp.value;
    const timeValue = timeSel.value;

    if (!dateValue || !timeValue) {
      rateEl.textContent = '-';
      noteEl.textContent = 'Choisissez une date et une heure.';
      slotInput.value = '';
      rateInput.value = '';
      noteInput.value = '';
      return;
    }

    const isParticulier = profileSel.value === 'particulier';
    const isRemote = serviceType.value === remoteServiceValue;
    const baseRate = isRemote ? 30 : (isParticulier ? 60 : 90);
    const taxLabel = isParticulier ? 'TTC' : 'HT';
    const hour = Number(timeValue.split(':')[0]);
    const selectedDate = new Date(`${dateValue}T12:00:00`);
    const isSunday = selectedDate.getDay() === 0;

    let timeIncrease = 0;
    let timeLabel = '';

    if (isRemote) {
      if (hour >= 21) {
        timeIncrease = 0.25;
        timeLabel = '+25 % de 21 h à minuit';
      } else if (hour < 8) {
        timeIncrease = 0.50;
        timeLabel = '+50 % de minuit à 8 h';
      }
    } else if (hour >= 19 && hour < 21) {
      timeIncrease = 0.25;
      timeLabel = '+25 % de 19 h à 21 h';
    } else if (hour >= 21 && hour < 23) {
      timeIncrease = 0.50;
      timeLabel = '+50 % de 21 h à 23 h';
    } else if (hour >= 23 || hour < 6) {
      timeIncrease = 0.75;
      timeLabel = '+75 % de 23 h à 6 h';
    } else if (hour >= 6 && hour < 8) {
      timeIncrease = 0.25;
      timeLabel = '+25 % de 6 h à 8 h';
    }

    const sundayIncrease = isSunday ? 0.25 : 0;
    const urgentIncrease = urgentChk.checked ? 0.50 : 0;
    const totalIncrease = timeIncrease + sundayIncrease + urgentIncrease;
    const price = baseRate * (1 + totalIncrease);

    const notes = [];

    if (isRemote) notes.push('Session à distance de 30 minutes maximum');
    if (timeLabel) notes.push(timeLabel);
    if (sundayIncrease) notes.push('+25 % dimanche');
    if (urgentIncrease) notes.push(isRemote ? '+50 % intervention demandée sous 6 heures' : '+50 % intervention rapide dans la journée');
    if (!notes.length) notes.push('Tarif standard, sans majoration');

    const rateText = isRemote
      ? `${priceFormatter.format(price)} € ${taxLabel} / session (30 min max)`
      : `${priceFormatter.format(price)} € / h ${taxLabel}`;
    const noteText = notes.join(' · ');

    rateEl.textContent = rateText;
    noteEl.textContent = noteText;

    slotInput.value = `${dateValue} à ${timeValue}`;
    rateInput.value = rateText;
    noteInput.value = noteText;
  }

  function setPlannerEnabled(enabled) {
    root.hidden = !enabled;

    plannerControls.forEach((control) => {
      if (control) control.disabled = !enabled;
    });

    dateInp.required = enabled;
    timeSel.required = enabled;

    if (enabled) {
      syncProfile();

      const today = localDateStr();
      dateInp.min = today;

      if (!dateInp.value) {
        dateInp.value = today;
      }

      buildTimesForDate(dateInp.value);
      updateServicePresentation();
      updateUrgentAvailability(true, true);
      compute();
    } else {
      dateInp.required = false;
      timeSel.required = false;
      urgentChk.checked = false;
      urgentChk.disabled = true;
      slotInput.value = '';
      rateInput.value = '';
      noteInput.value = '';
    }
  }

  requestType.addEventListener('change', () => {
    setPlannerEnabled(requestType.value === appointmentValue);
  });

  customerProfile.addEventListener('change', () => {
    syncProfile();
    compute();
  });

  dateInp.addEventListener('change', () => {
    buildTimesForDate(dateInp.value);
    updateUrgentAvailability(true, true);
    compute();
  });

  timeSel.addEventListener('change', () => {
    updateUrgentAvailability(true);
    compute();
  });
  profileSel.addEventListener('change', compute);
  urgentChk.addEventListener('change', compute);
  serviceType.addEventListener('change', () => {
    updateServicePresentation();
    updateUrgentAvailability(true, true);
    compute();
  });

  const initialQuery = new URLSearchParams(window.location.search);
  if (initialQuery.get('demande') === 'intervention') {
    requestType.value = appointmentValue;
  }
  if (initialQuery.get('demande') === 'distance') {
    requestType.value = appointmentValue;
    serviceType.value = remoteServiceValue;
  }

  updateServicePresentation();
  setPlannerEnabled(requestType.value === appointmentValue);
})();

/* ====== FORMULAIRE DE CONTACT : ENVOI DIRECT ====== */
(function () {
  const form = document.getElementById('contact-request-form');
  if (!form) return;

  const endpoint = form.dataset.formsubmitEndpoint;
  const submitButton = document.getElementById('contact_submit');
  const statusElement = document.getElementById('contact-form-status');
  const subjectInput = document.getElementById('contact_subject');
  const requestType = document.getElementById('request_type');
  const serviceType = document.getElementById('service_type');

  function setStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = `form-status is-visible ${type}`;
    statusElement.focus({ preventScroll: true });
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

    subjectInput.value =
      `Cob & Clic – ${requestType.value} – ${serviceType.value}`;

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
          responseData.message ||
          'Le service de formulaire a refusé la demande.'
        );
      }

      form.reset();
      requestType.dispatchEvent(new Event('change'));
      serviceType.dispatchEvent(new Event('change'));

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