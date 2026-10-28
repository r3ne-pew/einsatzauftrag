import { migriereEinsatzauftrag, type Einsatzauftrag } from '../domain/auftrag';

const STORAGE_KEY = 'einsatzauftrag.entwurf.v1';

export function ladeEntwurf(): Einsatzauftrag | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;

  const parsed: unknown = JSON.parse(raw);
  const auftrag = migriereEinsatzauftrag(parsed);
  if (!auftrag) {
    throw new Error('Der gespeicherte Auftrag hat ein unbekanntes oder ungueltiges Format.');
  }
  return auftrag;
}

export function speichereEntwurf(auftrag: Einsatzauftrag): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auftrag));
}

export function loescheEntwurf(): void {
  localStorage.removeItem(STORAGE_KEY);
}