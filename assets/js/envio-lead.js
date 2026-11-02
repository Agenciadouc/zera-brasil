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

  // Rotulos das Observacoes do lead no CRM. Campo que nao estiver aqui entra com o proprio nome.
  var ROTULOS = {
    pagina: 'Página', empresa: 'Empresa / local', cidade: 'Cidade', segmento: 'Segmento / tipo de local',
    problema: 'Problema / desafio', mensagem: 'Mensagem', email: 'E-mail'
  };
  // Campos que o CRM ja grava em lugar proprio (ou sao rastreio tecnico): ficam fora das Observacoes.
  var FORA = ['nome', 'whatsapp', 'source', 'source_detail', 'tags', 'notes', 'utm_source', 'utm_medium',
    'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'fbp', 'fbc', 'referrer', 'landing_page',
    'device', 'screen', 'user_agent', 'fill_time_ms'];

  function observacoes(c) {
    var linhas = ['Cadastro pelo site em ' + new Date().toLocaleString('pt-BR')];
    Object.keys(c).forEach(function (k) {
      var v = c[k];
      if (FORA.indexOf(k) !== -1 || v == null || String(v).trim() === '') return;
      linhas.push((ROTULOS[k] || k) + ': ' + String(v).trim());
    });
    if (c.utm_campaign) linhas.push('Campanha: ' + c.utm_campaign);
    if (c.utm_content) linhas.push('Anúncio: ' + c.utm_content);
    linhas.push('Aparelho: ' + (c.device === 'mobile' ? 'celular' : 'computador'));
    return linhas.join('\n');
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
      if (!corpo.notes) corpo.notes = observacoes(corpo);
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
