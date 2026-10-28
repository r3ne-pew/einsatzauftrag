import { jsPDF } from 'jspdf';
import type { ThwAuftrag } from '../domain/auftrag';

type PdfStil = 'thw' | 'allgemein';
type RGB = [number, number, number];
type Farben = { band: RGB; kopf: RGB; kopfText: RGB; text: RGB; linie: RGB; grau: RGB };

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const LEFT = 14;
const WIDTH = PAGE_WIDTH - LEFT * 2;
const BOTTOM = 283;
const THW: Farben = {
  band: [255, 255, 128], kopf: [0, 0, 235], kopfText: [255, 255, 255],
  text: [20, 20, 20], linie: [20, 20, 20], grau: [20, 20, 20],
};
const SW: Farben = {
  band: [235, 235, 235], kopf: [45, 45, 45], kopfText: [255, 255, 255],
  text: [15, 15, 15], linie: [55, 55, 55], grau: [55, 55, 55],
};

function zeilen(pdf: jsPDF, value: string, width: number): string[] {
  if (!value.trim()) return [];
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  const safeWidth = Math.max(1, width - 2.5);
  return value.split(/\r?\n/).flatMap((line) => pdf.splitTextToSize(line || ' ', safeWidth) as string[]);
}

function zelle(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  textLines: string[],
  colors: Farben,
  options: { fill?: RGB; color?: RGB; bold?: boolean; fontSize?: number; align?: 'left' | 'center'; padding?: number } = {},
) {
  const { fill, color, bold = false, fontSize = 8, align = 'left', padding = 1.6 } = options;
  if (fill) {
    pdf.setFillColor(...fill);
    pdf.rect(x, y, width, height, 'F');
  }
  pdf.setDrawColor(...colors.linie);
  pdf.setLineWidth(0.25);
  pdf.rect(x, y, width, height);
  if (textLines.length === 0) return;
  pdf.setTextColor(...(color ?? colors.text));
  pdf.setFont('helvetica', bold ? 'bold' : 'normal');
  pdf.setFontSize(fontSize);
  const textX = align === 'center' ? x + width / 2 : x + padding;
  const baseline = y + padding + fontSize * 0.36;
  const lineHeight = fontSize * 0.3528 * 1.12;
  textLines.forEach((line, index) => {
    pdf.text(line, textX, baseline + index * lineHeight, { align });
  });
}

function kopf(pdf: jsPDF, colors: Farben): number {
  const y = 11;
  const height = 10;
  const thwDesign = colors === THW;
  if (thwDesign) {
    const leftWidth = 26;
    const rightWidth = 45;
    zelle(pdf, LEFT, y, leftWidth, height, ['Fb Fü 3'], colors, {
      bold: true, fontSize: 9, align: 'center',
    });
    zelle(pdf, LEFT + leftWidth, y, WIDTH - leftWidth - rightWidth, height, ['Einsatzauftrag'], colors, {
      fill: colors.kopf, color: colors.kopfText, bold: true, fontSize: 11, align: 'center',
    });
    zelle(pdf, LEFT + WIDTH - rightWidth, y, rightWidth, height, ['Technisches Hilfswerk', 'THW'], colors, {
      bold: true, fontSize: 7.4, align: 'center',
    });
  } else {
    zelle(pdf, LEFT, y, WIDTH, height, ['Einsatzauftrag'], colors, {
      fill: colors.kopf, color: colors.kopfText, bold: true, fontSize: 11, align: 'center',
    });
  }
  return y + height + 5;
}

function neueSeite(pdf: jsPDF, colors: Farben): number {
  pdf.addPage('a4', 'portrait');
  return kopf(pdf, colors);
}

