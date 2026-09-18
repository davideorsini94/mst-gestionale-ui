# MST Gestionale — Frontend

Interfaccia web del gestionale di una SSD a RL (sci club): tesserati, staff, prima nota
con ricevute, veicoli, scadenzario e impostazioni. SPA React 19 + TypeScript servita da
Vite in sviluppo e da nginx in produzione, installabile come PWA.

> Da sola non fa niente: tutti i dati arrivano dalle API del repo `mst-gestionale-be`.
> Senza backend raggiungibile resta la sola schermata di login.

## Cosa fa

- **Login** con username e password. Il token JWT e il profilo utente finiscono in
  `localStorage` (`mst_token`, `mst_user`); l'app monta un router diverso a seconda che
  il token ci sia o no, e un 401 su qualsiasi chiamata fa logout automatico.
- **Menu per capability**: le voci del menu laterale compaiono solo se il ruolo
  dell'utente ha la capability corrispondente (`CAN_VIEW_MEMBERS`,
  `CAN_VIEW_TRANSACTIONS`, `CAN_MANAGE_SETTINGS`, …). Su schermi piccoli il menu
  diventa un drawer.
- **Dashboard** (`/`): dati da `GET /dashboard?daysAhead=`, con contenuto diverso per
  admin (totali staff e tesserati, scadenze dei veicoli) e per staff (scadenze
  personali e mezzi assegnati).
- **Profilo** (`/profile`): dati da `/auth/me`, aggiornamento del proprio utente e
  cambio password (dopo il cambio si viene disconnessi).
- **Utenti** (`/users`) e **Ruoli** (`/roles`, `/roles/:code`): CRUD utenti con
  assegnazione ruolo, e gestione delle capability per ruolo.
- **Staff** (`/staff`, `/staff/:uuid`): elenco con ricerca, anagrafica, qualifiche e
  scadenze, foto profilo con ritaglio prima dell'upload, documenti allegati da
  caricare e scaricare.
- **Tesserati** (`/members`, `/members/:uuid`): stessa struttura dello staff, più la
  selezione multipla con generazione della **lista per la prenotazione hotel**
  (divisa maschi/femmine, stampabile da una finestra dedicata).
- **Movimenti** (`/transactions`): tabella entrate/uscite con filtri, creazione e
  modifica, **import di file Excel o CSV** con esito riga per riga, e apertura della
  **ricevuta PDF** quando il movimento ne ha una (il token viene passato in query
  string perché il PDF si apre in una nuova scheda).
- **Statistiche** (`/statistics`): totali entrate/uscite/saldo, dettaglio per categoria
  e per mese, filtrabili per intervallo di date e categoria.
- **Veicoli** (`/vehicles`, `/vehicles/:uuid`): parco mezzi e relative scadenze.
- **Reminder** (`/reminders`): elenco dei promemoria a schede (tutti, programmati,
  inviati, falliti), reinvio singolo e comando per forzare subito il controllo delle
  scadenze.
- **Impostazioni** (`/settings`): configurazione SMTP ed email amministratore,
  impostazioni generiche chiave/valore, backup di database e MinIO con elenco,
  download, ripristino ed eliminazione.

## Stack

- React 19.2 + TypeScript 5.9, build con Vite 7
- Ant Design 5.27 con locale italiano (`antd/locale/it_IT`) e icone `@ant-design/icons`
- `react-router-dom` 7 in modalità **hash router** (`createHashRouter`)
- Tailwind CSS 3.4 con `preflight` disattivato, per non entrare in conflitto con antd
- `axios` per le chiamate HTTP, `dayjs` per le date, `lodash/debounce` per le ricerche,
  `react-image-crop` per il ritaglio delle foto profilo
- PWA: `public/manifest.json` e service worker `public/sw.js` con strategia
  network-first e fallback su cache
- In produzione: nginx (`nginx.conf`) che serve la SPA e fa da proxy verso il backend

## Avvio rapido

Serve Node.js >= 20.15.0 (`engines` in `package.json`).

```bash
npm install
npm run dev              # dev server Vite, di default su http://localhost:5173
```

Altri comandi:

```bash
npm run dev:public       # come dev, ma in ascolto su 0.0.0.0 (utile da mobile)
npm run build            # bundle di produzione in dist/
npm run preview          # serve dist/ localmente
npm run lint             # eslint su src (vedi Note)
```

**Insieme al backend**: avvia prima `mst-gestionale-be` (`npm run start:dev`, in ascolto
su `:3000` con prefisso `/api`), poi `npm run dev` qui. Con il `.env` di default il
frontend chiama direttamente `http://localhost:3000/api` — il CORS del backend è aperto,
quindi non serve altro.

Build dell'immagine Docker (il `Dockerfile` parte da `nginx:alpine` e copia `dist/`
già compilata, che non è versionata: il build va fatto prima):

```bash
npm run build
docker build -t mst-gestionale-ui .
```

