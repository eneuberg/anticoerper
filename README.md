# anticoerper.com

die seite von anticoerper (erik neuberger, köln). vite, react, typescript, ein bisschen three.js.

## lokal

```bash
npm install
npm run dev        # http://localhost:5173 (+ agentation-feedback-server auf :4747)
npm run dev:site   # nur die seite
npm run build      # statische seite in dist/
```

## wo was liegt

| pfad | inhalt |
|---|---|
| `src/data/` | alle texte: projekte, person, impressum/datenschutz |
| `src/views/Experiment.tsx` | die seite, abschnitte 01–07 |
| `src/views/experiment/` | bilder, scroll-effekte, logo-stelle, rechtliches |
| `src/design/` | tokens (farben, schriften, abstände) und bausteine |
| `src/raum/` | 3d-antikörper (three.js, lädt nach) und zuordnung der renders |
| `public/` | fotos, renders, clips, favicon |

## hosting

coolify mit dem `Dockerfile` (node baut, nginx liefert aus, port 80). `nginx.conf` setzt cache-header und schreibt keine zugriffsprotokolle.