function kopfzeile(pdf: jsPDF, y: number, number: string, title: string, hint: string, colors: Farben): number {
  const titleWidth = 43;
  const titleFont = 9;
  const hintFont = 7.4;
  const titleLines = zeilen(pdf, `${number}. ${title}`, titleWidth - 3.2);
  const hintLines = zeilen(pdf, hint, WIDTH - titleWidth - 3.2);
  const height = Math.max(9, titleLines.length * titleFont * 0.4 + 3.2, hintLines.length * hintFont * 0.4 + 3.2);
  if (y + height > BOTTOM) y = neueSeite(pdf, colors);
  zelle(pdf, LEFT, y, titleWidth, height, titleLines, colors, { fill: colors.band, bold: true, fontSize: titleFont });
  zelle(pdf, LEFT + titleWidth, y, WIDTH - titleWidth, height, hintLines, colors, { fill: colors.band, fontSize: hintFont });
  return y + height;
}

function kopfFeld(pdf: jsPDF, y: number, label: string, value: string, colors: Farben, nummer?: string): number {
  const labelWidth = 35;
  const numberWidth = nummer === undefined ? 0 : 36;
  const valueLines = zeilen(pdf, value, WIDTH - labelWidth - numberWidth - 3.2);
  const numberLines = nummer === undefined ? [] : zeilen(pdf, `lfd. Nr.: ${nummer}`, numberWidth - 3.2);
  let offset = 0;
  let first = true;
  do {
    if (y + 9 > BOTTOM) y = neueSeite(pdf, colors);
    const maxLines = Math.max(1, Math.floor((BOTTOM - y - 3.2) / 3.6));
    const part = valueLines.slice(offset, offset + maxLines);
    const height = Math.max(first && label === 'für den Einsatz' ? 15 : 9, part.length * 3.6 + 3.2, first ? numberLines.length * 3.6 + 3.2 : 0);
    zelle(pdf, LEFT, y, labelWidth, height, first ? zeilen(pdf, label, labelWidth - 3) : [], colors, { fontSize: 8.5 });
    zelle(pdf, LEFT + labelWidth, y, WIDTH - labelWidth - numberWidth, height, part, colors, { fontSize: 8.5 });
    if (nummer !== undefined) zelle(pdf, LEFT + WIDTH - numberWidth, y, numberWidth, height, first ? numberLines : [], colors, { fontSize: 8 });
    y += height;
    offset += part.length;
    first = false;
    if (offset < valueLines.length) y = neueSeite(pdf, colors);
  } while (offset < valueLines.length);
  return y;
}

function zeile(pdf: jsPDF, y: number, code: string, value: string, colors: Farben, minHeight = 7): number {
  const codeWidth = 8;
  const contentWidth = WIDTH - codeWidth;
  const textLines = zeilen(pdf, value, contentWidth - 3.2);
  const fontSize = 8;
  const lineHeight = fontSize * 0.4;
  let offset = 0;
  let first = true;
  do {
    if (y + minHeight > BOTTOM) y = neueSeite(pdf, colors);
    const maxLines = Math.max(1, Math.floor((BOTTOM - y - 3.2) / lineHeight));
    const part = textLines.slice(offset, offset + maxLines);
    const height = Math.max(minHeight, part.length * lineHeight + 3.2);
    zelle(pdf, LEFT, y, codeWidth, height, first ? [code] : [], colors, { fontSize: 7.5, padding: 1.3 });
    zelle(pdf, LEFT + codeWidth, y, contentWidth, height, part, colors, { fontSize, padding: 1.6 });
    y += height;
    offset += part.length;
    first = false;
    if (offset < textLines.length) y = neueSeite(pdf, colors);
  } while (offset < textLines.length);
  return y;
}

function mehrspaltigeFelder(
  pdf: jsPDF,
  y: number,
  values: string[],
  widths: number[],
  colors: Farben,
  fontSize: number,
  padding: number,
  minHeight: number,
): number {
  const content = values.map((value, index) => zeilen(pdf, value, widths[index] - padding * 2));
  const offsets = values.map(() => 0);
  let first = true;

  do {
    if (y + minHeight > BOTTOM) y = neueSeite(pdf, colors);
    const lineHeight = fontSize * 0.4;
    const maxLines = Math.max(1, Math.floor((BOTTOM - y - padding * 2) / lineHeight));
    const chunks = content.map((lines, index) => lines.slice(offsets[index], offsets[index] + maxLines));
    const rowLines = Math.max(1, ...chunks.map((lines) => lines.length));
    const height = Math.max(minHeight, rowLines * lineHeight + padding * 2);
    if (y + height > BOTTOM) {
      y = neueSeite(pdf, colors);
      continue;
    }

    let x = LEFT;
    chunks.forEach((lines, index) => {
      zelle(pdf, x, y, widths[index], height, lines, colors, { fontSize, padding });
      x += widths[index];
      offsets[index] += lines.length;
    });
    y += height;
    first = false;
    if (content.some((lines, index) => offsets[index] < lines.length)) y = neueSeite(pdf, colors);
  } while (first || content.some((lines, index) => offsets[index] < lines.length));

  return y;
}

