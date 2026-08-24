(() => {
  'use strict';

  const config = window.COB_PAYMENT_CONFIG || {};
  const form = document.getElementById('payment-admin-form');
  if (!form) return;

  const $ = (id) => document.getElementById(id);
  const fields = {
    clientName: $('pay-client-name'),
    clientEmail: $('pay-client-email'),
    clientPhone: $('pay-client-phone'),
    clientCity: $('pay-client-city'),
    service: $('pay-service'),
    interventionDate: $('pay-date'),
    description: $('pay-description'),
    amount: $('pay-amount'),
    reference: $('pay-reference'),
    providerUrl: $('pay-provider-url'),
    validityDays: $('pay-validity'),
    sendCopy: $('pay-copy'),
    adminKey: $('pay-admin-key'),
    rememberKey: $('pay-remember-key')
  };

  const preview = {
    name: $('preview-client-name'),
    description: $('preview-description'),
    service: $('preview-service'),
    reference: $('preview-reference'),
    amount: $('preview-amount')
  };

  const statusBox = $('payment-admin-status');
  const sendButton = $('payment-send-button');
  const linkOnlyButton = $('payment-link-only');
  const resultCard = $('payment-result');
  const resultUrl = $('payment-result-url');
  const resultMessage = $('payment-result-message');
  const openResultUrl = $('open-payment-url');

  function formatMoney(value) {
    const amount = Number(String(value || '').replace(',', '.'));
    if (!Number.isFinite(amount)) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: config.currency || 'EUR' }).format(amount);
  }

  function generateReference() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `CC-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  }

  function updatePreview() {
    preview.name.textContent = fields.clientName.value.trim() || 'Votre client';
    preview.description.textContent = fields.description.value.trim() || 'La prestation apparaîtra ici.';
    preview.service.textContent = fields.service.value || 'Assistance & dépannage à domicile';
    preview.reference.textContent = fields.reference.value.trim() || '-';
    preview.amount.textContent = formatMoney(fields.amount.value);
  }

  function setStatus(type, message) {
    statusBox.className = `payment-admin-status is-visible ${type}`;
    statusBox.textContent = message;
  }

  function clearStatus() {
    statusBox.className = 'payment-admin-status';
    statusBox.textContent = '';
  }

  function apiIsConfigured() {
    return typeof config.apiBase === 'string' && /^https:\/\//i.test(config.apiBase) && !/CHANGE-ME/i.test(config.apiBase);
  }

  function normalizeApiBase() {
    return String(config.apiBase || '').replace(/\/+$/, '');
  }

  function getPayload(sendEmail) {
    return {
      clientName: fields.clientName.value.trim(),
      clientEmail: fields.clientEmail.value.trim(),
      clientPhone: fields.clientPhone.value.trim(),
      clientCity: fields.clientCity.value.trim(),
      service: fields.service.value,
      interventionDate: fields.interventionDate.value,
      description: fields.description.value.trim(),
      amount: Number(String(fields.amount.value).replace(',', '.')),
      reference: fields.reference.value.trim(),
      providerUrl: fields.providerUrl.value.trim(),
      validityDays: Number(fields.validityDays.value || 14),
      sendCopy: Boolean(fields.sendCopy.checked),
      sendEmail: Boolean(sendEmail)
    };
  }

  function validatePayload(payload) {
    if (!payload.clientName) return 'Renseignez le nom du client.';
    if (!/^\S+@\S+\.\S+$/.test(payload.clientEmail)) return 'Vérifiez l’adresse e-mail du client.';
    if (!payload.description) return 'Ajoutez une description courte de la prestation.';
    if (!Number.isFinite(payload.amount) || payload.amount <= 0 || payload.amount > 9999) return 'Renseignez un montant valide.';
    if (!payload.reference) return 'Renseignez une référence.';
    try {
      const url = new URL(payload.providerUrl);
      if (url.protocol !== 'https:') return 'Le lien du prestataire de paiement doit commencer par https://';
    } catch (_) {
      return 'Le lien du prestataire de paiement n’est pas valide.';
    }
    if (!fields.adminKey.value) return 'Renseignez votre clé d’administration.';
    return '';
  }

  async function createRequest(sendEmail) {
    clearStatus();
    if (!apiIsConfigured()) {
      setStatus('error', 'Le serveur de paiement n’est pas encore relié au site. Déployez le Worker puis remplacez apiBase dans assets/payment-config.js.');
      return;
    }

    const payload = getPayload(sendEmail);
    const error = validatePayload(payload);
    if (error) {
      setStatus('error', error);
      return;
    }

    if (fields.rememberKey.checked) sessionStorage.setItem('cobPaymentAdminKey', fields.adminKey.value);
    else sessionStorage.removeItem('cobPaymentAdminKey');

    sendButton.disabled = true;
    linkOnlyButton.disabled = true;
    setStatus('pending', sendEmail ? 'Création de la page client et envoi du mail…' : 'Création du lien client…');

    try {
      const response = await fetch(`${normalizeApiBase()}/v1/payment-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cob-Admin-Key': fields.adminKey.value
        },
        body: JSON.stringify(payload)
      });

      let data = {};
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(data.error || `Erreur serveur (${response.status})`);
      if (!data.paymentPageUrl) throw new Error('Le serveur n’a pas retourné de lien de paiement.');

      resultUrl.value = data.paymentPageUrl;
      openResultUrl.href = data.paymentPageUrl;
      resultMessage.textContent = sendEmail
        ? `Le mail a été envoyé à ${payload.clientEmail}. Une copie ${payload.sendCopy ? 'a également été demandée' : 'n’a pas été demandée'}.`
        : 'Le lien a été créé sans envoyer de mail. Vous pouvez le transmettre manuellement.';
      resultCard.hidden = false;
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus('success', sendEmail ? 'Demande créée et mail envoyé.' : 'Lien client créé.');
    } catch (err) {
      setStatus('error', err && err.message ? err.message : 'Impossible de créer la demande de règlement.');
    } finally {
      sendButton.disabled = false;
      linkOnlyButton.disabled = false;
    }
  }

  function parseImportedRequest(raw) {
    const text = String(raw || '').replace(/\r/g, '');
    const rows = {};
    const labels = [
      'Type de demande', 'Nom', 'email', 'Adresse e-mail', 'Téléphone', 'Ville / commune', 'Profil', 'Besoin', 'Message',
      'Date souhaitée', 'Créneau souhaité', 'Tarif estimé', 'Détail du tarif'
    ];

    const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(?:^|\\n)\\s*(${escaped})\\s*[:\\t]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${escaped})\\s*[:\\t]|$)`, 'gi');
    let match;
    while ((match = regex.exec(text))) rows[match[1].toLowerCase()] = match[2].trim();

    if (!Object.keys(rows).length) {
      text.split('\n').forEach((line) => {
        const idx = line.indexOf(':');
        if (idx < 1) return;
        const key = line.slice(0, idx).trim().toLowerCase();
        const value = line.slice(idx + 1).trim();
        rows[key] = value;
      });
    }
    return rows;
  }

  function firstValue(rows, keys) {
    for (const key of keys) {
      const value = rows[key.toLowerCase()];
      if (value) return value;
    }
    return '';
  }

  function mapService(besoin) {
    const value = String(besoin || '').toLowerCase();
    if (/distance|anydesk/.test(value)) return 'Assistance à distance';
    if (/formation|accompagnement|prise en main|numérique|smartphone|téléphone/.test(value)) return 'Assistance numérique';
    if (/cyber|sécur|arnaque/.test(value)) return 'Sensibilisation cybersécurité';
    if (/pro|association|collectivité/.test(value)) return 'Intervention professionnel / association / collectivité';
    return 'Assistance & dépannage à domicile';
  }

  $('toggle-import').addEventListener('click', () => {
    const importer = $('payment-importer');
    importer.hidden = !importer.hidden;
    if (!importer.hidden) $('import-text').focus();
  });

  $('clear-import').addEventListener('click', () => { $('import-text').value = ''; });
  $('import-request').addEventListener('click', () => {
    const rows = parseImportedRequest($('import-text').value);
    const name = firstValue(rows, ['Nom']);
    const email = firstValue(rows, ['email', 'Adresse e-mail']);
    const phone = firstValue(rows, ['Téléphone']);
    const city = firstValue(rows, ['Ville / commune']);
    const besoin = firstValue(rows, ['Besoin']);
    const message = firstValue(rows, ['Message']);
    const date = firstValue(rows, ['Date souhaitée']);
    const estimatedRate = firstValue(rows, ['Tarif estimé']);

    if (name) fields.clientName.value = name;
    if (email) fields.clientEmail.value = email;
    if (phone) fields.clientPhone.value = phone;
    if (city) fields.clientCity.value = city;
    if (besoin) fields.service.value = mapService(besoin);
    if (message) fields.description.value = message.slice(0, 700);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) fields.interventionDate.value = date;
    if (estimatedRate) {
      const money = estimatedRate.replace(',', '.').match(/\d+(?:\.\d{1,2})?/);
      if (money) fields.amount.value = money[0];
    }

    updatePreview();
    setStatus('success', 'Informations récupérées. Vérifiez-les puis complétez le montant et le lien de paiement.');
    $('payment-importer').hidden = true;
  });

  $('refresh-reference').addEventListener('click', () => {
    fields.reference.value = generateReference();
    updatePreview();
  });

  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    createRequest(true);
  });
  linkOnlyButton.addEventListener('click', () => createRequest(false));

  $('copy-payment-url').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultUrl.value);
      $('copy-payment-url').textContent = 'Copié ✓';
      setTimeout(() => { $('copy-payment-url').textContent = 'Copier le lien'; }, 1600);
    } catch (_) {
      resultUrl.select();
      document.execCommand('copy');
    }
  });

  $('new-payment-request').addEventListener('click', () => {
    const savedKey = fields.rememberKey.checked ? fields.adminKey.value : '';
    const remember = fields.rememberKey.checked;
    form.reset();
    fields.reference.value = generateReference();
    fields.adminKey.value = savedKey;
    fields.rememberKey.checked = remember;
    fields.sendCopy.checked = true;
    fields.validityDays.value = '14';
    resultCard.hidden = true;
    clearStatus();
    updatePreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  fields.reference.value = generateReference();
  const sessionKey = sessionStorage.getItem('cobPaymentAdminKey');
  if (sessionKey) {
    fields.adminKey.value = sessionKey;
    fields.rememberKey.checked = true;
  }
  updatePreview();
})();
