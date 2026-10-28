import { describe, expect, it } from 'vitest';
import { istEinsatzauftrag, migriereEinsatzauftrag, neuerEinsatzauftrag, neuerThwAuftrag } from './auftrag';
import { erstellePdfDateiname, erstelleThwPdf } from '../export/thwPdf';
import { leseThwAuftragAusPdf, uebernehmeThwAuftrag } from '../import/pdfImport';
import { datumFuerOrtUndDatum, lokalesDatum, lokaleUhrzeit } from './lokaleZeit';

describe('Einsatzauftrag', () => {
  it('legt einen versionierten Auftrag mit allen Abschnitten an', () => {
    const auftrag = neuerEinsatzauftrag(new Date('2026-10-28T12:00:00.000Z'));

    expect(auftrag.schemaVersion).toBe(2);
    expect(auftrag.erstelltAm).toBe('2026-10-28T12:00:00.000Z');
    expect(istEinsatzauftrag(auftrag)).toBe(true);
    expect(auftrag.einheit.staerke).toEqual({ fuehrung: 0, unterfuehrung: 0, mannschaft: 0 });
  });

  it('weist ein unbekanntes Schema zurueck', () => {
    expect(istEinsatzauftrag({ schemaVersion: 9 })).toBe(false);
  });

  it('migriert einen bestehenden v1-Entwurf ohne seine Daten zu verlieren', () => {
    const original = neuerEinsatzauftrag();
    const v1 = { ...original, schemaVersion: 1 };
    const migrated = migriereEinsatzauftrag(v1);

    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.auftraggeber).toEqual(original.auftraggeber);
    expect(migrated?.modus).toBe('allgemein');
    expect(migrated?.thw.logistik.verpflegung).toBe('');
  });

  it('erzeugt aus dem THW-Formular ein A4-PDF und setzt lange Inhalte fort', async () => {
    const data = neuerThwAuftrag();
    const endMarker = 'END_OF_LONG_ORDER_CONTENT';
    const signatureMarker = 'END_OF_SIGNATURE_CONTENT';
    data.ortDatum = 'DATE_FOOTER_MARKER';
    data.absender = 'SENDER_FOOTER_MARKER';
    data.laufendeNummer = '009';
    data.auftrag = `${'Ausführliche Lagebeschreibung mit Kräften und Maßnahmen. '.repeat(350)}${endMarker}`;
    data.unterschrift = `${'Langtext Unterschrift. '.repeat(80)}${signatureMarker}`;
    const pdf = erstelleThwPdf(data);
    const content = await pdf.text();
    const pageCount = (content.match(/\/Type \/Page\b/g) ?? []).length;

    expect(pdf.type).toBe('application/pdf');
    expect(pdf.size).toBeGreaterThan(5000);
    expect(pageCount).toBeGreaterThan(1);
    expect(content).toContain(endMarker);
    expect(content).toContain(signatureMarker);
    expect(content).toContain('DATE_FOOTER_MARKER');
    expect(content).toContain('SENDER_FOOTER_MARKER');
    expect(content).toContain('DATE_FOOTER_MARKER / SENDER_FOOTER_MARKER / lfd. Nr.: 009');
    expect((content.match(/einsatzauftrag\.app/g) ?? []).length).toBeGreaterThanOrEqual(pageCount);
    expect(content).not.toContain('Datum: DATE_FOOTER_MARKER');
    expect(content).not.toContain('Absender: SENDER_FOOTER_MARKER');
    for (let page = 1; page <= pageCount; page += 1) {
      expect(content).toContain(`Seite ${page} von ${pageCount}`);
    }
    expect((content.match(/DATE_FOOTER_MARKER/g) ?? []).length).toBe(pageCount + 2);
    expect((content.match(/SENDER_FOOTER_MARKER/g) ?? []).length).toBe(pageCount + 2);
    expect((content.match(/Einsatzauftrag/g) ?? []).length).toBeGreaterThanOrEqual(pageCount);
    expect((content.match(/Technisches Hilfswerk/g) ?? []).length).toBe(pageCount);

    const swPdf = erstelleThwPdf(data, 'allgemein');
    const swContent = await swPdf.text();
    const swPageCount = (swContent.match(/\/Type \/Page\b/g) ?? []).length;
    expect(swContent).toContain(endMarker);
    expect(swContent).toContain(signatureMarker);
    expect((swContent.match(/Einsatzauftrag/g) ?? []).length).toBeGreaterThanOrEqual(swPageCount);
    expect(swContent).not.toContain('Technisches Hilfswerk');
    expect(swContent).not.toContain('(THW) Tj');
    expect(swContent).not.toContain('Fb Fü 3');
  });

  it('formatiert den Dateinamen mit Zeit, Einsatz, Absender und laufender Nummer', () => {
    const data = neuerThwAuftrag();
    data.einsatz = 'Hochwasser Lage 4';
    data.absender = 'THW OV Beispielstadt';
    data.laufendeNummer = '9';

    expect(erstellePdfDateiname(data, new Date(2026, 9, 28, 1, 20))).toBe(
      '261028-0120 Hochwasser-Lage-4 THW OV Beispielstadt 009.pdf',
    );
  });

  it('formatiert Heute und Jetzt als lokale Eingabewerte', () => {
    const now = new Date(2026, 9, 30, 9, 7);

    expect(lokalesDatum(now)).toBe('2026-10-30');
    expect(lokaleUhrzeit(now)).toBe('09:07');
    expect(datumFuerOrtUndDatum(now)).toBe('30.10.2026');
  });

  it('übernimmt beim vollständigen PDF-Import alle Formularfelder unverändert', () => {
    const imported = neuerThwAuftrag();
    imported.absender = 'THW Regionalstelle ARNSBERG';
    imported.auftrag = 'Wasser fördern';
    imported.durchfuehrung.schwerpunktAbsicht = 'Schwerpunkt Pumpen';

    expect(uebernehmeThwAuftrag(neuerThwAuftrag(), imported, 'vollstaendig')).toEqual(imported);
  });

  it('stellt alle Formulardaten aus einer exportierten PDF wieder her', async () => {
    const original = neuerThwAuftrag();
    original.absender = 'THW Regionalstelle ARNSBERG';
    original.laufendeNummer = '004';
    original.auftrag = 'Wasser fördern';
    original.durchfuehrung.einzelauftraege = 'Pumpe am Gebäude einsetzen';
    const blob = erstelleThwPdf(original);
    const file = new File([await blob.arrayBuffer()], 'auftrag.pdf', { type: 'application/pdf' });

    await expect(leseThwAuftragAusPdf(file)).resolves.toEqual(original);
  });

  it('führt beim Durchreichen Auftrag und Durchführung zusammen und leert Durchführung', () => {
    const current = neuerThwAuftrag();
    current.auftrag = 'Vorheriger Auftrag';
    const imported = neuerThwAuftrag();
    imported.absender = 'Abgebende Stelle';
    imported.empfaenger = 'Übernehmende Stelle';
    imported.auftrag = 'Auftragstext';
    imported.durchfuehrung.schwerpunktAbsicht = 'Schwerpunkt';
    imported.durchfuehrung.einzelauftraege = 'Einzelaufträge';
    imported.durchfuehrung.zusammenarbeitZeitSchutz = 'Zusammenarbeit';

    const result = uebernehmeThwAuftrag(current, imported, 'durchreichen');

    expect(result.absender).toBe('Übernehmende Stelle');
    expect(result.empfaenger).toBe('');
    expect(result.abgesandtAm).toBe('');
    expect(result.abgesandtUm).toBe('');
    expect(result.abgesandtVon).toBe('');
    expect(result.versandUnterschrift).toBe('');
    expect(result.auftrag).toBe('Auftragstext\n\nSchwerpunkt\n\nEinzelaufträge\n\nZusammenarbeit');
    expect(result.durchfuehrung).toEqual({
      schwerpunktAbsicht: '',
      einzelauftraege: '',
      zusammenarbeitZeitSchutz: '',
    });
  });
});