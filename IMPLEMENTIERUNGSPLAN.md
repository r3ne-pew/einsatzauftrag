# Implementierungsplan: BOS-Einsatzauftrag

## Ziel und Architektur

Eine rein clientseitige TypeScript-PWA unter `einsatzauftrag.app`. Die App funktioniert nach dem ersten erfolgreichen Laden ohne Verbindung, speichert Entwuerfe im Browser und bietet eine druckoptimierte DIN-A4-Fassung. Es gibt keine Anmeldung, keinen Server und keine Uebertragung von Auftragsdaten. Die Referenz `wattnpapa/erfassungsbogen` dient als Architekturvorbild fuer Offline-first, klare Trennung von Datenmodell und UI sowie papiergetreue Druckausgabe; Produkt- und Quellcode werden nicht uebernommen.

## Datenmodell

Ein Einsatzauftrag ist ein versioniertes Aggregat. Alle Abschnitte koennen einzeln bearbeitet werden, bilden beim Speichern und Export aber eine konsistente Einheit.

```ts
type Einsatzauftrag = {
  schemaVersion: 1;
  id: string;
  erstelltAm: string; // ISO-8601
  geaendertAm: string; // ISO-8601
  auftraggeber: Auftraggeber;
  einheit: Einheit;
  lage: Lage;
  auftrag: Auftrag;
  durchfuehrung: Durchfuehrung;
  versorgung: Versorgung;
  fuehrungKommunikation: FuehrungKommunikation;
};
```

### Auftraggeber

- Organisation / Behoerde und fuehrende Stelle
- Name und Funktion der auftraggebenden Person
- Erreichbarkeit, etwa Funkrufname oder Telefonnummer
- Datum und Uhrzeit der Auftragserteilung

### Einheit

- Organisation, Einheitstyp und Bezeichnung
- Fuehrungskraft mit Funktion und Erreichbarkeit
- Staerke als strukturierte Zahlen (Fuehrung, Unterfuehrung, Mannschaft) plus berechnete Summe
- Fahrzeuge / Mittel als Liste mit Typ, Kennung und Besatzung
- Bereitstellungsraum oder aktueller Standort

### Lage

- Lagebeschreibung und erkannte Entwicklung
- Gefahren / Schaeden sowie betroffene Objekte oder Bereiche
- Eigene Lage und eingesetzte / nachbarliche Kraefte
- Zeitbezug der Lagefeststellung

### Auftrag

- Klarer Auftragstext und Einsatzziel
- Einsatzraum, Objekt und Grenzen
- Prioritaeten, Schutzgueter und besondere Auflagen
- Beginn, Frist oder erwartete Dauer

### Durchfuehrung

- Vorgehen als geordnete Liste von Massnahmen / Abschnitten
- Je Massnahme: Beschreibung, zustaendige Teilkraefte, Reihenfolge oder Zeitbezug
- Gefahrenhinweise und Abbruch- / Rueckmeldekriterien
- Status bleibt optional; der Auftrag soll auch als statischer Papierbefehl nutzbar sein

### Versorgung

- Bedarf und Status fuer Personalversorgung, Material, Kraftstoff und Sanitaet
- Nachforderung mit Menge, Dringlichkeit und Ziel / Uebergabepunkt
- Eigenversorgung bzw. Versorgungsstelle und Kontakt

### Fuehrung und Kommunikation

- Fuehrungsstruktur, Fuehrungspunkte und Verbindungspersonen
- Funkgruppe / Kanal und Kommunikationsmittel
- Meldewege, Meldetakt und Rueckmeldepunkte
- Fallback bei Kommunikationsausfall

## Umsetzungsregeln

1. Fachdaten und persistente Speicherung von React-Komponenten trennen. `schemaVersion` ist Grundlage fuer spaetere Migrationen; UI-Zustand gehoert nicht in den Auftrag.
2. LocalStorage hinter einem kleinen typisierten Repository kapseln. Beim Laden JSON parsen und mindestens Version sowie Pflichtabschnitte pruefen; bei ungueltigen Daten kontrolliert einen neuen Entwurf anbieten, statt still zu ueberschreiben.
3. Einen aktuellen Entwurf automatisch nach jeder Aenderung speichern. Schreibfehler, insbesondere voller Speicher, sichtbar melden. Keine personenbezogenen oder einsatzbezogenen Daten an externe Dienste senden.
4. Die erste App-Version konzentriert sich auf genau einen lokalen Entwurf sowie Neu starten / Entwurf loeschen. Ein Einsatzauftrag bleibt jederzeit als handschriftlich nutzbare A4-Druckfassung verfuegbar.
5. Druck-CSS auf A4 Hochformat mit Druckraendern, Seitenumbruechen zwischen sinnvollen Abschnitten und ohne Navigations- oder Formularbedienelemente gestalten. Datenwerte muessen in der Druckansicht lesbar bleiben.
6. Vite liefert die Anwendung; TailwindCSS gestaltet die Bildschirmansicht. Ein Service Worker precacht App-Shell, Assets und Manifest. Service-Worker-Update darf einen ungespeicherten Entwurf nicht ungefragt neu laden.

## Geplante Projektschichten

- `src/domain/`: Types, leeren Entwurf und reine Modellfunktionen
- `src/storage/`: versionierte LocalStorage-Lese- und Schreibfunktionen
- `src/app/`: App-Zustand, Entwurfserstellung und Abschnittsformular
- `src/components/`: wiederverwendbare Eingaben und Abschnittsrahmen
- `src/styles/`: Tailwind-Einstieg und A4-Druckregeln
- `public/`: Manifest-Icons und statische PWA-Ressourcen

## Pruefstrategie

- Modell: Standardentwurf enthaelt alle Abschnitte und gueltige Metadaten.
- Speicher: Roundtrip, veraltete / ungueltige Daten, Storage-Ausfall.
- UI: Eingaben aktualisieren den Entwurf und bleiben nach Neuladen erhalten.
- Build: Produktionsbuild erzeugt die App-Shell und Service-Worker-Ressourcen.
- Druck: A4-Mass, Seitenumbrueche und Ausblendung der Bedienelemente per Druckvorschau kontrollieren.