## Configurazione

Due variabili, lette da Vite al build/dev e quindi prefissate `VITE_`. Nessuna è
obbligatoria: entrambe hanno un fallback nel codice.

| Variabile | Cosa fa | Fallback |
|---|---|---|
| `VITE_API_URL` | base URL delle API in sviluppo, es. `http://localhost:3000/api` | `/api` |
| `VITE_SOCKET_URL` | URL del server socket.io, es. `http://localhost:3000` | `http://localhost:3000` |

Attenzione: `VITE_API_URL` vale **solo in sviluppo**. In build di produzione
(`import.meta.env.PROD`) sia `ApiService` sia `AuthService` forzano il path relativo
`/api`, perché è nginx a inoltrare le richieste al backend:

```
location /api/ {
    proxy_pass http://mst-gestionale-be:3000/api/;
}
```

Il nome host `mst-gestionale-be` presuppone che i due container stiano sulla stessa rete
Docker. La SPA usa `try_files $uri $uri/ /index.html`, e le rotte applicative sono
comunque dietro `#/` per via dell'hash router.

## Struttura del progetto

```
index.html                  entry HTML, meta PWA e iOS, titolo dell'app
vite.config.ts              plugin React, alias di import, proxy di sviluppo
tailwind.config.js          palette custom (primary, menu, success/fail/warn), preflight off
nginx.conf                  server di produzione + proxy /api/ verso il backend
Dockerfile                  immagine nginx:alpine che serve dist/
generate-icons.cjs          script una tantum che genera le icone SVG in public/
public/
├── manifest.json           manifest PWA (nome, icone, display standalone)
└── sw.js                   service worker, cache network-first
src/
├── index.tsx               mount React, QueryClientProvider, registrazione service worker
├── App.tsx                 ConfigProvider antd e scelta del router in base al token
├── routes/Routes.tsx       hash router autenticato e router di login
├── components/
│   ├── MainLayout.tsx      sider/drawer, menu filtrato per capability, header utente
│   ├── SearchableSelect.tsx select con ricerca lato server e debounce
│   ├── CategorySelect.tsx  select delle categorie di movimento
│   └── ImageCropModal.tsx  ritaglio immagine prima dell'upload
├── services/
│   ├── ApiService.ts       client axios, Bearer token, logout automatico sul 401
│   ├── AuthService.ts      login, storage del token, hasCapability()
│   └── SocketService.ts    wrapper socket.io (non utilizzato, vedi Note)
└── pages/                  una cartella per area: Login, Home, Profile, Users, Roles,
                            Staff, Members, Transactions, Statistics, Vehicles,
                            Reminders, Settings
```

## Note

- **Il file `.env` è versionato** e contiene solo i due URL di sviluppo verso
  `localhost:3000`. Nessun segreto: le variabili `VITE_*` finiscono comunque nel bundle
  e sono pubbliche per definizione.
- **`SocketService` è codice morto**: non è importato da nessun componente, e lato
  backend il gateway socket.io non emette nulla. Di conseguenza anche
  `VITE_SOCKET_URL` e la dipendenza `socket.io-client` sono inerti.
- **Dipendenze dichiarate e mai importate**: `@mui/x-charts`, `chart.js`,
  `react-chartjs-2`, `chartjs-plugin-datalabels`, `jotai`, `date-fns`,
  `@ant-design/v5-patch-for-react-19`. I grafici delle statistiche sono tabelle e
  `Statistic` di antd, lo stato è tenuto negli `useState` dei componenti.
  `@tanstack/react-query` è installato e il provider è montato in `index.tsx`, ma
  nessun componente usa `useQuery`/`useMutation`: tutte le chiamate passano da
  `apiService` dentro `useEffect`.
- **`npm run lint` non funziona così com'è**: lo script c'è, ma nel repo non esiste
  nessun file di configurazione ESLint.
- **Icone mancanti**: `manifest.json` e `index.html` referenziano `icon-192.png`,
  `icon-512.png`, `apple-touch-icon.png` e `favicon.svg`, ma `public/` contiene solo
  `manifest.json` e `sw.js`. `generate-icons.cjs` genera le versioni SVG (non le PNG) e
  va lanciato a mano con `node generate-icons.cjs`.
- **Alias non risolti**: `vite.config.ts` e `tsconfig.json` dichiarano `@atoms`,
  `@models` e `@helpers`, ma quelle cartelle non esistono in `src/`. Gli alias usati
  davvero sono gli import relativi.
- Il proxy di sviluppo in `vite.config.ts` punta a `http://mst-gestionale-be:3000` e
  rimuove il prefisso `/api` dal path: è pensato per l'esecuzione in Docker, non per il
  `localhost` di tutti i giorni. In locale il percorso che funziona è `VITE_API_URL`.
- `build.minify` è impostato a `false`: il bundle di produzione non è minificato.
