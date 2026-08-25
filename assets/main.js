/* ====== MENU HAMBURGER ====== */
(function () {
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!btn || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      btn.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1180) setOpen(false);
  });
})();

/* ====== LIEN DE NAVIGATION ACTIF ====== */
(function () {
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('#site-nav a:not(.btn)').forEach((link) => {
    const linkUrl = new URL(link.href, window.location.href);
    const linkFile = linkUrl.pathname.split('/').pop() || 'index.html';

    if (linkFile === currentFile) link.setAttribute('aria-current', 'page');
  });
})();

/* ====== PLANNER OPTIONNEL ====== */
(function () {
  const form = document.getElementById('contact-request-form');
  const root = document.getElementById('planner');
  const requestType = document.getElementById('request_type');
  const serviceType = document.getElementById('service_type');
  const issueSel = document.getElementById('issue_type');
  if (!form || !root || !requestType || !serviceType || !issueSel) return;

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
  const minimumLeadMinutes = 30;

  const issueOptions = {
    'Assistance et dépannage informatique à domicile': [
      'Windows ne démarre plus / écran noir',
      'Le PC démarre directement dans le BIOS / UEFI',
      'PC très lent / se fige',
      'Écran bleu / redémarrages / plantages',
      'Erreur Windows / mise à jour bloquée',
      'Un logiciel ne fonctionne plus correctement',
      'Compte Windows local / mot de passe oublié',
      'Récupération de fichiers / données',
      'Sauvegarde / transfert de données',
      'Autre panne informatique'
    ],
    'Aide smartphone / tablette': [
      'Prise en main de l’appareil',
      'Application qui ne fonctionne pas',
      'E-mail / compte / mot de passe',
      'Photos / sauvegarde / transfert',
      'Connexion Wi-Fi / Internet',
      'Réglages / notifications / stockage',
      'Changement de téléphone / transfert de données',
      'Autre problème smartphone / tablette'
    ],
    'Box / Wi-Fi / TV / imprimante': [
      'Plus de connexion Internet',
      'Wi-Fi lent ou instable',
      'Un appareil ne se connecte plus au Wi-Fi',
      'Imprimante non détectée / n’imprime plus',
      'Installation / configuration d’une imprimante',
      'TV / appareil connecté / box à configurer',
      'Autre problème de connexion ou périphérique'
    ],
    'Assistance informatique à distance (AnyDesk)': [
      'Erreur ou bug logiciel',
      'Navigateur / e-mail / compte en ligne',
      'Mise à jour / réglage Windows',
      'Installation / configuration d’un logiciel',
      'Aide pour une démarche ou un document',
      'Autre problème logiciel simple'
    ],
    'Assistance / initiation numérique': [
      'Découvrir un ordinateur',
      'Découvrir un smartphone / une tablette',
      'Envoyer des e-mails / pièces jointes',
      'Gérer des photos / fichiers',
      'Faire une démarche en ligne',
      'Apprendre à utiliser un service ou une application',
      'Autre besoin d’accompagnement'
    ],
    'Sécurité / prévention des arnaques': [
      'J’ai reçu un e-mail ou SMS suspect',
      'Je pense avoir cliqué sur un faux lien',
      'Sécuriser mes mots de passe / comptes',
      'Mettre en place la double authentification',
      'Vérifier les réglages de sécurité de mon appareil',
      'Sensibilisation phishing / cybersécurité',
      'Autre question de sécurité'
    ],
    'Création de site web': [
      'Créer un site vitrine',
      'Modifier / améliorer un site existant',
      'Nom de domaine / mise en ligne',
      'Autre besoin lié à un site web'
    ],
    'Autre demande': [
      'Je ne sais pas dans quelle catégorie classer mon problème',
      'Autre demande'
    ]
  };

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

  function getEarliestAppointment(now = new Date()) {
    const halfHourMs = 30 * 60 * 1000;
    const leadMs = minimumLeadMinutes * 60 * 1000;
    const earliestMs = Math.ceil((now.getTime() + leadMs) / halfHourMs) * halfHourMs;
    return new Date(earliestMs);
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
      const next = getEarliestAppointment(now);

      if (localDateStr(next) !== today) {
        dateInp.value = localDateStr(next);
        startHour = next.getHours();
        startMinute = next.getMinutes();
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

    timeSel.setCustomValidity('');
    timeSel.innerHTML =
      '<option value="">Choisir une heure</option>' +
      times
        .map((time) => `<option value="${time}">${time}</option>`)
        .join('');
  }

  function syncIssueOptions(preserveSelection = false) {
    const previous = preserveSelection ? issueSel.value : '';
    const options = issueOptions[serviceType.value] || issueOptions['Autre demande'];

    issueSel.innerHTML =
      '<option value="">Choisir la situation la plus proche</option>' +
      options.map((label) => `<option value="${label}">${label}</option>`).join('');

    if (previous && options.includes(previous)) issueSel.value = previous;
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
        ? 'Particulier - 30 € TTC / session'
        : 'Particulier - 60 € / h TTC';
      profileSel.options[1].textContent = isRemote
        ? 'Professionnel - 30 € HT / session'
        : 'Professionnel - 90 € / h HT';
      profileSel.options[2].textContent = isRemote
        ? 'Collectivité - 30 € HT / session'
        : 'Collectivité - 90 € / h HT';
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

  function updateUrgentAvailability(plannerEnabled = !root.hidden) {
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
    urgentChk.checked = canRequestSameDay;
    urgentChk.disabled = true;

    if (urgentLabelEl) {
      urgentLabelEl.textContent = 'Intervention rapide dans la journée (+50 %)';
    }
    if (urgentHelpEl) {
      urgentHelpEl.textContent = isToday
        ? 'Majoration appliquée automatiquement pour une demande le jour même, sous réserve de faisabilité et de confirmation.'
        : 'Cette option est disponible uniquement lorsque la date choisie est aujourd’hui.';
    }
  }

  function validateMinimumLeadTime() {
    if (root.hidden || !dateInp.value || !timeSel.value) {
      timeSel.setCustomValidity('');
      return true;
    }

    const selected = getSelectedDateTime();
    const earliest = getEarliestAppointment(new Date());
    const valid = Boolean(selected && selected.getTime() >= earliest.getTime());

    timeSel.setCustomValidity(
      valid ? '' : `Choisissez un créneau situé au moins ${minimumLeadMinutes} minutes après l’heure actuelle.`
    );
    return valid;
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
      timeSel.setCustomValidity('');
      return;
    }

    if (!validateMinimumLeadTime()) {
      rateEl.textContent = '-';
      noteEl.textContent = `Ce créneau est trop proche. Choisissez un horaire situé au moins ${minimumLeadMinutes} minutes après l’heure actuelle.`;
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
      updateUrgentAvailability(true);
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
    updateUrgentAvailability(true);
    compute();
  });

  timeSel.addEventListener('change', () => {
    updateUrgentAvailability(true);
    compute();
  });
  profileSel.addEventListener('change', compute);
  urgentChk.addEventListener('change', compute);
  serviceType.addEventListener('change', () => {
    syncIssueOptions();
    updateServicePresentation();
    updateUrgentAvailability(true);
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
  if (initialQuery.get('demande') === 'site') {
    requestType.value = 'Demande de devis - création de site web';
    serviceType.value = 'Création de site web';
  }

  syncIssueOptions();
  updateServicePresentation();
  setPlannerEnabled(requestType.value === appointmentValue);

  form.addEventListener('submit', () => {
    if (root.hidden) return;
    validateMinimumLeadTime();
  }, true);
})();

/* ====== FORMULAIRE DE CONTACT : VALIDATION + ENVOI ====== */
(function () {
  const form = document.getElementById('contact-request-form');
  if (!form) return;

  const submitButton = document.getElementById('contact_submit');
  const statusElement = document.getElementById('contact-form-status');
  const subjectInput = document.getElementById('contact_subject');
  const requestType = document.getElementById('request_type');
  const serviceType = document.getElementById('service_type');
  const issueType = document.getElementById('issue_type');
  const emailInput = document.getElementById('customer_email');
  const phoneInput = document.getElementById('customer_phone');
  const emailError = document.getElementById('customer_email_error');
  const phoneError = document.getElementById('customer_phone_error');

  function setStatus(message, type) {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = `form-status is-visible ${type}`;
    statusElement.focus({ preventScroll: true });
  }

  function setFieldState(input, errorElement, message = '') {
    if (!input || !errorElement) return true;
    const hasError = Boolean(message);
    input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    errorElement.textContent = message;
    if (message) input.setCustomValidity(message);
    else input.setCustomValidity('');
    return !hasError;
  }

  function validateEmail() {
    if (!emailInput) return true;
    const value = emailInput.value.trim();
    emailInput.value = value;

    if (!value) {
      return setFieldState(emailInput, emailError, 'Renseignez une adresse e-mail.');
    }

    // Pragmatic browser-side check. The address is still validated by the mail service after submission.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(value)) {
      return setFieldState(emailInput, emailError, 'Vérifiez l’adresse e-mail, par exemple nom@domaine.fr.');
    }

    return setFieldState(emailInput, emailError);
  }

  function validatePhone() {
    if (!phoneInput) return true;
    const value = phoneInput.value.trim();
    phoneInput.value = value;

    if (!value) {
      return setFieldState(phoneInput, phoneError, 'Renseignez un numéro de téléphone.');
    }

    const compact = value.replace(/[\s.()-]/g, '');
    const frenchPhonePattern = /^(?:\+33|0)[1-9]\d{8}$/;
    if (!frenchPhonePattern.test(compact)) {
      return setFieldState(phoneInput, phoneError, 'Vérifiez le numéro : 06 12 34 56 78 ou +33 6 12 34 56 78.');
    }

    return setFieldState(phoneInput, phoneError);
  }

  emailInput?.addEventListener('blur', validateEmail);
  phoneInput?.addEventListener('blur', validatePhone);
  emailInput?.addEventListener('input', () => {
    if (emailInput.getAttribute('aria-invalid') === 'true') validateEmail();
  });
  phoneInput?.addEventListener('input', () => {
    if (phoneInput.getAttribute('aria-invalid') === 'true') validatePhone();
  });

  const query = new URLSearchParams(window.location.search);

  if (query.get('envoi') === 'ok') {
    setStatus(
      'Votre demande a bien été envoyée. Un e-mail de confirmation vient également d’être envoyé à l’adresse renseignée.',
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

  form.addEventListener('submit', (event) => {
    const emailIsValid = validateEmail();
    const phoneIsValid = validatePhone();

    if (!emailIsValid || !phoneIsValid || !form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      setStatus('Vérifiez les champs indiqués avant d’envoyer la demande.', 'error');
      return;
    }

    const honeyPot = form.querySelector('[name="_honey"]');
    if (honeyPot?.value) {
      event.preventDefault();
      return;
    }

    subjectInput.value = `Cob & Clic - ${requestType.value} - ${issueType?.value || serviceType.value}`;
    submitButton.disabled = true;
    submitButton.textContent = 'Envoi en cours...';
    setStatus('Envoi de votre demande en cours...', 'pending');

    // Intentionally no preventDefault here: FormSubmit's automatic customer reply
    // only works with a standard form POST, not with its AJAX endpoint.
  });
})();
