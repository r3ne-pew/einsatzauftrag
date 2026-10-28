import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { ThwAuftrag } from '../domain/auftrag';

export type PdfImportModus = 'vollstaendig' | 'durchreichen';

const METADATA_PREFIX = 'einsatzauftrag.data.v1=';

function istThwAuftrag(value: unknown): value is ThwAuftrag {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<ThwAuftrag>;
  return (
    typeof data.absender === 'string' &&
    typeof data.einsatz === 'string' &&
    typeof data.laufendeNummer === 'string' &&
    typeof data.empfaenger === 'string' &&
    typeof data.auftrag === 'string' &&
    typeof data.ortDatum === 'string' &&
    !!data.lage && typeof data.lage.gefahrenSchaden === 'string' &&
    typeof data.lage.eigeneLage === 'string' && typeof data.lage.unterstellungAbgabe === 'string' &&
    !!data.durchfuehrung && typeof data.durchfuehrung.schwerpunktAbsicht === 'string' &&
    typeof data.durchfuehrung.einzelauftraege === 'string' &&
    typeof data.durchfuehrung.zusammenarbeitZeitSchutz === 'string' &&
    !!data.logistik && typeof data.logistik.verpflegung === 'string' &&
    typeof data.logistik.verbrauchsgueter === 'string' && typeof data.logistik.betriebsstoff === 'string' &&
    typeof data.logistik.instandsetzung === 'string' && typeof data.logistik.medizinischeVersorgung === 'string' &&
    typeof data.logistik.unterbringung === 'string' && typeof data.logistik.haushaltHandkasseAbrechnung === 'string' &&
    !!data.fuehrungVerbindung && typeof data.fuehrungVerbindung.telekommunikationMeldewesen === 'string' &&
    typeof data.fuehrungVerbindung.fuehrungsstellenEinsatzleitungen === 'string'
  );
}

export async function leseThwAuftragAusPdf(file: File): Promise<ThwAuftrag> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Bitte eine PDF-Datei auswählen.');
  }
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined') GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  try {
    const metadata = await pdf.getMetadata();
    const keywords = (metadata.info as Record<string, unknown>)?.Keywords;
    const raw = typeof keywords === 'string'
      ? keywords.split(/\s*,\s*/).find((entry) => entry.startsWith(METADATA_PREFIX))
      : undefined;
    if (!raw) {
      throw new Error('Diese PDF enthält keine wiederherstellbaren Formularfelder. Bitte eine mit dem Einsatzauftrag-Editor erzeugte PDF verwenden.');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(decodeURIComponent(raw.slice(METADATA_PREFIX.length)));
    } catch {
      throw new Error('Die eingebetteten Auftragsdaten in dieser PDF sind beschädigt.');
    }
    if (!istThwAuftrag(parsed)) throw new Error('Die eingebetteten Auftragsdaten sind unvollständig oder nicht kompatibel.');
    return parsed;
  } finally {
    await loadingTask.destroy();
  }
}

export function uebernehmeThwAuftrag(current: ThwAuftrag, imported: ThwAuftrag, modus: PdfImportModus): ThwAuftrag {
  if (modus === 'vollstaendig') return structuredClone(imported);
  const auftragsTexte = [imported.auftrag, ...Object.values(imported.durchfuehrung)]
    .map((text) => text.trim())
    .filter(Boolean);
  return {
    ...current,
    absender: imported.empfaenger,
    einsatz: imported.einsatz,
    laufendeNummer: imported.laufendeNummer,
    empfaenger: '',
    lage: structuredClone(imported.lage),
    auftrag: auftragsTexte.join('\n\n'),
    durchfuehrung: {
      schwerpunktAbsicht: '',
      einzelauftraege: '',
      zusammenarbeitZeitSchutz: '',
    },
    logistik: structuredClone(imported.logistik),
    fuehrungVerbindung: structuredClone(imported.fuehrungVerbindung),
    ortDatum: imported.ortDatum,
    unterschrift: imported.unterschrift,
    dienststellung: imported.dienststellung,
    abgesandtAm: '',
    abgesandtUm: '',
    abgesandtVon: '',
    versandUnterschrift: '',
  };
}
