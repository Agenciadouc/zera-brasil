/**
 * ENTRADA DE LEADS - ZERA BRASIL - DROS AGENCIA
 * Recebe os cadastros das LPs (hoteis-condominios e corporativa), grava uma linha
 * na planilha (backup) e depois manda para o CRM Dros. O resultado do CRM fica nas
 * colunas "CRM sync status" e "CRM sync response".
 *
 * Instalar: na planilha, Extensoes > Apps Script > colar este arquivo > Implantar >
 * Nova implantacao > Tipo: App da Web > Executar como: Eu > Quem pode acessar: Qualquer pessoa.
 * Copie a URL que termina em /exec e cole em PLANILHA no assets/js/envio-lead.js.
 *
 * Reenvio: rode "reenviarPendentes" (ou crie um acionador a cada 15 min) para mandar
 * ao CRM as linhas que ficaram com erro.
 */

const CRM_WEBHOOK = 'https://drosagencia.com.br/crm/api/webhooks/sheets/zera-brasil-quimicos-ltda'
const ABA = 'LEADS'

const COLUNAS = [
  'Timestamp', 'Pagina', 'Nome', 'WhatsApp', 'Empresa / Local', 'Cidade/UF',
  'Segmento / Tipo de local', 'Problema / Desafio', 'Source', 'Source detail', 'Tags',
  'UTM source', 'UTM medium', 'UTM campaign', 'UTM content', 'UTM term',
  'fbclid', 'gclid', 'fbp', 'fbc', 'Referrer', 'Landing page', 'Device', 'Screen',
  'User agent', 'Fill time (ms)', 'CRM sync status', 'CRM sync response', 'Observacoes',
]
const COL_STATUS = COLUNAS.indexOf('CRM sync status') + 1

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sh = ss.getSheetByName(ABA)
  if (!sh) {
    sh = ss.getSheets()[0]
    sh.setName(ABA)
  }
  if (sh.getLastRow() === 0) sh.appendRow(COLUNAS)
  return sh
}

// Repassa TUDO que veio do site (Observacoes em "notes", UTMs, fbp/fbc para o evento da Meta).
function payloadCrm_(d) {
  return Object.assign({}, d, {
    source: d.source || d.pagina || 'LP Zera',
    tags: d.tags || [],
  })
}

function enviarCrm_(payload) {
  try {
    const r = UrlFetchApp.fetch(CRM_WEBHOOK, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    })
    const code = r.getResponseCode()
    return { status: code >= 200 && code < 300 ? 'ok' : 'erro_' + code, resposta: r.getContentText().substring(0, 500) }
  } catch (e) {
    return { status: 'erro', resposta: String(e.message || e).substring(0, 500) }
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.waitLock(20000)
  let linha
  let d
  try {
    d = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    const sh = aba_()
    const tags = Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || '')
    sh.appendRow([
      new Date().toISOString(), d.pagina || '', d.nome || '', d.whatsapp || '', d.empresa || '',
      d.cidade || '', d.segmento || '', d.problema || '', d.source || '', d.source_detail || '', tags,
      d.utm_source || '', d.utm_medium || '', d.utm_campaign || '', d.utm_content || '', d.utm_term || '',
      d.fbclid || '', d.gclid || '', d.fbp || '', d.fbc || '', d.referrer || '', d.landing_page || '',
      d.device || '', d.screen || '', d.user_agent || '', d.fill_time_ms || '', 'pendente', '',
      d.notes || '',
    ])
    linha = sh.getLastRow()
  } catch (err) {
    return json_({ ok: false, erro: String(err.message || err) })
  } finally {
    lock.releaseLock()
  }

  // Linha gravada: o lead esta salvo. Agora manda para o CRM.
  const crm = enviarCrm_(payloadCrm_(d))
  aba_().getRange(linha, COL_STATUS, 1, 2).setValues([[crm.status, crm.resposta]])
  return json_({ ok: true, linha: linha, crm: crm.status })
}

function doGet() {
  return json_({ ok: true, servico: 'entrada de leads zera' })
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

/** Reenvia ao CRM as linhas cujo status nao comeca com "ok". */
function reenviarPendentes() {
  const sh = aba_()
  const n = sh.getLastRow() - 1
  if (n < 1) return
  const dados = sh.getRange(2, 1, n, COLUNAS.length).getValues()
  dados.forEach(function (r, i) {
    const status = String(r[COL_STATUS - 1] || '')
    if (status.indexOf('ok') === 0) return
    const crm = enviarCrm_({
      nome: r[2], whatsapp: String(r[3]), empresa: r[4], cidade: r[5],
      source: r[8] || r[1], source_detail: r[9],
      tags: String(r[10] || '').split(',').map(function (t) { return t.trim() }).filter(String),
      utm_source: r[11], utm_medium: r[12], utm_campaign: r[13], utm_content: r[14], utm_term: r[15],
      fbclid: r[16], gclid: r[17], fbp: r[18], fbc: r[19], user_agent: r[24],
      notes: r[28] || ['Segmento / tipo de local: ' + r[6], 'Problema / desafio: ' + r[7]].join('\n'),
    })
    sh.getRange(i + 2, COL_STATUS, 1, 2).setValues([[crm.status === 'ok' ? 'ok_reenvio' : crm.status, crm.resposta]])
  })
}
