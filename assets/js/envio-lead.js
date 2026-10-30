/* Envio de lead das LPs da Zera.
 * 1) Grava na planilha "ENTRADA DE LEADS - ZERA BRASIL - DROS AGENCIA" (Apps Script),
 *    que repassa ao CRM Dros e anota o resultado (backup sempre).
 * 2) Se a planilha falhar, manda direto para o CRM.
 * Enquanto PLANILHA estiver vazia, vai direto para o CRM. */
(function () {
  var PLANILHA = '';
  var CRM = 'https://drosagencia.com.br/crm/api/webhooks/sheets/zera-brasil-quimicos-ltda';
  var inicio = Date.now();
  var params = new URLSearchParams(location.search);

  function cookie(nome) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + nome + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  function rastreio() {
    var fbclid = params.get('fbclid') || '';
    var fbc = cookie('_fbc') || (fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : '');
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || '',
      fbclid: fbclid,
      gclid: params.get('gclid') || '',
      fbp: cookie('_fbp'),
      fbc: fbc,
      referrer: document.referrer,
      landing_page: location.href,
      device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      screen: screen.width + 'x' + screen.height,
      user_agent: navigator.userAgent,
      fill_time_ms: Date.now() - inicio
    };
  }

  function postar(url, corpo, tipo) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': tipo },
      body: JSON.stringify(corpo)
    });
  }

  function direto(corpo) {
    return postar(CRM, corpo, 'application/json').then(function (r) {
      if (!r.ok) throw new Error('crm ' + r.status);
      return { ok: true, via: 'crm' };
    });
  }

  window.ZeraLead = {
    // dados: nome, whatsapp, empresa, cidade, segmento, problema, pagina, source, tags
    enviar: function (dados) {
      var corpo = Object.assign({}, dados, rastreio());
      if (!corpo.source_detail) {
        corpo.source_detail = [corpo.utm_source, corpo.utm_medium, corpo.utm_campaign, corpo.utm_content].filter(Boolean).join(' > ');
      }
      if (!PLANILHA) return direto(corpo);
      // text/plain evita o preflight de CORS do Apps Script
      return postar(PLANILHA, corpo, 'text/plain;charset=utf-8')
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok) throw new Error('planilha');
          return { ok: true, via: 'planilha', crm: j.crm };
        })
        .catch(function () { return direto(corpo); });
    }
  };
})();
