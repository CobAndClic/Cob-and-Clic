(() => {
  'use strict';

  const config = window.COB_PAYMENT_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const loading = $('payment-loading');
  const content = $('payment-content');
  const errorBox = $('payment-error');
  const errorMessage = $('payment-error-message');

  function fail(message) {
    loading.hidden = true;
    content.hidden = true;
    errorBox.hidden = false;
    errorMessage.textContent = message;
  }

  function apiIsConfigured() {
    return typeof config.apiBase === 'string' && /^https:\/\//i.test(config.apiBase) && !/CHANGE-ME/i.test(config.apiBase);
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: config.currency || 'EUR' }).format(Number(value));
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  }

  function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  async function loadPayment() {
    if (!apiIsConfigured()) {
      fail('Le service de paiement Cob & Clic n’est pas encore activé. Contactez Cob & Clic avant de régler.');
      return;
    }

    const token = new URLSearchParams(window.location.search).get('t');
    if (!token) {
      fail('Ce lien ne contient aucune demande de règlement. Utilisez uniquement le lien reçu directement de Cob & Clic.');
      return;
    }

    try {
      const apiBase = String(config.apiBase).replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/v1/payment?t=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      let data = {};
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(data.error || 'Ce lien n’est plus disponible.');

      const reference = String(data.reference || '');
      const amountFormatted = formatMoney(data.amount);
      const isInvoice = /^FAC-/i.test(reference);

      if (isInvoice) {
        $('payment-eyebrow').textContent = 'Facture à régler';
        $('payment-title').textContent = `Facture ${reference} - montant restant dû`;
        $('payment-greeting').textContent = `Bonjour ${data.clientName || ''}, votre intervention est terminée. Retrouvez ci-dessous les informations de la facture à régler.`;
        $('payment-amount-label').textContent = 'Montant restant dû';
        $('payment-provider-button').textContent = `Régler ${amountFormatted}`;
      } else {
        $('payment-greeting').textContent = `Bonjour ${data.clientName || ''}, retrouvez ci-dessous les informations confirmées avec Cob & Clic.`;
      }

      $('payment-amount').textContent = amountFormatted;
      $('payment-reference').textContent = reference || '-';
      $('payment-client').textContent = data.clientName || '-';
      $('payment-service').textContent = data.service || '-';
      $('payment-description').textContent = data.description || '-';

      if (data.clientCity) $('payment-city').textContent = data.clientCity;
      else $('payment-city-row').hidden = true;

      if (data.interventionDate) $('payment-date').textContent = formatDate(data.interventionDate);
      else $('payment-date-row').hidden = true;

      const providerUrl = new URL(data.providerUrl);
      if (providerUrl.protocol !== 'https:') throw new Error('Le lien du prestataire de paiement n’est pas valide.');
      $('payment-provider-button').href = providerUrl.href;

      if (data.expiresAt) $('payment-expiry').textContent = `Ce lien Cob & Clic est valable jusqu’au ${formatDateTime(data.expiresAt)}.`;

      loading.hidden = true;
      content.hidden = false;
    } catch (err) {
      fail(err && err.message ? err.message : 'Impossible de vérifier cette demande de règlement.');
    }
  }

  loadPayment();
})();
