// Apps Script Web App per avisar Coordinació general de cada nova incidència BBB.
//
// Desplegament:
// 1. Crea un projecte a https://script.google.com/ i enganxa aquest fitxer.
// 2. Deploy > New deployment > Web app.
// 3. Execute as: Me. Who has access: Anyone.
// 4. Autoritza MailApp.
// 5. Copia la URL acabada en /exec a INCIDENT_NOTIFY_URL a
//    incidencies-pavellons-badalona.html.

var COORDINACIO_GENERAL_EMAIL = 'dtecnic@cbsantjosep.cat';
var NOTIFIED_IDS_PROPERTY = 'bbbIncidentNotifiedIds';
var MAX_NOTIFIED_IDS = 500;

function doPost(e) {
  try {
    var incident = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    validarIncidencia(incident);
    if (incidenciaJaNotificada(incident.id)) {
      return respostaJson({ ok:true, duplicate:true });
    }
    enviarAvís(incident);
    marcarIncidenciaNotificada(incident.id);
    return respostaJson({ ok:true, sentTo:COORDINACIO_GENERAL_EMAIL });
  } catch (error) {
    Logger.log('Error enviant l’avís d’incidència BBB: ' + error);
    return respostaJson({ ok:false, error:String(error) });
  }
}

function validarIncidencia(incident) {
  var obligatoris = ['id', 'createdAt', 'entity', 'contactName', 'email', 'venue', 'type', 'priority', 'description'];
  obligatoris.forEach(function(camp) {
    if (!String(incident && incident[camp] || '').trim()) throw new Error('Falta ' + camp + '.');
  });
}

function enviarAvís(incident) {
  var subject = 'Nova incidència BBB · ' + valor(incident.venue) + ' · ' + valor(incident.type);
  var files = [
    ['Entitat', incident.entity],
    ['Persona de contacte', incident.contactName],
    ['Correu', incident.email],
    ['Pavelló', incident.venue],
    ['Tipus', incident.type],
    ['Prioritat', incident.priority],
    ['Data detectada', incident.detectedOn || 'No indicada'],
    ['Data de registre', formatarDataHora(incident.createdAt)]
  ];
  var htmlFiles = files.map(function(fila) {
    return '<tr><th style="padding:8px 10px;text-align:left;background:#eef6fa;border-bottom:1px solid #dbe4ea">' + escapeHtml(fila[0]) + '</th><td style="padding:8px 10px;border-bottom:1px solid #dbe4ea">' + escapeHtml(fila[1]) + '</td></tr>';
  }).join('');
  var html = '<div style="font-family:Arial,sans-serif;color:#172033;max-width:680px">'
    + '<h2 style="margin:0 0 12px;color:#075985">Nova incidència de Badalona Bàsquet Base</h2>'
    + '<table style="border-collapse:collapse;width:100%;font-size:14px">' + htmlFiles + '</table>'
    + '<h3 style="margin:18px 0 6px;color:#075985;font-size:15px">Descripció</h3>'
    + '<div style="padding:12px;background:#f4f7f9;border-left:4px solid #075985;white-space:pre-wrap">' + escapeHtml(incident.description) + '</div>'
    + '</div>';
  var text = 'Nova incidència BBB\n\n'
    + files.map(function(fila) { return fila[0] + ': ' + valor(fila[1]); }).join('\n')
    + '\n\nDescripció:\n' + valor(incident.description);
  MailApp.sendEmail({ to:COORDINACIO_GENERAL_EMAIL, subject:subject, body:text, htmlBody:html, name:'Badalona Bàsquet Base' });
}

function incidenciaJaNotificada(id) {
  var ids = llegirIdsNotificats();
  return ids.indexOf(String(id)) !== -1;
}

function marcarIncidenciaNotificada(id) {
  var ids = llegirIdsNotificats();
  ids.push(String(id));
  PropertiesService.getScriptProperties().setProperty(NOTIFIED_IDS_PROPERTY, JSON.stringify(ids.slice(-MAX_NOTIFIED_IDS)));
}

function llegirIdsNotificats() {
  try {
    var valorPropietat = PropertiesService.getScriptProperties().getProperty(NOTIFIED_IDS_PROPERTY);
    var ids = JSON.parse(valorPropietat || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch (error) { return []; }
}

function valor(value) { return String(value || '').trim(); }
function escapeHtml(value) { return valor(value).replace(/[&<>"']/g, function(char) { return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]; }); }
function formatarDataHora(value) { var data = new Date(value); return isNaN(data.getTime()) ? valor(value) : Utilities.formatDate(data, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'); }
function respostaJson(objecte) { return ContentService.createTextOutput(JSON.stringify(objecte)).setMimeType(ContentService.MimeType.JSON); }
