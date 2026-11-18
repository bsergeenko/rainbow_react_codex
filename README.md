# Rainbow.design

React-Frontend mit JavaScript und Vite, ohne UI- oder Komponentenframework.

## Starten

Das vorhandene Backend muss unter `http://localhost:3000` laufen.

```sh
npm install
npm run dev
```

Die von Vite ausgegebene lokale Adresse öffnen. Alle API-Aufrufe senden Session-Cookies mit. Assets werden direkt vom Backend geladen. In Windows PowerShell mit gesperrten Skripten kann `npm.cmd` verwendet werden.

## Technische Prüfungen

```sh
npm run build
npm test
npm run test:e2e
```

Die Browserprüfungen verwenden eine lokal installierte Version von Google Chrome. Die Tests prüfen die bestehende API lesend und den Gastwarenkorb innerhalb einer eigenen Browsersitzung. Schreibende Konto-, Bestell- und Verwaltungsabläufe werden mit Antworten entsprechend dem vorhandenen API-Vertrag isoliert geprüft, damit vorhandene Backenddaten erhalten bleiben.

`npm run preview` stellt den Produktionsbuild lokal bereit. Beim Hosting muss der Webserver unbekannte Frontendpfade auf `index.html` zurückführen, damit direkte Seitenaufrufe funktionieren.
