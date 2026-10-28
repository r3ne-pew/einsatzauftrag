export type Staerke = {
  fuehrung: number;
  unterfuehrung: number;
  mannschaft: number;
};

export type Auftraggeber = {
  organisation: string;
  stelle: string;
  ansprechperson: string;
  funktion: string;
  funk: string;
  telefon: string;
  erteiltAm: string;
};

export type Einheit = {
  organisation: string;
  bezeichnung: string;
  einheitstyp: string;
  fuehrungskraft: string;
  funk: string;
  staerke: Staerke;
  fahrzeuge: string;
  standort: string;
};

export type Lage = {
  stand: string;
  lagebild: string;
  gefahren: string;
  eigeneKraefte: string;
  betroffeneBereiche: string;
};

export type Auftrag = {
  kurzbezeichnung: string;
  auftragstext: string;
  einsatzraum: string;
  einsatzziel: string;
  prioritaeten: string;
  frist: string;
};

export type Durchfuehrung = {
  massnahmen: string;
  abschnittsbildung: string;
  gefahrenhinweise: string;
  rueckmeldung: string;
};

export type Versorgung = {
  personal: string;
  material: string;
  kraftstoff: string;
  sanitaet: string;
  nachforderung: string;
  versorgungsstelle: string;
};

export type FuehrungKommunikation = {
  fuehrungspunkt: string;
  fuehrungsstruktur: string;
  funkgruppe: string;
  meldeweg: string;
  meldetakt: string;
  ausfallverfahren: string;
};

export type ThwAuftrag = {
  absender: string;
  einsatz: string;
  laufendeNummer: string;
  empfaenger: string;
  lage: {
    gefahrenSchaden: string;
    eigeneLage: string;
    unterstellungAbgabe: string;
  };
  auftrag: string;
  durchfuehrung: {
    schwerpunktAbsicht: string;
    einzelauftraege: string;
    zusammenarbeitZeitSchutz: string;
  };
  logistik: {
    verpflegung: string;
    verbrauchsgueter: string;
    betriebsstoff: string;
    instandsetzung: string;
    medizinischeVersorgung: string;
    unterbringung: string;
    haushaltHandkasseAbrechnung: string;
  };
  fuehrungVerbindung: {
    telekommunikationMeldewesen: string;
    fuehrungsstellenEinsatzleitungen: string;
  };
  ortDatum: string;
  unterschrift: string;
  dienststellung: string;
  abgesandtAm: string;
  abgesandtUm: string;
  abgesandtVon: string;
  versandUnterschrift: string;
};

export type Einsatzauftrag = {
  schemaVersion: 2;
  modus: 'allgemein' | 'thw';
  id: string;
  erstelltAm: string;
  geaendertAm: string;
  auftraggeber: Auftraggeber;
  einheit: Einheit;
  lage: Lage;
  auftrag: Auftrag;
  durchfuehrung: Durchfuehrung;
  versorgung: Versorgung;
  fuehrungKommunikation: FuehrungKommunikation;
  thw: ThwAuftrag;
};

export function neuerThwAuftrag(): ThwAuftrag {
  return {
    absender: '',
    einsatz: '',
    laufendeNummer: '',
    empfaenger: '',
    lage: { gefahrenSchaden: '', eigeneLage: '', unterstellungAbgabe: '' },
    auftrag: '',
    durchfuehrung: { schwerpunktAbsicht: '', einzelauftraege: '', zusammenarbeitZeitSchutz: '' },
    logistik: {
      verpflegung: '',
      verbrauchsgueter: '',
      betriebsstoff: '',
      instandsetzung: '',
      medizinischeVersorgung: '',
      unterbringung: '',
      haushaltHandkasseAbrechnung: '',
    },
    fuehrungVerbindung: { telekommunikationMeldewesen: '', fuehrungsstellenEinsatzleitungen: '' },
    ortDatum: '',
    unterschrift: '',
    dienststellung: '',
    abgesandtAm: '',
    abgesandtUm: '',
    abgesandtVon: '',
    versandUnterschrift: '',
  };
}

export function neuerEinsatzauftrag(now = new Date()): Einsatzauftrag {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 2,
    modus: 'allgemein',
    id: crypto.randomUUID(),
    erstelltAm: timestamp,
    geaendertAm: timestamp,
    auftraggeber: {
      organisation: '',
      stelle: '',
      ansprechperson: '',
      funktion: '',
      funk: '',
      telefon: '',
      erteiltAm: '',
    },
    einheit: {
      organisation: '',
      bezeichnung: '',
      einheitstyp: '',
      fuehrungskraft: '',
      funk: '',
      staerke: { fuehrung: 0, unterfuehrung: 0, mannschaft: 0 },
      fahrzeuge: '',
      standort: '',
    },
    lage: { stand: '', lagebild: '', gefahren: '', eigeneKraefte: '', betroffeneBereiche: '' },
    auftrag: {
      kurzbezeichnung: '',
      auftragstext: '',
      einsatzraum: '',
      einsatzziel: '',
      prioritaeten: '',
      frist: '',
    },
    durchfuehrung: { massnahmen: '', abschnittsbildung: '', gefahrenhinweise: '', rueckmeldung: '' },
    versorgung: {
      personal: '',
      material: '',
      kraftstoff: '',
      sanitaet: '',
      nachforderung: '',
      versorgungsstelle: '',
    },
    fuehrungKommunikation: {
      fuehrungspunkt: '',
      fuehrungsstruktur: '',
      funkgruppe: '',
      meldeweg: '',
      meldetakt: '',
      ausfallverfahren: '',
    },
    thw: neuerThwAuftrag(),
  };
}