function schlussfelder(pdf: jsPDF, y: number, data: ThwAuftrag, colors: Farben): number {
  const signatureWidth = WIDTH / 3;
  y = mehrspaltigeFelder(
    pdf,
    y,
    [`Ort, Datum\n${data.ortDatum}`, `Unterschrift\n${data.unterschrift}`, `Dienststellung\n${data.dienststellung}`],
    [signatureWidth, signatureWidth, WIDTH - signatureWidth * 2],
    colors,
    7.5,
    2,
    15,
  );

  return mehrspaltigeFelder(
    pdf,
    y,
    [
      'Abgesandt',
      `am\n${data.abgesandtAm}`,
      `um\n${data.abgesandtUm}`,
      `von\n${data.abgesandtVon}`,
      `Unterschrift:\n${data.versandUnterschrift}`,
    ],
    [28, 30, 18, 50, WIDTH - 126],
    colors,
    7.2,
    1.5,
    11,
  );
}

export function erstelleThwPdf(data: ThwAuftrag, stil: PdfStil = 'thw'): Blob {
  const colors = stil === 'thw' ? THW : SW;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
  pdf.setProperties({
    title: data.einsatz || (stil === 'thw' ? 'THW Einsatzauftrag' : 'Einsatzauftrag'),
    subject: stil === 'thw' ? 'Formblatt Fü 3' : 'Einsatzauftrag',
    creator: 'einsatzauftrag.app',
    keywords: `einsatzauftrag.data.v1=${encodeURIComponent(JSON.stringify(data))}`,
  });
  let y = kopf(pdf, colors);

  y = kopfFeld(pdf, y, 'Absender', data.absender, colors);
  y = kopfFeld(pdf, y, 'für den Einsatz', data.einsatz, colors, data.laufendeNummer);
  y = kopfFeld(pdf, y, 'Empfänger', data.empfaenger, colors);
  y += 4;

  y = kopfzeile(pdf, y, '1', 'Lage', '1a: Gefahren- / Schadenlage, 1b: eigene Lage, 1c: Unterstellung und Abgabe von Kräften', colors);
  y = zeile(pdf, y, '1a', data.lage.gefahrenSchaden, colors, 6.5);
  y = zeile(pdf, y, '1b', data.lage.eigeneLage, colors, 6.5);
  y = zeile(pdf, y, '1c', data.lage.unterstellungAbgabe, colors, 6.5);

  y = kopfzeile(pdf, y, '2', 'Auftrag', 'Erhaltener Auftrag; erforderliche Dienstreisen gelten gem. DA-DR als angeordnet.', colors);
  y = zeile(pdf, y, '', data.auftrag, colors, 14);

  y = kopfzeile(pdf, y, '3', 'Durchführung', '3a: Schwerpunkt und eigene Absicht, 3b: Einzelaufträge, 3c: Zusammenarbeit, Zeitangaben und Schutzmaßnahmen', colors);
  y = zeile(pdf, y, '3a', data.durchfuehrung.schwerpunktAbsicht, colors, 6.5);
  y = zeile(pdf, y, '3b', data.durchfuehrung.einzelauftraege, colors, 6.5);
  y = zeile(pdf, y, '3c', data.durchfuehrung.zusammenarbeitZeitSchutz, colors, 6.5);

  y = kopfzeile(pdf, y, '4', 'Logistik', '4a: Verpflegung, 4b: Verbrauchsgüter, 4c: Betriebsstoff, 4d: Instandsetzung, 4e: Medizin, 4f: Unterbringung, 4g: Haushalt und Abrechnung.', colors);
  const logistik: Array<[string, string]> = [
    ['4a', data.logistik.verpflegung],
    ['4b', data.logistik.verbrauchsgueter],
    ['4c', data.logistik.betriebsstoff],
    ['4d', data.logistik.instandsetzung],
    ['4e', data.logistik.medizinischeVersorgung],
    ['4f', data.logistik.unterbringung],
    ['4g', data.logistik.haushaltHandkasseAbrechnung],
  ];
  for (const [code, value] of logistik) y = zeile(pdf, y, code, value, colors, 6.2);

  y = kopfzeile(pdf, y, '5', 'Führung und Verbindung', 'Telekommunikation, Meldewesen, Führungsstellen, Einsatzleitungen und Platz des Führers.', colors);
  y = zeile(pdf, y, '', data.fuehrungVerbindung.telekommunikationMeldewesen, colors, 7);
  y = zeile(pdf, y, '', data.fuehrungVerbindung.fuehrungsstellenEinsatzleitungen, colors, 7);
  schlussfelder(pdf, y + 4, data, colors);

  const pageCount = pdf.getNumberOfPages();
  const footerY = PAGE_HEIGHT - 5;
  const footerRight = `Seite ${pageCount} von ${pageCount}`;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  const footerRightWidth = pdf.getTextWidth(footerRight);
  const domainLabel = 'einsatzauftrag.app';
  const domainWidth = pdf.getTextWidth(domainLabel);
  const footerGap = 5;
  const footerLeftMaxWidth = PAGE_WIDTH - LEFT * 2 - footerRightWidth - domainWidth - footerGap * 2;
  const date = data.ortDatum.trim() || '—';
  let sender = data.absender.trim() || '—';
  const runningNumber = data.laufendeNummer.trim() || '—';
  let footerLeft = `${date} / ${sender} / lfd. Nr.: ${runningNumber}`;
  while (pdf.getTextWidth(footerLeft) > footerLeftMaxWidth && sender.length > 8) {
    sender = `${sender.slice(0, Math.max(5, sender.length - 4))}…`;
    footerLeft = `${date} / ${sender} / lfd. Nr.: ${runningNumber}`;
  }
  while (pdf.getTextWidth(footerLeft) > footerLeftMaxWidth && pdf.getFontSize() > 5) {
    pdf.setFontSize(pdf.getFontSize() - 0.25);
  }
  const footerFontSize = pdf.getFontSize();
  const footerLines = pdf.getTextWidth(footerLeft) > footerLeftMaxWidth
    ? pdf.splitTextToSize(footerLeft, footerLeftMaxWidth) as string[]
    : [footerLeft];
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(footerFontSize);
    pdf.setTextColor(...colors.grau);
    pdf.text(footerLines[0], LEFT, footerY);
    pdf.text(domainLabel, PAGE_WIDTH - LEFT - footerRightWidth - footerGap, footerY, { align: 'right' });
    pdf.text(`Seite ${page} von ${pageCount}`, PAGE_WIDTH - LEFT, footerY, { align: 'right' });
  }
  return pdf.output('blob');
}

export function erstellePdfDateiname(data: ThwAuftrag, now = new Date()): string {
  const datum = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const uhrzeit = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const bereinige = (value: string, separator: string) =>
    value.trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, separator).replace(/^[ .-]+|[ .-]+$/g, '');
  const teile = [
    `${datum}-${uhrzeit}`,
    bereinige(data.einsatz, '-'),
    bereinige(data.absender, ' '),
    /^\d+$/.test(data.laufendeNummer.trim()) ? data.laufendeNummer.trim().padStart(3, '0') : bereinige(data.laufendeNummer, '-'),
  ].filter(Boolean);
  return `${teile.join(' ')}.pdf`;
}

export function ladeThwPdfHerunter(data: ThwAuftrag, stil: PdfStil = 'thw') {
  const blob = erstelleThwPdf(data, stil);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = erstellePdfDateiname(data);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
