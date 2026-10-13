import { jsPDF } from 'jspdf';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('de-DE') : '');
const yn = (v) => (v === 'ja' ? 'Ja' : v === 'nein' ? 'Nein' : '');

export function downloadFragebogenPdf(f) {
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16).setFont('helvetica', 'bold');
  doc.text('Personalfragebogen Minijob', 15, y);
  y += 12;
  doc.setFontSize(10);

  const row = (label, value) => {
    doc.setFont('helvetica', 'bold').text(label, 15, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(String(value || '-'), 115);
    doc.text(lines, 75, y);
    y += Math.max(7, lines.length * 5 + 2);
  };
  const head = (t) => { y += 3; doc.setFont('helvetica', 'bold').setFontSize(11).text(t, 15, y); doc.setFontSize(10); y += 7; };

  row('Name, Vorname', f.name);
  row('Straße', f.strasse);
  row('PLZ, Wohnort', f.plz_ort);
  row('Nationalität', f.nationalitaet);
  row('Eintritt', fmt(f.eintritt));
  row('Tätigkeit', f.taetigkeit);
  row('Schul-/Berufsausbildung', f.ausbildung);
  row('Wöchentl. Arbeitszeit', `${f.wochenstunden || '-'} h  (Mo ${f.az_mo || '-'}, Di ${f.az_di || '-'}, Mi ${f.az_mi || '-'}, Do ${f.az_do || '-'}, Fr ${f.az_fr || '-'}, Sa ${f.az_sa || '-'}, So ${f.az_so || '-'})`);
  row('Stundenlohn/Festbetrag', f.lohn);
  row('Steuer-IdNr.', f.steuer_id);
  row('Rentenversicherungs-Nr.', f.rv_nummer);
  head('Falls keine Rentenversicherungs-Nr. vorhanden');
  row('Geburtsdatum', fmt(f.geburtsdatum));
  row('Geburtsname', f.geburtsname);
  row('Geburtsort', f.geburtsort);
  row('Krankenkasse', f.krankenkasse);
  head('Angaben zur Beschäftigung');
  row('Befreiungsantrag Rentenvers.', f.befreiungsantrag === 'ja' ? 'Ja (Antrag beifügen)' : yn(f.befreiungsantrag));
  row('Versicherungspfl. Beschäftigung', yn(f.versicherungspflichtig));
  row('Weitere geringf. Beschäftigung', yn(f.weitere_geringfuegig));
  if (f.weitere_geringfuegig === 'ja') row('Seit wann / Verdienst', f.weitere_details);
  head('Bankverbindung');
  row('Kreditinstitut', f.kreditinstitut);
  row('IBAN', f.iban);
  row('BIC', f.bic);
  y += 6;
  const decl = 'Ich versichere, dass ich die vorstehenden Angaben nach bestem Wissen und Gewissen gemacht habe und verpflichte mich, alle Veränderungen unverzüglich meinem Arbeitgeber mitzuteilen.';
  doc.setFontSize(8).text(doc.splitTextToSize(decl, 180), 15, y);
  y += 12;
  doc.setFontSize(10).text(`Bestätigt: ${f.bestaetigt ? 'Ja' : 'Nein'} | ${f.ort_datum || ''} | ${f.name || ''}`, 15, y);
  y += 8;
  doc.setFont('helvetica', 'bold').text('Unterschrift:', 15, y);
  if (f.unterschrift) {
    try { doc.addImage(f.unterschrift, 'PNG', 50, y - 12, 60, 24); } catch (e) {}
  }

  doc.save(`Personalfragebogen_${(f.name || 'Mitarbeiter').replace(/[^\wäöüÄÖÜß-]+/g, '_')}.pdf`);
}