(() => {
  'use strict';

  const config = window.COB_PAYMENT_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const issueButton = $('invoice-issue-button');
  if (!issueButton) return;

  const statusBox = $('invoice-admin-status');
  const clientType = $('invoice-client-type');
  const company = $('invoice-client-company');
  const clientSiren = $('invoice-client-siren');
  const clientAddress = $('invoice-client-address');
  const professionalFields = Array.from(document.querySelectorAll('.invoice-professional-field'));
  const historyList = $('invoice-history-list');
  const historyEmpty = $('invoice-history-empty');
  const refreshButton = $('invoice-history-refresh');

  function apiBase() {
    return String(config.apiBase || '').replace(/\/+$/, '');
  }

  function configured() {
    return /^https:\/\//i.test(apiBase()) && !/CHANGE-ME/i.test(apiBase());
  }

  function adminKey() {
    return String($('pay-admin-key')?.value || '').trim();
  }

  function setStatus(type, message) {
    statusBox.className = `invoice-admin-status is-visible ${type}`;
    statusBox.textContent = message;
  }

  function clearStatus() {
    statusBox.className = 'invoice-admin-status';
    statusBox.textContent = '';
  }

  function normalizeSiren(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 9);
  }

  function updateClientType() {
    const professional = clientType.value === 'professionnel';
    professionalFields.forEach((field) => { field.hidden = !professional; });
  }

  function value(id) {
    return String($(id)?.value || '').trim();
  }

  function buildPayload() {
    const providerUrl = value('pay-provider-url');
    return {
      clientType: clientType.value,
      clientName: value('pay-client-name'),
      clientEmail: value('pay-client-email'),
      clientPhone: value('pay-client-phone'),
      clientCity: value('pay-client-city'),
      clientAddress: value('invoice-client-address'),
      clientCompany: value('invoice-client-company'),
      clientSiren: normalizeSiren(value('invoice-client-siren')),
      service: value('pay-service'),
      interventionDate: value('pay-date'),
      description: value('pay-description'),
      amount: Number(String($('pay-amount')?.value || '').replace(',', '.')),
      providerUrl,
      validityDays: Number($('pay-validity')?.value || 14),
      sendCopy: Boolean($('pay-copy')?.checked),
      sendEmail: true
    };
  }

  function validate(payload) {
    if (!payload.clientName) return 'Renseignez le nom du client.';
    if (!/^\S+@\S+\.\S+$/.test(payload.clientEmail)) return 'Vérifiez l’adresse e-mail du client.';
    if (!payload.clientAddress) return 'Renseignez l’adresse de facturation / intervention avant d’émettre la facture.';
    if (payload.clientType === 'professionnel' && !payload.clientCompany) return 'Renseignez l’entreprise ou l’organisme du client professionnel.';
    if (payload.clientSiren && payload.clientSiren.length !== 9) return 'Le SIREN client doit contenir 9 chiffres.';
    if (!payload.interventionDate) return 'Renseignez la date de l’intervention avant de facturer.';
    if (!payload.service || !payload.description) return 'Vérifiez la prestation et sa description.';
    if (!Number.isFinite(payload.amount) || payload.amount <= 0 || payload.amount > 9999) return 'Renseignez un montant valide.';
    if (payload.providerUrl) {
      try {
        const url = new URL(payload.providerUrl);
        if (url.protocol !== 'https:') return 'Le lien de paiement doit utiliser HTTPS.';
      } catch (_) {
        return 'Le lien de paiement marchand n’est pas valide.';
      }
    }
    if (!adminKey()) return 'Renseignez votre clé d’administration.';
    return '';
  }

  function frenchMoney(value) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
  }

  async function issueInvoice() {
    clearStatus();
    if (!configured()) {
      setStatus('error', 'Le serveur Cob & Clic n’est pas relié au site.');
      return;
    }

    const payload = buildPayload();
    const error = validate(payload);
    if (error) {
      setStatus('error', error);
      return;
    }

    const confirmation = window.confirm(
      `Émettre la facture définitive de ${frenchMoney(payload.amount)} pour ${payload.clientName} ?\n\n` +
      'Un numéro chronologique sera attribué. Les informations de cette facture ne devront ensuite plus être modifiées.'
    );
    if (!confirmation) return;

    if ($('pay-remember-key')?.checked) sessionStorage.setItem('cobPaymentAdminKey', adminKey());

    issueButton.disabled = true;
    setStatus('pending', 'Émission de la facture, génération du PDF et envoi au client…');

    try {
      const response = await fetch(`${apiBase()}/v1/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cob-Admin-Key': adminKey()
        },
        body: JSON.stringify(payload)
      });

      let data = {};
      try { data = await response.json(); } catch (_) {}

      if (!response.ok) {
        if (data.invoiceNumber) {
          throw new Error(`${data.error || 'L’envoi a échoué.'} La facture ${data.invoiceNumber} existe déjà et ne doit pas être recréée.`);
        }
        throw new Error(data.error || `Erreur serveur (${response.status})`);
      }

      const emailText = data.emailSent ? ' et envoyée au client' : '';
      setStatus('success', `Facture ${data.invoiceNumber} émise${emailText}. Elle est maintenant enregistrée dans Cob & Clic.`);
      await loadHistory();
    } catch (error) {
      setStatus('error', error?.message || 'Impossible d’émettre la facture.');
    } finally {
      issueButton.disabled = false;
    }
  }

  function invoiceRow(invoice) {
    const row = document.createElement('article');
    row.className = 'invoice-history-row';
    const details = document.createElement('div');
    details.className = 'invoice-history-details';

    const number = document.createElement('strong');
    number.textContent = invoice.number || `Facture #${invoice.id}`;
    const meta = document.createElement('span');
    const date = invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('fr-FR') : '';
    meta.textContent = `${invoice.clientName || ''} · ${date}`;
    details.append(number, meta);

    const amount = document.createElement('strong');
    amount.className = 'invoice-history-amount';
    amount.textContent = frenchMoney(invoice.amount);

    const actions = document.createElement('div');
    actions.className = 'invoice-history-actions';
    const badge = document.createElement('span');
    badge.className = `invoice-status-badge status-${invoice.status || 'issued'}`;
    badge.textContent = invoice.status === 'sent' ? 'Envoyée' : invoice.status === 'email_failed' ? 'Mail à renvoyer' : 'Émise';
    actions.appendChild(badge);

    if (invoice.pdfReady) {
      const download = document.createElement('button');
      download.type = 'button';
      download.className = 'btn btn-ghost invoice-download-btn';
      download.textContent = 'PDF';
      download.addEventListener('click', () => downloadInvoice(invoice.id, invoice.number, download));
      actions.appendChild(download);
    }

    row.append(details, amount, actions);
    return row;
  }

  async function loadHistory() {
    if (!configured() || !adminKey()) {
      historyEmpty.textContent = 'Renseignez votre clé d’administration puis cliquez sur Actualiser.';
      historyEmpty.hidden = false;
      historyList.innerHTML = '';
      return;
    }

    refreshButton.disabled = true;
    try {
      const response = await fetch(`${apiBase()}/v1/invoices?limit=20`, {
        headers: { 'X-Cob-Admin-Key': adminKey() }
      });
      let data = {};
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(data.error || `Erreur serveur (${response.status})`);

      historyList.innerHTML = '';
      const invoices = Array.isArray(data.invoices) ? data.invoices : [];
      if (!invoices.length) {
        historyEmpty.textContent = 'Aucune facture émise pour le moment.';
        historyEmpty.hidden = false;
        return;
      }
      historyEmpty.hidden = true;
      invoices.forEach((invoice) => historyList.appendChild(invoiceRow(invoice)));
    } catch (error) {
      historyList.innerHTML = '';
      historyEmpty.textContent = error?.message || 'Impossible de charger les factures.';
      historyEmpty.hidden = false;
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function downloadInvoice(id, number, button) {
    if (!adminKey()) {
      setStatus('error', 'Renseignez votre clé d’administration pour télécharger une facture.');
      return;
    }
    button.disabled = true;
    try {
      const response = await fetch(`${apiBase()}/v1/invoice-pdf?id=${encodeURIComponent(id)}`, {
        headers: { 'X-Cob-Admin-Key': adminKey() }
      });
      if (!response.ok) {
        let data = {};
        try { data = await response.json(); } catch (_) {}
        throw new Error(data.error || 'PDF indisponible.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${number || `facture-${id}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setStatus('error', error?.message || 'Impossible de télécharger le PDF.');
    } finally {
      button.disabled = false;
    }
  }

  clientType.addEventListener('change', updateClientType);
  clientSiren.addEventListener('input', () => {
    const digits = normalizeSiren(clientSiren.value);
    clientSiren.value = digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  });
  issueButton.addEventListener('click', issueInvoice);
  refreshButton.addEventListener('click', loadHistory);

  updateClientType();
})();