export function migriereEinsatzauftrag(value: unknown): Einsatzauftrag | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion === 2) return istEinsatzauftrag(value) ? value : null;
  if (candidate.schemaVersion !== 1) return null;

  const migrated = {
    ...candidate,
    schemaVersion: 2 as const,
    modus: 'allgemein' as const,
    thw: neuerThwAuftrag(),
  };
  return istEinsatzauftrag(migrated) ? migrated : null;
}

export function istEinsatzauftrag(value: unknown): value is Einsatzauftrag {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Einsatzauftrag>;
  const hatTextfelder = (section: unknown, fields: string[]) =>
    section !== null &&
    typeof section === 'object' &&
    fields.every((field) => typeof (section as Record<string, unknown>)[field] === 'string');
  const hatStaerke = (section: unknown) => {
    if (section === null || typeof section !== 'object') return false;
    const staerke = (section as Record<string, unknown>).staerke;
    return (
      staerke !== null &&
      typeof staerke === 'object' &&
      ['fuehrung', 'unterfuehrung', 'mannschaft'].every((key) => {
        const number = (staerke as Record<string, unknown>)[key];
        return typeof number === 'number' && Number.isFinite(number) && number >= 0;
      })
    );
  };
  return (
    candidate.schemaVersion === 2 &&
    (candidate.modus === 'allgemein' || candidate.modus === 'thw') &&
    typeof candidate.id === 'string' &&
    typeof candidate.erstelltAm === 'string' &&
    typeof candidate.geaendertAm === 'string' &&
    hatTextfelder(candidate.auftraggeber, [
      'organisation', 'stelle', 'ansprechperson', 'funktion', 'funk', 'telefon', 'erteiltAm',
    ]) &&
    hatTextfelder(candidate.einheit, [
      'organisation', 'bezeichnung', 'einheitstyp', 'fuehrungskraft', 'funk', 'fahrzeuge', 'standort',
    ]) &&
    hatStaerke(candidate.einheit) &&
    hatTextfelder(candidate.lage, ['stand', 'lagebild', 'gefahren', 'eigeneKraefte', 'betroffeneBereiche']) &&
    hatTextfelder(candidate.auftrag, [
      'kurzbezeichnung', 'auftragstext', 'einsatzraum', 'einsatzziel', 'prioritaeten', 'frist',
    ]) &&
    hatTextfelder(candidate.durchfuehrung, ['massnahmen', 'abschnittsbildung', 'gefahrenhinweise', 'rueckmeldung']) &&
    hatTextfelder(candidate.versorgung, [
      'personal', 'material', 'kraftstoff', 'sanitaet', 'nachforderung', 'versorgungsstelle',
    ]) &&
    hatTextfelder(candidate.fuehrungKommunikation, [
      'fuehrungspunkt', 'fuehrungsstruktur', 'funkgruppe', 'meldeweg', 'meldetakt', 'ausfallverfahren',
    ]) &&
    hatThwAuftrag(candidate.thw)
  );
}

function hatThwAuftrag(value: unknown): value is ThwAuftrag {
  if (value === null || typeof value !== 'object') return false;
  const section = value as Record<string, unknown>;
  const strings = (item: unknown, fields: string[]) =>
    item !== null && typeof item === 'object' &&
    fields.every((field) => typeof (item as Record<string, unknown>)[field] === 'string');

  return (
    strings(section, [
      'absender', 'einsatz', 'laufendeNummer', 'empfaenger', 'auftrag', 'ortDatum',
      'unterschrift', 'dienststellung', 'abgesandtAm', 'abgesandtUm', 'abgesandtVon', 'versandUnterschrift',
    ]) &&
    strings(section.lage, ['gefahrenSchaden', 'eigeneLage', 'unterstellungAbgabe']) &&
    strings(section.durchfuehrung, ['schwerpunktAbsicht', 'einzelauftraege', 'zusammenarbeitZeitSchutz']) &&
    strings(section.logistik, [
      'verpflegung', 'verbrauchsgueter', 'betriebsstoff', 'instandsetzung', 'medizinischeVersorgung',
      'unterbringung', 'haushaltHandkasseAbrechnung',
    ]) &&
    strings(section.fuehrungVerbindung, ['telekommunikationMeldewesen', 'fuehrungsstellenEinsatzleitungen'])
  );
}