import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ClipboardList, Clock3, Download, Moon, Printer, RotateCcw, Sun, Upload, WifiOff } from 'lucide-react';
import { neuerEinsatzauftrag, type Einsatzauftrag, type ThwAuftrag } from './domain/auftrag';
import { datumFuerOrtUndDatum, lokalesDatum, lokaleUhrzeit } from './domain/lokaleZeit';
import { ladeEntwurf, loescheEntwurf, speichereEntwurf } from './storage/auftragStorage';
import { leseThwAuftragAusPdf, uebernehmeThwAuftrag, type PdfImportModus } from './import/pdfImport';

type Theme = 'hell' | 'dunkel' | 'nacht';
type PdfStil = 'thw' | 'allgemein';

const THEME_KEY = 'einsatzauftrag.theme.v1';
const PDF_STYLE_KEY = 'einsatzauftrag.pdf-stil.v1';

function ladeEinstellung<T extends string>(key: string, erlaubteWerte: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return erlaubteWerte.includes(value as T) ? value as T : fallback;
  } catch {
    return fallback;
  }
}

function Datum({ value }: { value: string }) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function Feld({
  label,
  value,
  onChange,
  rows = 2,
  type = 'text',
  nowAction,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  type?: 'text' | 'date' | 'time';
  nowAction?: 'date' | 'time';
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const action = nowAction ?? (type === 'date' || type === 'time' ? type : undefined);

  function setCurrentTime() {
    if (action === 'time') {
      onChange(lokaleUhrzeit());
      return;
    }
    if (type === 'date') {
      onChange(lokalesDatum());
      return;
    }
    const date = datumFuerOrtUndDatum();
    const existingDate = value.match(/\b\d{2}\.\d{2}\.\d{4}\b/);
    if (existingDate) {
      onChange(value.replace(existingDate[0], date));
    } else {
      const location = value.trim().replace(/[,\s]+$/, '');
      onChange(location ? `${location}, ${date}` : date);
    }
  }

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldId}>{label}</label>
      {type === 'date' || type === 'time' ? (
        <div className="field-control field-control-temporal">
          <input id={fieldId} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
          <button className="time-now" onClick={setCurrentTime} type="button" aria-label={type === 'date' ? `Heutiges Datum für ${label} einsetzen` : `Aktuelle Uhrzeit für ${label} einsetzen`} title={type === 'date' ? 'Heute einsetzen' : 'Jetzt einsetzen'}>
            {type === 'date' ? <CalendarDays size={14} /> : <Clock3 size={14} />}
            <span>{type === 'date' ? 'Heute' : 'Jetzt'}</span>
          </button>
        </div>
      ) : action ? (
        <div className="field-control field-control-temporal">
          <textarea id={fieldId} ref={textareaRef} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
          <button className="time-now" onClick={setCurrentTime} type="button" aria-label={`Heutiges Datum für ${label} einsetzen`} title="Heute einsetzen">
            <CalendarDays size={14} /><span>Heute</span>
          </button>
        </div>
      ) : (
        <textarea id={fieldId} ref={textareaRef} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function ThwEditor({ data, onChange }: { data: ThwAuftrag; onChange: (path: string, value: string) => void }) {
  const field = (label: string, path: string, value: string, rows = 2, type: 'text' | 'date' | 'time' = 'text', nowAction?: 'date' | 'time') => (
    <Feld key={path} label={label} value={value} rows={rows} type={type} nowAction={nowAction} onChange={(next) => onChange(path, next)} />
  );
  const section = (number: string, title: string, hint: string, fields: React.ReactNode, id: string) => (
    <section className="form-section" id={id} key={id}>
      <header className="section-band">
        <strong>{number}. {title}</strong>
        <span>{hint}</span>
      </header>
      <div className="section-fields">{fields}</div>
    </section>
  );

  return (
    <div className="thw-form">
      <section className="form-section head-section">
        <div className="head-grid">
          {field('Absender', 'absender', data.absender)}
          {field('für den Einsatz', 'einsatz', data.einsatz)}
          {field('lfd. Nr.', 'laufendeNummer', data.laufendeNummer)}
          {field('Empfänger', 'empfaenger', data.empfaenger)}
        </div>
      </section>
      {section('1', 'Lage', '1a: Gefahren- / Schadenlage, 1b: eigene Lage, 1c: Unterstellung und Abgabe von Kräften', <>
        {field('1a', 'lage.gefahrenSchaden', data.lage.gefahrenSchaden, 3)}
        {field('1b', 'lage.eigeneLage', data.lage.eigeneLage, 3)}
        {field('1c', 'lage.unterstellungAbgabe', data.lage.unterstellungAbgabe, 3)}
      </>, 'lage')}
      {section('2', 'Auftrag', 'Erhaltener Auftrag; erforderliche Dienstreisen gelten gem. DA-DR als angeordnet.',
        field('Auftrag', 'auftrag', data.auftrag, 4), 'auftrag')}
      {section('3', 'Durchführung', '3a: Schwerpunkt und eigene Absicht, 3b: Einzelaufträge, 3c: Zusammenarbeit, Zeitangaben und Schutzmaßnahmen', <>
        {field('3a · Schwerpunkt, eigene Absicht', 'durchfuehrung.schwerpunktAbsicht', data.durchfuehrung.schwerpunktAbsicht, 3)}
        {field('3b · Einzelaufträge', 'durchfuehrung.einzelauftraege', data.durchfuehrung.einzelauftraege, 3)}
        {field('3c · Zusammenarbeit, Zeiten, Schutz', 'durchfuehrung.zusammenarbeitZeitSchutz', data.durchfuehrung.zusammenarbeitZeitSchutz, 3)}
      </>, 'durchfuehrung')}
      {section('4', 'Logistik', 'Verpflegung, Verbrauchsgüter, Betriebsstoff, Instandsetzung, medizinische Versorgung, Unterbringung und Abrechnung', <>
        {field('4a · Verpflegung', 'logistik.verpflegung', data.logistik.verpflegung)}
        {field('4b · Verbrauchsgüter', 'logistik.verbrauchsgueter', data.logistik.verbrauchsgueter)}
        {field('4c · Betriebsstoff', 'logistik.betriebsstoff', data.logistik.betriebsstoff)}
        {field('4d · Instandsetzung', 'logistik.instandsetzung', data.logistik.instandsetzung)}
        {field('4e · Medizinische Versorgung', 'logistik.medizinischeVersorgung', data.logistik.medizinischeVersorgung)}
        {field('4f · Unterbringung', 'logistik.unterbringung', data.logistik.unterbringung)}
        {field('4g · Haushalt, Handkasse, Abrechnung', 'logistik.haushaltHandkasseAbrechnung', data.logistik.haushaltHandkasseAbrechnung)}
      </>, 'logistik')}
      {section('5', 'Führung und Verbindung', 'Telekommunikationsverbindungen, Meldewesen, Führungsstellen, Einsatzleitungen und Platz des Führers', <>
        {field('Telekommunikationsverbindungen und Meldewesen', 'fuehrungVerbindung.telekommunikationMeldewesen', data.fuehrungVerbindung.telekommunikationMeldewesen, 3)}
        {field('Führungsstellen, Einsatzleitungen, Platz des Führers', 'fuehrungVerbindung.fuehrungsstellenEinsatzleitungen', data.fuehrungVerbindung.fuehrungsstellenEinsatzleitungen, 3)}
      </>, 'fuehrung')}
      <section className="form-section signature-section">
        <div className="signature-grid">
          {field('Ort, Datum', 'ortDatum', data.ortDatum, 2, 'text', 'date')}
          {field('Unterschrift', 'unterschrift', data.unterschrift)}
          {field('Dienststellung', 'dienststellung', data.dienststellung)}
        </div>
        <div className="dispatch-grid">
          {field('Abgesandt', 'abgesandtAm', data.abgesandtAm, 1, 'date')}
          {field('um', 'abgesandtUm', data.abgesandtUm, 1, 'time')}
          {field('von', 'abgesandtVon', data.abgesandtVon, 1)}
          {field('Unterschrift', 'versandUnterschrift', data.versandUnterschrift, 1)}
        </div>
      </section>
    </div>
  );
}

function App() {
  const dateiInputRef = useRef<HTMLInputElement>(null);
  const [auftrag, setAuftrag] = useState<Einsatzauftrag>(() => {
    try {
      return ladeEntwurf() ?? neuerEinsatzauftrag();
    } catch {
      return neuerEinsatzauftrag();
    }
  });
  const [blockiertesSpeichern, setBlockiertesSpeichern] = useState(() => {
    try {
      ladeEntwurf();
      return false;
    } catch {
      return true;
    }
  });
  const [theme, setTheme] = useState<Theme>(() => ladeEinstellung(THEME_KEY, ['hell', 'dunkel', 'nacht'], 'hell'));
  const [pdfStil, setPdfStil] = useState<PdfStil>(() => ladeEinstellung(PDF_STYLE_KEY, ['thw', 'allgemein'], 'thw'));
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null);
  const [gespeichertAm, setGespeichertAm] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [neustartBestaetigen, setNeustartBestaetigen] = useState(false);
  const [pdfImportDaten, setPdfImportDaten] = useState<ThwAuftrag | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.dataset.theme = theme;
    } catch {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem(PDF_STYLE_KEY, pdfStil); } catch { /* Einstellung bleibt für diese Sitzung aktiv. */ }
  }, [pdfStil]);

  useEffect(() => {
    if (blockiertesSpeichern) return;
    try {
      speichereEntwurf(auftrag);
      setGespeichertAm(new Date().toISOString());
      setSpeicherFehler(null);
    } catch {
      setSpeicherFehler('Speichern auf diesem Gerät nicht möglich. Bitte freien Speicher prüfen.');
    }
  }, [auftrag, blockiertesSpeichern]);

  useEffect(() => {
    const online = () => setOffline(false);
    const offlineEvent = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offlineEvent);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offlineEvent);
    };
  }, []);

  function aktualisiereThwFeld(path: string, value: string) {
    const [section, field] = path.split('.');
    setAuftrag((current) => {
      const thw = current.thw;
      if (!field) return { ...current, geaendertAm: new Date().toISOString(), thw: { ...thw, [section]: value } };
      const nested = thw[section as keyof ThwAuftrag];
      if (!nested || typeof nested !== 'object') return current;
      return { ...current, geaendertAm: new Date().toISOString(), thw: { ...thw, [section]: { ...nested, [field]: value } } } as Einsatzauftrag;
    });
  }

  async function exportierePdf() {
    try {
      const { ladeThwPdfHerunter } = await import('./export/thwPdf');
      ladeThwPdfHerunter(auftrag.thw, pdfStil);
      setSpeicherFehler(null);
    } catch {
      setSpeicherFehler('Das PDF konnte nicht erstellt werden. Bitte erneut versuchen.');
    }
  }

  async function importierePdf(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = await leseThwAuftragAusPdf(file);
      setPdfImportDaten(imported);
      setSpeicherFehler(null);
    } catch (error) {
      setSpeicherFehler(error instanceof Error ? error.message : 'Die PDF konnte nicht gelesen werden.');
    }
  }

  function uebernehmePdf(modus: PdfImportModus) {
    if (!pdfImportDaten) return;
    setAuftrag((current) => ({
      ...current,
      thw: uebernehmeThwAuftrag(current.thw, pdfImportDaten, modus),
      geaendertAm: new Date().toISOString(),
    }));
    setPdfImportDaten(null);
  }

  function beginneNeu() {
    try {
      loescheEntwurf();
      setAuftrag(neuerEinsatzauftrag());
      setBlockiertesSpeichern(false);
      setSpeicherFehler(null);
    } catch {
      setSpeicherFehler('Der gespeicherte Entwurf konnte nicht entfernt werden.');
    }
  }

  const statusText = speicherFehler || (blockiertesSpeichern
    ? 'Entwurf nicht lesbar · nicht überschrieben'
    : gespeichertAm
      ? `Lokal gespeichert · ${new Intl.DateTimeFormat('de-DE', { timeStyle: 'short' }).format(new Date(gespeichertAm))} Uhr`
      : 'Lokaler Entwurf');

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="topbar screen-only">
        <a className="brand" href="#start" aria-label="Einsatzauftrag Start">
          <span className="brand-mark"><ClipboardList size={20} /></span>
          <span className="brand-copy"><strong>Einsatzauftrag</strong><small>FORMBLATT FÜ 3 · THW</small></span>
        </a>
        <div className="topbar-tools">
          <div className="setting-group" aria-label="Oberflächen-Design">
            <span className="setting-label">Ansicht</span>
            <div className="segmented" role="group" aria-label="Farbschema">
              <button className={theme === 'hell' ? 'selected' : ''} onClick={() => setTheme('hell')} aria-label="Hell" title="Hell" type="button"><Sun size={15} /></button>
              <button className={theme === 'dunkel' ? 'selected' : ''} onClick={() => setTheme('dunkel')} aria-label="Dunkel" title="Dunkel" type="button"><Moon size={15} /></button>
              <button className={theme === 'nacht' ? 'selected' : ''} onClick={() => setTheme('nacht')} aria-label="Nacht" title="Nacht" type="button"><span className="night-icon">N</span></button>
            </div>
          </div>
          <div className="setting-group pdf-setting">
            <span className="setting-label">PDF</span>
            <div className="segmented pdf-segmented" role="group" aria-label="PDF-Design">
              <button className={pdfStil === 'thw' ? 'selected' : ''} onClick={() => setPdfStil('thw')} type="button">THW</button>
              <button className={pdfStil === 'allgemein' ? 'selected' : ''} onClick={() => setPdfStil('allgemein')} type="button">S/W</button>
            </div>
          </div>
          <span className="save-indicator"><span className="save-dot" />{statusText}</span>
          <input ref={dateiInputRef} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => void importierePdf(event)} />
          <button className="button button-secondary" onClick={() => dateiInputRef.current?.click()} type="button"><Upload size={15} /> PDF laden</button>
          <button className="button button-primary" onClick={() => void exportierePdf()} type="button"><Download size={16} /> PDF erstellen</button>
        </div>
      </header>

      {offline && <div className="offline-strip screen-only" role="status"><WifiOff size={15} /> Offline · Entwurf bleibt auf diesem Gerät.</div>}
      {blockiertesSpeichern && (
        <div className="storage-warning screen-only" role="alert">
          <span>Der gespeicherte Entwurf kann nicht gelesen werden und bleibt unangetastet.</span>
          <button className="button button-warning" onClick={() => setNeustartBestaetigen(true)} type="button">Neuen Entwurf beginnen</button>
        </div>
      )}

      <main className="editor screen-only" id="start">
        <div className="document-heading">
          <div className="eyebrow"><span /> THW · EINSATZAUFTRAG</div>
          <div className="heading-row">
            <div>
              <h1>{auftrag.thw.einsatz || 'Einsatzauftrag'}</h1>
              <p className="document-subtitle">Ein Formular · automatisch lokal gespeichert · PDF nach Formblatt Fü 3</p>
            </div>
            <div className="reference-mark"><strong>Fb Fü 3</strong><span>Technisches Hilfswerk</span></div>
          </div>
        </div>
        {speicherFehler && <p className="error-message" role="alert">{speicherFehler}</p>}
        <ThwEditor data={auftrag.thw} onChange={aktualisiereThwFeld} />
        <footer className="editor-footer">
          <span><Check size={15} /> {statusText}</span>
          <div className="footer-actions">
            <button className="reset-link" onClick={() => setNeustartBestaetigen(true)} type="button"><RotateCcw size={14} /> Neuer Auftrag</button>
            <button className="button button-primary" onClick={() => void exportierePdf()} type="button"><Printer size={16} /> PDF erstellen</button>
          </div>
        </footer>
      </main>

      {neustartBestaetigen && (
        <div className="dialog-backdrop screen-only" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setNeustartBestaetigen(false);
        }}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-copy">
            <div className="confirm-icon"><RotateCcw size={19} /></div>
            <h2 id="confirm-title">Neuen Auftrag beginnen?</h2>
            <p id="confirm-copy">Der aktuelle Entwurf auf diesem Gerät wird ersetzt. Erstelle vorher das PDF, wenn du ihn noch brauchst.</p>
            <div className="confirm-actions">
              <button className="button button-cancel" onClick={() => setNeustartBestaetigen(false)} type="button">Weiter bearbeiten</button>
              <button className="button button-warning" onClick={() => { beginneNeu(); setNeustartBestaetigen(false); }} type="button">Entwurf verwerfen</button>
            </div>
          </section>
        </div>
      )}
      {pdfImportDaten && (
        <div className="dialog-backdrop screen-only" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPdfImportDaten(null);
        }}>
          <section className="confirm-dialog pdf-import-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-import-title" aria-describedby="pdf-import-copy">
            <div className="confirm-icon"><Upload size={19} /></div>
            <h2 id="pdf-import-title">PDF übernehmen</h2>
            <p id="pdf-import-copy">Die PDF enthält einen Einsatzauftrag. Wähle, wie Auftrag und Durchführung übernommen werden sollen.</p>
            <div className="import-choices">
              <button className="import-choice" onClick={() => uebernehmePdf('vollstaendig')} type="button">
                <strong>Alle Felder wiederherstellen</strong>
                <span>Jedes Formularfeld wird exakt aus der PDF übernommen.</span>
              </button>
              <button className="import-choice" onClick={() => uebernehmePdf('durchreichen')} type="button">
                <strong>Auftrag zusammenführen</strong>
                <span>Auftrag und Durchführung kommen gemeinsam in „Auftrag“. Durchführung bleibt frei.</span>
              </button>
            </div>
            <div className="confirm-actions">
              <button className="button button-cancel" onClick={() => setPdfImportDaten(null)} type="button">Abbrechen</button>
            </div>
          </section>
        </div>
      )}
      <footer className="site-footer screen-only">
        <span>einsatzauftrag.app</span>
        <nav aria-label="Rechtliche Informationen">
          <a href="https://r3ne.de/IMPRESSUM/index.html" target="_blank" rel="noreferrer">Impressum</a>
          <a href="https://r3ne.de/DATENSCHUTZ/index.html" target="_blank" rel="noreferrer">Datenschutz</a>
        </nav>
      </footer>
      <span className="sr-only"><Datum value={auftrag.geaendertAm} /></span>
    </div>
  );
}

export default App;
