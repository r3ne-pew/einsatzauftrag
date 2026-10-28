# einsatzauftrag.app

Clientseitige PWA zum Erstellen, lokalen Speichern und Drucken eines BOS-Einsatzauftrags. Es gibt keinen Server und keine Anmeldung. Der erste Besuch benoetigt eine Verbindung; danach werden App-Shell und Assets ueber den Service Worker bereitgestellt.

## Entwicklung

```sh
npm install
npm run dev
```

## Pruefen und bauen

```sh
npm test
npm run build
npm run preview
```

Offline- und Druckverhalten lassen sich am Produktionsbuild pruefen: `npm run build && npm run preview`. Der Service Worker wird nicht vom Vite-Entwicklungsserver verwendet.

## Docker-Deployment

Das Image baut die PWA mehrstufig und liefert `dist/` ueber den unprivilegierten NGINX auf Port `8080` aus:

```sh
sh scripts/build-docker.sh
docker run -d --name einsatzauftrag --restart unless-stopped -p 8080:8080 einsatzauftrag:latest
```

Im NGINX Proxy Manager einen Proxy Host fuer `einsatzauftrag.app` anlegen und als Ziel den Docker-Host mit Port `8080` eintragen. Sind App und Proxy Manager in einem gemeinsamen Docker-Netz, kann der Containername `einsatzauftrag` als Zielhost verwendet werden; andernfalls die erreichbare Host-IP. SSL/TLS im Proxy Manager aktivieren und „Force SSL“ einschalten. Die App benoetigt keine WebSocket-Option.

Image-Name und Tag koennen ueberschrieben werden:

```sh
IMAGE_NAME=registry.example/einsatzauftrag IMAGE_TAG=2026.10.28 sh scripts/build-docker.sh
```

NGINX liefert gehashte Assets mit langem Cache, waehrend App-Shell, Manifest und Service Worker neu validiert werden. Der SPA-Fallback ist aktiviert, und der Container laeuft ohne root-Rechte.

## Daten

Der aktuelle Entwurf liegt unter einem versionierten Schluessel in `localStorage` dieses Browsers. Browserdaten koennen durch Einstellungen oder Speicherbereinigung geloescht werden. Fuer wichtige Einsaetze daher zusaetzlich die Druckansicht verwenden. Es werden keine Auftragsdaten an einen Server uebermittelt.