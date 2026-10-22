import type { ReactNode } from 'react';
import {
  BarChartOutlined,
  BellOutlined,
  CarOutlined,
  DollarOutlined,
  HomeOutlined,
  IdcardOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  SolutionOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
  ShopOutlined,
} from '@ant-design/icons';

/**
 * Contenuti della guida. Ogni sezione e ogni argomento dichiarano i permessi necessari (gli stessi che abilitano
 * il menu e i pulsanti): chi legge vede solo quello che può davvero fare.
 * Nei testi **grassetto** indica l'etichetta esatta di un pulsante, di un campo o di una voce di menu.
 */
export interface GuideRequirement {
  /** servono tutti questi permessi */
  all?: string[];
  /** ne basta uno */
  any?: string[];
  /** visibile solo a chi NON ha nessuno di questi permessi (es. spiegazioni della sola lettura) */
  none?: string[];
  /** solo per questi ruoli (codice del ruolo): la Dashboard cambia in base al ruolo, non ai permessi */
  roles?: string[];
  /** per tutti i ruoli tranne questi */
  notRoles?: string[];
}

export interface GuideTopic {
  id: string;
  title: string;
  requires?: GuideRequirement;
  /** etichetta accanto al titolo, es. "Solo lettura" */
  badge?: string;
  text?: string;
  steps?: string[];
  tips?: string[];
  warning?: string;
}

export interface GuideSection {
  id: string;
  title: string;
  icon: ReactNode;
  /** pagina dell'app da aprire con il pulsante "Apri" */
  path?: string;
  requires?: GuideRequirement;
  intro?: string;
  topics: GuideTopic[];
}

const MANAGE_MEMBERS = { all: ['CAN_MANAGE_MEMBERS'] };
const MANAGE_STAFF = { all: ['CAN_MANAGE_STAFF'] };
const MANAGE_VEHICLES = { all: ['CAN_MANAGE_VEHICLES'] };
const MANAGE_TX = { all: ['CAN_MANAGE_TRANSACTIONS'] };
const MANAGE_USERS = { all: ['CAN_MANAGE_USERS'] };
const MANAGE_BACKUP = { all: ['CAN_MANAGE_BACKUP'] };

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'primi-passi',
    title: 'Primi passi',
    icon: <LoginOutlined />,
    intro: 'Come entrare nel gestionale, muoversi tra le pagine e cosa fare se qualcosa non va.',
    topics: [
      {
        id: 'accesso',
        title: 'Entrare nel gestionale',
        steps: [
          'Apri l\'indirizzo del gestionale nel browser (Chrome, Safari, Edge…).',
          'Scrivi il tuo **Username** e la tua **Password**.',
          'Premi **Accedi**.',
        ],
        tips: [
          'Se scrivi male i dati compare «Nome utente o password non corretti»: controlla maiuscole e minuscole.',
          'Dopo 10 tentativi sbagliati in un minuto il gestionale ti fa aspettare qualche minuto prima di riprovare.',
          'Per sicurezza l\'accesso dura 8 ore: poi ti viene chiesto di rientrare e torni alla pagina in cui eri.',
        ],
      },
      {
        id: 'password-dimenticata',
        title: 'Ho dimenticato la password',
        steps: [
          'Nella pagina di accesso premi **Password dimenticata?**.',
          'Scrivi il tuo nome utente oppure la tua email e premi **Invia link di recupero**.',
          'Apri l\'email che ricevi e premi il link: vale 30 minuti.',
          'Scrivi la nuova password due volte (almeno 8 caratteri) e premi **Salva la nuova password**.',
          'Torna all\'accesso ed entra con la nuova password.',
        ],
        tips: [
          'Se l\'email non arriva entro qualche minuto controlla nella cartella della posta indesiderata (spam).',
          'Il messaggio di conferma è sempre lo stesso, anche se il nome utente non esiste: è una misura di sicurezza.',
          'Se il tuo account non ha un\'email il link non può arrivare: chiedi a un amministratore.',
          'Dopo il cambio, gli accessi aperti su altri computer o telefoni vengono chiusi.',
        ],
      },
      {
        id: 'menu',
        title: 'Muoversi tra le pagine',
        text:
          'Le pagine sono nel menu a sinistra. Vedi solo le voci che il tuo ruolo può usare. Su computer il pulsante ' +
          'in alto a sinistra stringe o allarga il menu; sul telefono il menu si apre toccando ☰ in alto a sinistra e ' +
          'si chiude da solo quando scegli una pagina.',
        tips: [
          'Se apri una pagina che non puoi usare compare «Accesso negato» con il pulsante **Torna alla Dashboard**.',
          'Se un elenco non si carica (ad esempio senza connessione) compare **Riprova**: premilo quando la rete torna.',
        ],
      },
      {
        id: 'tema-esci',
        title: 'Tema chiaro o scuro, e uscire',
        steps: [
          'Premi il tuo nome (o l\'icona dell\'utente sul telefono) in alto a destra.',
          'Sotto **Tema** scegli **Chiaro**, **Scuro** oppure **Automatico** (segue il telefono o il computer).',
          'Per uscire premi **Esci**: fallo sempre su un computer condiviso.',
        ],
        tips: ['La scelta del tema viene ricordata anche quando entri da un altro dispositivo.'],
      },
      {
        id: 'telefono',
        title: 'Usarlo sul telefono come un\'app',
        text:
          'Il gestionale funziona anche sul telefono. Puoi aggiungerlo alla schermata Home: su iPhone, in Safari, ' +
          'tocca il pulsante Condividi e poi «Aggiungi alla schermata Home»; su Android, in Chrome, tocca i tre puntini ' +
          'e poi «Installa app» (o «Aggiungi a schermata Home»).',
        tips: [
          'Quando esce una versione nuova compare «Nuova versione disponibile»: viene caricata da sola al cambio di pagina.',
        ],
      },
    ],
  },

  {
    id: 'profilo',
    title: 'Il tuo profilo',
    icon: <UserOutlined />,
    path: '/profile',
    intro: 'Dal menu **Profilo** (o dal menu con il tuo nome, in alto a destra) gestisci i tuoi dati e la password.',
    topics: [
      {
        id: 'dati',
        title: 'Cambiare nome e cognome',
        steps: ['Apri **Profilo**.', 'Modifica **Nome** e **Cognome**.', 'Premi **Salva Modifiche**.'],
        tips: ['Lo **Username** non si cambia.'],
      },
      {
        id: 'email-profilo',
        title: 'Cambiare la tua email',
        requires: { none: ['CAN_MANAGE_USERS'] },
        text:
          'La tua email la può cambiare solo un amministratore: serve anche per ricevere il link di recupero della ' +
          'password, quindi tienila aggiornata chiedendo a lui.',
      },
      {
        id: 'email-profilo-admin',
        title: 'Cambiare la tua email',
        requires: MANAGE_USERS,
        steps: ['Apri **Profilo**.', 'Modifica **Email**.', 'Premi **Salva Modifiche**.'],
      },
      {
        id: 'aspetto',
        title: 'Aspetto: tema e trasparenza',
        text:
          'Nel riquadro **Aspetto** scegli il **Tema** e puoi attivare **Riduci trasparenza**, che rende barre e menu ' +
          'pieni invece che "a vetro": utile se trovi il testo poco leggibile.',
      },
      {
        id: 'password',
        title: 'Cambiare la password',
        steps: [
          'Apri **Profilo** e vai al riquadro **Cambia Password**.',
          'Scrivi la **Password Attuale**.',
          'Scrivi la **Nuova Password** (almeno 8 caratteri) e ripetila in **Conferma Password**.',
          'Premi **Cambia Password**: dopo un secondo il gestionale ti fa uscire.',
          'Rientra con la nuova password.',
        ],
        tips: ['Il cambio chiude anche gli accessi aperti su altri dispositivi.'],
      },
    ],
  },

  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <HomeOutlined />,
    path: '/',
    requires: { all: ['CAN_VIEW_DASHBOARD'] },
    intro: 'La prima pagina dopo l\'accesso: un riepilogo delle cose da tenere d\'occhio.',
    topics: [
      {
        id: 'dash-admin',
        title: 'Cosa mostra la Dashboard',
        requires: { roles: ['admin'] },
        text:
          'Vedi quante persone ci sono nello **Staff**, quanti **Tesserati** e quante **Scadenze veicoli** si avvicinano. ' +
          'Sotto trovi l\'elenco dei veicoli con assicurazione, revisione o bollo in scadenza.',
        steps: [
          'Per guardare più avanti nel tempo cambia il periodo in alto nell\'elenco (da **7 giorni** a **90 giorni**; normalmente **30 giorni**).',
        ],
      },
      {
        id: 'dash-staff',
        title: 'Cosa mostra la Dashboard',
        requires: { roles: ['staff'] },
        text:
          'Trovi **Le tue scadenze personali** dei prossimi 30 giorni (patente, patentino di maestro di sci, primo ' +
          'soccorso, licenza da allenatore, visita medica), i **Veicoli assegnati** a te e le loro scadenze.',
        tips: [
          'Se compare «Profilo non collegato», il tuo account non è ancora abbinato alla tua scheda dello staff: chiedi a un amministratore di collegarlo.',
          'Il pulsante **Modifica il mio profilo** apre la tua scheda dello staff (vedi «La tua scheda personale»).',
        ],
      },
      {
        id: 'dash-base',
        title: 'Cosa mostra la Dashboard',
        requires: { notRoles: ['admin', 'staff'] },
        text: 'Con il tuo ruolo la Dashboard mostra un messaggio di benvenuto: usa il menu a sinistra per aprire le pagine.',
      },
    ],
  },

  {
    id: 'scheda-personale',
    title: 'La tua scheda personale',
    icon: <SolutionOutlined />,
    requires: { roles: ['staff'], none: ['CAN_MANAGE_STAFF'] },
    intro:
      'Se fai parte dello staff puoi tenere aggiornata la tua scheda: scadenze, qualifiche, foto e documenti. Così ' +
      'ricevi per email i promemoria prima che qualcosa scada.',
    topics: [
      {
        id: 'apri-scheda',
        title: 'Aggiornare la tua scheda',
        steps: [
          'Nella **Dashboard** premi **Modifica il mio profilo**.',
          'Aggiorna i dati, ad esempio la **Scadenza Visita Medica**, la **Scadenza Patente** o la **Scadenza Certificato** di primo soccorso.',
          'Premi **Salva**.',
        ],
        tips: [
          'Le date si scrivono come GG/MM/AAAA oppure si scelgono dal calendario.',
          '**Ruolo**, **Stato**, **Data Assunzione** ed **Email** li può cambiare solo un amministratore: se sono sbagliati chiedi a lui.',
        ],
      },
      {
        id: 'foto-personale',
        title: 'Mettere la tua foto',
        steps: [
          'Nella tua scheda, nel riquadro **Foto Profilo**, premi **Carica** e scegli una foto (JPG, PNG, WEBP o GIF).',
          'Sposta il cerchio sul viso; con **Zoom** ingrandisci o rimpicciolisci.',
          'Premi **Conferma**.',
        ],
      },
      {
        id: 'documenti-personali',
        title: 'Caricare i tuoi documenti',
        steps: [
          'Nella tua scheda, nel riquadro **Documenti**, scegli il tipo (ad esempio **Visita Medica** o **Patente**).',
          'Premi **Carica Documento** e scegli il file (al massimo 50 MB; vanno bene PDF e foto).',
        ],
        tips: ['Per toglierlo premi l\'icona del cestino accanto al documento e conferma.'],
      },
      {
        id: 'promemoria-personali',
        title: 'I promemoria che ricevi',
        text:
          'Quando una tua scadenza si avvicina ricevi un\'email di promemoria (con l\'amministratore in copia): 30 giorni ' +
          'prima per la visita medica, 60 giorni prima per patente, patentino di maestro di sci e licenza da allenatore. ' +
          'Arrivano all\'email della tua scheda: se è sbagliata chiedi a un amministratore di correggerla.',
      },
    ],
  },

  {
    id: 'tesserati',
    title: 'Tesserati',
    icon: <IdcardOutlined />,
    path: '/members',
    requires: { all: ['CAN_VIEW_MEMBERS'] },
    intro: 'Gli atleti, i genitori e gli altri tesserati del club, con i loro dati, la visita medica e i documenti.',
    topics: [
      {
        id: 'cercare',
        title: 'Trovare un tesserato',
        steps: [
          'Apri **Tesserati**.',
          'Scrivi nome, cognome, email o codice FISI/FIS in **Cerca tesserato…** e premi Invio (o il pulsante cerca).',
          'Se vuoi, restringi l\'elenco con **Tipo** (Atleta, Genitore, Tesserato) e **Agonista** (Sì/No).',
          'Premi **Dettagli** sulla riga per aprire la scheda.',
        ],
        tips: [
          'Premendo l\'intestazione **Nome** ordini per cognome, dalla A alla Z o al contrario.',
          'L\'icona accanto al nome è rossa se la visita medica è scaduta, arancione se scade entro 30 giorni.',
          'Sul telefono alcune colonne sono nascoste: le trovi aprendo la scheda.',
        ],
      },
      {
        id: 'sola-lettura',
        title: 'Puoi consultare ma non modificare',
        badge: 'Solo lettura',
        requires: { none: ['CAN_MANAGE_MEMBERS'] },
        text:
          'Con il tuo ruolo le schede dei tesserati si aprono in sola lettura: vedi tutti i dati e puoi scaricare i ' +
          'documenti, ma non modificarli. Se un dato è sbagliato segnalalo a chi gestisce i tesserati.',
      },
      {
        id: 'nuovo',
        title: 'Aggiungere un tesserato',
        requires: MANAGE_MEMBERS,
        steps: [
          'In **Tesserati** premi **Nuovo Tesserato**.',
          'Compila almeno **Nome** e **Cognome** (sono obbligatori), poi **Tipo** e **Stato**.',
          'Aggiungi gli altri dati che hai: data e luogo di nascita, contatti, **Codice FISI**, **Codice FIS**, la **Scadenza** della visita medica.',
          'Premi **Salva**.',
        ],
        tips: [
          'Il **Codice Fiscale** non può essere uguale a quello di un altro tesserato: il gestionale te lo segnala.',
          'Se l\'email non c\'è lascia il campo vuoto.',
          'Inserisci la scadenza della visita medica: il tesserato riceverà un\'email di promemoria 30 giorni prima.',
        ],
      },
      {
        id: 'modifica',
        title: 'Modificare un tesserato',
        requires: MANAGE_MEMBERS,
        steps: ['Apri la scheda con **Dettagli**.', 'Cambia i dati che servono.', 'Premi **Salva**.'],
        tips: [
          'Per svuotare un campo a scelta (ad esempio il **Sesso**) usa la ✕ che compare passandoci sopra.',
          'Non si eliminano i tesserati: se uno lascia il club metti lo **Stato** su **Inattivo**.',
        ],
      },
      {
        id: 'foto',
        title: 'Foto del tesserato',
        requires: MANAGE_MEMBERS,
        steps: [
          'Nella scheda, riquadro **Foto**, premi **Carica** e scegli un\'immagine (JPG, PNG, WEBP o GIF).',
          'Centra il cerchio sul viso, usa **Zoom** se serve e premi **Conferma**.',
        ],
        tips: ['Con **Elimina** togli la foto.'],
      },
      {
        id: 'documenti',
        title: 'Documenti del tesserato',
        steps: [
          'Nella scheda trovi il riquadro **Documenti**.',
          'Per scaricarne uno premi l\'icona di download accanto al documento.',
        ],
      },
      {
        id: 'documenti-carica',
        title: 'Caricare un documento',
        requires: MANAGE_MEMBERS,
        steps: [
          'Nella scheda, riquadro **Documenti**, scegli il tipo: **Visita Medica**, **Documento Identità**, **Tessera FISI**, **Tessera FIS**, **Foto** o **Altro**.',
          'Premi **Carica Documento** e scegli il file (massimo 50 MB).',
        ],
        tips: [
          'Il documento si carica solo su una scheda già salvata: per un tesserato nuovo premi prima **Salva**.',
          'Per eliminarlo premi il cestino accanto al documento e conferma.',
        ],
      },
    ],
  },

  {
    id: 'lista-alberghiera',
    title: 'Lista alberghiera',
    icon: <ShopOutlined />,
    path: '/members',
    requires: { all: ['CAN_VIEW_MEMBERS'] },
    intro:
      'L\'elenco da mandare all\'albergo per una trasferta: nome, data e luogo di nascita, diviso tra atleti e ' +
      'allenatori e, in ciascun gruppo, tra maschi e femmine (per le camere).',
    topics: [
      {
        id: 'genera',
        title: 'Preparare la lista',
        steps: [
          'Apri **Tesserati**.',
          'Spunta la casella accanto agli atleti che partono. Si possono spuntare solo gli **agonisti**; la scelta resta anche cambiando pagina.',
          'Premi **Lista Alberghiera** (tra parentesi c\'è il numero di atleti scelti).',
        ],
        tips: [
          'Se qualcuno non ha il sesso indicato finisce in «Sesso non indicato»: completa la sua scheda per metterlo nel gruppo giusto.',
        ],
      },
      {
        id: 'allenatori',
        title: 'Aggiungere gli allenatori',
        requires: { all: ['CAN_VIEW_STAFF'] },
        steps: [
          'Dopo aver premuto **Lista Alberghiera** compare l\'elenco dello staff attivo.',
          'Spunta gli allenatori che partono; **Seleziona gli allenatori** li spunta tutti, **Nessuno** toglie la scelta.',
          'Premi **Genera lista**.',
        ],
        tips: ['Dalla lista puoi tornare alla scelta con il pulsante **Allenatori**.'],
      },
      {
        id: 'copia-stampa',
        title: 'Copiare o stampare la lista',
        steps: [
          '**Copia** mette la lista negli appunti: incollala in un\'email o in WhatsApp.',
          '**Stampa** apre la versione da stampare (o da salvare in PDF).',
          '**Chiudi** chiude la finestra.',
        ],
      },
    ],
  },

  {
    id: 'staff',
    title: 'Staff',
    icon: <TeamOutlined />,
    path: '/staff',
    requires: { all: ['CAN_VIEW_STAFF'] },
    intro: 'Allenatori, maestri, autisti e collaboratori del club, con qualifiche e scadenze.',
    topics: [
      {
        id: 'elenco-staff',
        title: 'Consultare lo staff',
        steps: [
          'Apri **Staff**.',
          'Cerca per nome, cognome o email in **Cerca nello staff…**.',
          'Premi **Dettagli** per aprire la scheda.',
        ],
        tips: [
          'L\'icona di avviso accanto al nome è rossa se qualcosa è scaduto, arancione se scade entro 30 giorni. Passandoci sopra vedi cosa.',
        ],
      },
      {
        id: 'staff-sola-lettura',
        title: 'Le schede dei colleghi',
        badge: 'Solo lettura',
        requires: { none: ['CAN_MANAGE_STAFF'] },
        text:
          'Le schede dei colleghi si aprono in sola lettura: puoi vedere i dati e scaricare i documenti. La tua ' +
          'scheda invece la puoi modificare (vedi «La tua scheda personale», se fai parte dello staff).',
      },
      {
        id: 'nuovo-staff',
        title: 'Aggiungere una persona allo staff',
        requires: MANAGE_STAFF,
        steps: [
          'In **Staff** premi **Nuovo Membro**.',
          'Compila **Nome**, **Cognome**, **Ruolo** (Istruttore, Autista, Amministrativo, Volontario, Altro) e **Stato**.',
          'Inserisci le scadenze che conosci: visita medica, patente, abilitazione di maestro di sci, certificato di primo soccorso.',
          'Se è un allenatore attiva **Allenatore**, scegli il **Livello** e la **Scadenza Patentino**.',
          'Premi **Salva**.',
        ],
        tips: [
          'Con le scadenze inserite la persona riceve un\'email di promemoria prima che scadano (con l\'amministratore in copia).',
          'Foto e documenti si caricano dopo il primo salvataggio.',
        ],
      },
      {
        id: 'collega-utente',
        title: 'Collegare la scheda all\'account della persona',
        requires: MANAGE_STAFF,
        text:
          'Collegando la scheda all\'account con cui la persona entra nel gestionale, nella sua Dashboard vedrà le ' +
          'proprie scadenze e potrà aggiornare da sola la propria scheda.',
        steps: [
          'Apri la scheda della persona.',
          'In **Utente collegato** cerca e scegli il suo account (nome, email e telefono vuoti vengono compilati da soli).',
          'Premi **Salva**.',
        ],
      },
      {
        id: 'modifica-staff',
        title: 'Modificare una scheda',
        requires: MANAGE_STAFF,
        steps: ['Apri la scheda con **Dettagli**.', 'Cambia i dati.', 'Premi **Salva**.'],
        tips: [
          'Non si eliminano le schede: se qualcuno non collabora più metti lo **Stato** su **Inattivo**.',
          'Per i documenti scegli il tipo nel riquadro **Documenti** e premi **Carica Documento**.',
        ],
      },
    ],
  },

  {
    id: 'veicoli',
    title: 'Veicoli',
    icon: <CarOutlined />,
    path: '/vehicles',
    requires: { all: ['CAN_VIEW_VEHICLES'] },
    intro: 'I pulmini e gli altri mezzi del club, con scadenze di assicurazione, revisione e bollo.',
    topics: [
      {
        id: 'elenco-veicoli',
        title: 'Consultare i veicoli',
        steps: [
          'Apri **Veicoli**.',
          'Cerca per nome, targa, marca o modello in **Cerca veicolo…**.',
          'Premi **Dettagli** per vedere la scheda con scadenze e chilometri.',
        ],
      },
      {
        id: 'veicoli-sola-lettura',
        title: 'Puoi consultare ma non modificare',
        badge: 'Solo lettura',
        requires: { none: ['CAN_MANAGE_VEHICLES'] },
        text: 'Le schede dei veicoli si aprono in sola lettura. Per correggere un dato chiedi a chi gestisce i veicoli.',
      },
      {
        id: 'nuovo-veicolo',
        title: 'Aggiungere o modificare un veicolo',
        requires: MANAGE_VEHICLES,
        steps: [
          'Premi **Nuovo Veicolo** (oppure **Dettagli** su un veicolo esistente).',
          'Compila **Nome**, **Tipo**, **Targa** e **Stato** (obbligatori) e gli altri dati.',
          'In **Scadenze Documenti** inserisci **Scadenza Assicurazione**, **Scadenza Revisione** e **Scadenza Bollo**.',
          'Premi **Salva**.',
        ],
        tips: [
          'La targa non può ripetersi: il gestionale lo segnala.',
          'Il promemoria arriva per email 30 giorni prima di ogni scadenza.',
        ],
      },
      {
        id: 'assegna-veicolo',
        title: 'Assegnare il veicolo a una persona',
        requires: { all: ['CAN_MANAGE_VEHICLES', 'CAN_VIEW_STAFF'] },
        steps: [
          'Nella scheda del veicolo scegli la persona in **Assegnato a**.',
          'Premi **Salva**.',
        ],
        tips: [
          'I promemoria delle scadenze del veicolo arrivano alla persona assegnata, con l\'amministratore in copia. Senza assegnazione arrivano solo all\'amministratore.',
          'La persona vede il veicolo nella propria Dashboard.',
          'Per togliere l\'assegnazione usa la ✕ nel campo e salva.',
        ],
      },
    ],
  },

  {
    id: 'movimenti',
    title: 'Movimenti',
    icon: <DollarOutlined />,
    path: '/transactions',
    requires: { all: ['CAN_VIEW_TRANSACTIONS'] },
    intro: 'Le entrate e le uscite del club. Per ogni entrata il gestionale prepara la ricevuta in PDF.',
    topics: [
      {
        id: 'consultare',
        title: 'Consultare e filtrare i movimenti',
        steps: [
          'Apri **Movimenti**: vedi i movimenti dell\'anno in corso.',
          'Cambia **Anno** (o scegli **Tutti**) e **Tipo** (Entrate o Uscite).',
          'Per cercare scrivi nei campi **Filtra Soggetto…**, **Filtra Note…**, **Filtra Note 2…** o **Filtra Voce Bilancio…**: l\'elenco si aggiorna da solo.',
          'Con **Ordina per** scegli l\'ordine (data, importo, soggetto…) e con la freccia la direzione.',
        ],
        tips: ['Sul telefono i filtri sono nel pulsante **Filtri**: il numero accanto dice quanti ne hai attivi.'],
      },
      {
        id: 'nuovo-movimento',
        title: 'Registrare un\'entrata o un\'uscita',
        requires: MANAGE_TX,
        steps: [
          'Premi **Nuovo Movimento**.',
          'Controlla la **Data** (è già impostata a oggi).',
          'Scegli il **Tipo**: **Entrata** per i soldi che arrivano, **Uscita** per le spese.',
          'Scrivi l\'**Importo**.',
          'Compila **Ditta-Ente-Soggetto** (chi paga o chi riceve), il **Tipo Pagamento** e le **Note**.',
          'In **Voce Bilancio** scegli la voce; se non esiste scrivila e premi Invio per crearla.',
          'Premi **Salva**.',
        ],
        tips: [
          'Scrivi gli importi all\'italiana: **1.234,56**. Anche **1.000** vale mille e **12,5** vale 12,50 €.',
          'L\'importo è sempre positivo: per una spesa non mettere il meno, scegli **Uscita**.',
          'Su un\'entrata la ricevuta riporta il **Soggetto** come «Ricevuti da» e le **Note** come «per»: scrivili come vuoi che compaiano.',
        ],
      },
      {
        id: 'modifica-movimento',
        title: 'Correggere o eliminare un movimento',
        requires: MANAGE_TX,
        steps: [
          'Trova il movimento e premi l\'icona della matita nella colonna **Azioni**.',
          'Correggi i dati e salva.',
          'Per eliminarlo premi il cestino e conferma con **Elimina**.',
        ],
        warning:
          'Il numero di una ricevuta già emessa non cambia mai e non viene riusato, come richiede la legge. Se elimini ' +
          'un\'entrata, la trasformi in uscita o ne sposti la data in un altro anno, la sua ricevuta viene annullata ' +
          '(resta nell\'elenco «Ricevute annullate») e le altre non vengono rinumerate.',
      },
      {
        id: 'ricevuta',
        title: 'Aprire e stampare una ricevuta',
        requires: MANAGE_TX,
        steps: [
          'Nella colonna **Ric.** premi l\'icona del PDF accanto all\'entrata.',
          'La ricevuta si apre in una nuova scheda: da lì puoi stamparla, salvarla o inviarla.',
        ],
        tips: [
          'Le ricevute sono numerate da 1 ogni anno, in ordine. Se correggi un\'entrata la ricevuta viene rifatta con lo stesso numero.',
          'Se il browser blocca la nuova scheda, il PDF viene scaricato.',
        ],
      },
      {
        id: 'annullate',
        title: 'Ricevute annullate',
        steps: [
          'Premi **Ricevute annullate**.',
          'Vedi i numeri non più in uso, con il motivo (ad esempio «Movimento eliminato») e, se c\'è, il PDF originale.',
          'Con **Tutti gli anni** scegli un anno.',
        ],
        tips: [
          'Le righe «Duplicato» sono movimenti doppi archiviati dalla manutenzione dei dati: si possono ripristinare.',
        ],
      },
      {
        id: 'import',
        title: 'Importare i movimenti da Excel',
        requires: MANAGE_TX,
        steps: [
          'Prepara il file Excel (.xlsx o .xls) o CSV: il gestionale legge il primo foglio.',
          'Serve una riga di intestazione con almeno **Data** e **Importo** (oppure due colonne **Entrate** e **Uscite**). Facoltative: Tipo, Soggetto, Categoria, Metodo pagamento, Note, Note2, Voce bilancio.',
          'Premi **Importa Excel**, scegli il file e premi **Conferma Import**.',
          'Leggi il risultato: quante righe sono nuove, quante aggiornate e l\'elenco delle righe con errori (con il numero di riga e il motivo).',
        ],
        tips: [
          'Le date vanno bene come 31/12/2025, 31.12.25 o come date di Excel.',
          'Nella colonna Tipo scrivi «Entrata» o «Uscita» (vanno bene anche E/U, Spesa, Incasso…). Una parola non riconosciuta dà errore su quella riga, così non nascono ricevute sbagliate.',
          'Puoi reimportare lo stesso file: le righe già presenti vengono aggiornate, non duplicate.',
          'Senza la colonna Categoria il gestionale la deduce dalle note (es. «Hotel Senales» → Hotel e alloggi).',
          'Le ricevute dei movimenti nuovi vengono numerate in ordine di data.',
        ],
        warning:
          'Ogni entrata importata riceve un numero di ricevuta che non si può più riusare: controlla il file prima di ' +
          'importarlo, soprattutto la colonna Tipo e il segno degli importi.',
      },
    ],
  },

  {
    id: 'manutenzione',
    title: 'Manutenzione dati',
    icon: <ToolOutlined />,
    path: '/transactions/maintenance',
    requires: MANAGE_TX,
    intro:
      'Strumenti per sistemare i movimenti arrivati da vecchi import: copie doppie e importi sbagliati. Si apre da ' +
      '**Movimenti** con **Manutenzione dati**. Usali con calma: ogni operazione si può annullare.',
    topics: [
      {
        id: 'duplicati',
        title: '1. Pulizia dei duplicati',
        steps: [
          'Apri la scheda **1. Pulizia duplicati**: vedi i gruppi di movimenti identici e quante copie verrebbero tolte.',
          'Controlla l\'elenco.',
          'Premi **Rimuovi duplicati** e conferma.',
        ],
        tips: [
          'Fai la pulizia dei duplicati **prima** della revisione degli importi.',
          'Le copie non vengono cancellate ma messe in un archivio, con i loro numeri di ricevuta e i PDF: quei numeri non vengono riassegnati.',
          'Con **Ripristina archivio** rimetti tutto com\'era.',
        ],
      },
      {
        id: 'revisione',
        title: '2. Revisione degli importi',
        text:
          'Un vecchio import salvava gli importi da 1.000 € in su divisi per mille (es. 1,23 € invece di 1.230 €). ' +
          'Questa scheda li elenca e propone l\'importo corretto.',
        steps: [
          'Apri **2. Revisione importi**: vedi i movimenti **Da rivedere** con l\'importo proposto.',
          'Confronta con l\'estratto conto. Se serve, correggi il valore proposto a mano.',
          'Premi **Applica la correzione** se la proposta è giusta, oppure **L\'importo è giusto** se l\'importo salvato era corretto.',
          'Per lavorare su molte righe spuntale e usa i pulsanti in alto; **Seleziona tutti i N risultati** vale per tutti i risultati del filtro.',
        ],
        tips: [
          'La colonna **Confidenza** dice quanto è sicura la proposta: controlla bene quelle «Da verificare».',
          'Nelle viste **Corretti** e **Confermati** puoi annullare con **Annulla**.',
          'Per le entrate la ricevuta viene rifatta con lo stesso numero.',
        ],
        warning:
          'La proposta ×1000 è una stima: una commissione vera da 2,50 € diventerebbe 2.500 €. Verifica sempre con ' +
          'l\'estratto conto prima di applicare.',
      },
    ],
  },

  {
    id: 'statistiche',
    title: 'Statistiche',
    icon: <BarChartOutlined />,
    path: '/statistics',
    requires: { all: ['CAN_VIEW_STATISTICS'] },
    intro: 'Totali di entrate e uscite, il bilancio e l\'andamento nel tempo.',
    topics: [
      {
        id: 'usare-statistiche',
        title: 'Leggere le statistiche',
        steps: [
          'Apri **Statistiche**.',
          'Scegli il **Periodo** (sul telefono le date **Dal** e **Al**); vuoto = tutti i movimenti.',
          'Se vuoi, scegli una **Categoria**.',
          'In alto leggi **Totale Entrate**, **Totale Uscite** e **Bilancio** (verde se positivo, rosso se negativo).',
        ],
        tips: [
          'Nel grafico scegli **Mesi** o **Anni**; con periodi più lunghi di due anni passa da solo agli anni.',
          'Sotto trovi le tabelle **Andamento Mensile** e **Per Categoria**; i movimenti senza voce compaiono come «Senza categoria».',
        ],
      },
    ],
  },

  {
    id: 'utenti',
    title: 'Utenti',
    icon: <TeamOutlined />,
    path: '/users',
    requires: { all: ['CAN_VIEW_USERS'] },
    intro: 'Gli account con cui le persone entrano nel gestionale. Ogni account ha un ruolo, che decide cosa può fare.',
    topics: [
      {
        id: 'elenco-utenti',
        title: 'Consultare gli utenti',
        text: 'In **Utenti** vedi username, nome, email, ruolo e se l\'account è **Attivo**.',
      },
      {
        id: 'nuovo-utente',
        title: 'Creare un account',
        requires: MANAGE_USERS,
        steps: [
          'Premi **Nuovo Utente**.',
          'Scrivi lo **Username** (il nome per entrare) e una **Password** provvisoria di almeno 8 caratteri.',
          'Compila **Nome**, **Cognome** ed **Email** (serve per recuperare la password da soli).',
          'Scegli il **Ruolo** e lascia **Attivo** acceso.',
          'Premi **Salva** e comunica username e password alla persona: potrà cambiarla dal suo **Profilo**.',
        ],
        tips: ['Se la persona fa parte dello staff, collega poi l\'account alla sua scheda (Staff → **Utente collegato**).'],
      },
      {
        id: 'modifica-utente',
        title: 'Modificare, sospendere o eliminare un account',
        requires: MANAGE_USERS,
        steps: [
          'Premi la matita sulla riga per cambiare dati o ruolo, poi **Salva**.',
          'Per bloccare l\'accesso senza cancellare nulla spegni **Attivo**: la persona viene fatta uscire subito.',
          'Per eliminare l\'account premi il cestino e conferma.',
        ],
        tips: [
          'Non puoi eliminare il tuo account e non si può togliere di mezzo l\'ultimo amministratore attivo.',
          'Gli account degli amministratori li gestisce solo chi è amministratore.',
          'Puoi assegnare solo ruoli che non hanno più permessi dei tuoi.',
        ],
      },
      {
        id: 'password-utente',
        title: 'Una persona ha dimenticato la password',
        requires: MANAGE_USERS,
        steps: [
          'Controlla che il suo account abbia un\'**Email** giusta (matita sulla riga); se manca aggiungila e salva.',
          'Dille di premere **Password dimenticata?** nella pagina di accesso: riceverà il link per sceglierne una nuova.',
        ],
        tips: ['Serve che l\'invio delle email sia configurato (Impostazioni → Email & SMTP).'],
      },
    ],
  },

  {
    id: 'ruoli',
    title: 'Ruoli e permessi',
    icon: <SafetyCertificateOutlined />,
    path: '/roles',
    requires: { all: ['CAN_MANAGE_ROLES'] },
    intro:
      'Un ruolo è un insieme di permessi (ad esempio «vedere i tesserati», «gestire i movimenti»). Ogni utente ha un ' +
      'ruolo. Ci sono tre ruoli già pronti: **admin** (tutto), **staff** (lavoro operativo sui tesserati) e **user** ' +
      '(sola lettura).',
    topics: [
      {
        id: 'nuovo-ruolo',
        title: 'Creare un ruolo',
        steps: [
          'In **Ruoli** premi **Nuovo Ruolo**.',
          'Scrivi un **Codice** breve (es. segreteria) e una **Descrizione**.',
          'Premi **Salva**, poi **Dettagli** per scegliere i permessi.',
        ],
      },
      {
        id: 'permessi',
        title: 'Scegliere i permessi di un ruolo',
        requires: { all: ['CAN_MANAGE_ROLES', 'CAN_MANAGE_CAPABILITIES'] },
        steps: [
          'In **Ruoli** premi **Dettagli** sul ruolo.',
          'Spunta in **Abilitato** i permessi che servono (ognuno ha una descrizione).',
          'Premi **Salva**.',
        ],
        tips: [
          'I permessi «Visualizza…» permettono di vedere, quelli «Gestione…» anche di creare e modificare. Di solito servono tutti e due.',
          'Chi riceve permessi nuovi li vede alla prossima apertura del gestionale, senza dover rientrare.',
        ],
        warning:
          'I permessi dei tre ruoli già pronti (admin, staff, user) tornano quelli di partenza a ogni riavvio del ' +
          'gestionale. Se ti serve un ruolo con permessi diversi crea un ruolo nuovo invece di modificare quelli.',
      },
      {
        id: 'permessi-lettura',
        title: 'Vedere i permessi di un ruolo',
        badge: 'Solo lettura',
        requires: { all: ['CAN_MANAGE_ROLES'], none: ['CAN_MANAGE_CAPABILITIES'] },
        text: 'Con **Dettagli** vedi i permessi di un ruolo; per cambiarli serve un amministratore.',
      },
      {
        id: 'elimina-ruolo',
        title: 'Eliminare un ruolo',
        steps: ['Premi il cestino sulla riga del ruolo e conferma.'],
        tips: [
          'Un ruolo assegnato a qualcuno non si elimina: prima dai a quelle persone un altro ruolo.',
          'Il ruolo admin non si può eliminare.',
        ],
      },
    ],
  },

  {
    id: 'reminder',
    title: 'Promemoria delle scadenze',
    icon: <BellOutlined />,
    path: '/reminders',
    requires: { all: ['CAN_MANAGE_SETTINGS'] },
    intro:
      'Il gestionale manda email automatiche prima delle scadenze: visite mediche, patenti, patentini e documenti dei ' +
      'veicoli. Nella pagina **Reminder** vedi cosa è in programma, cosa è partito e cosa non è riuscito.',
    topics: [
      {
        id: 'come-funzionano',
        title: 'Come funzionano',
        text:
          'Ogni volta che salvi una scheda con una data di scadenza, il gestionale programma il promemoria. Ogni mattina ' +
          'alle 8 invia quelli arrivati alla data.',
        tips: [
          'Anticipo: 30 giorni per bollo, revisione, assicurazione e visite mediche; 60 giorni per patente, patentino di maestro di sci e licenza da allenatore.',
          'Staff: l\'email arriva alla persona con l\'amministratore in copia. Tesserati: al tesserato. Veicoli: alla persona assegnata con l\'amministratore in copia, oppure solo all\'amministratore.',
          'Chi non ha email viene sostituito dall\'**Email Amministratore** (Impostazioni).',
          'Se togli una data o elimini la persona o il veicolo, il promemoria viene annullato.',
        ],
      },
      {
        id: 'pagina-reminder',
        title: 'Controllare i promemoria',
        steps: [
          'Apri **Reminder**: le schede **Programmati**, **Inviati** e **Falliti** dividono i promemoria.',
          'Su un promemoria fallito passa sopra l\'icona rossa per leggere il motivo (spesso l\'invio email non è configurato o l\'indirizzo è sbagliato).',
          'Dopo aver sistemato il problema premi l\'icona di invio (**Reinvia ora**) sulla riga.',
        ],
        tips: [
          '**Esegui Controllo Ora** fa subito il controllo che di solito parte alle 8: programma i promemoria mancanti e invia quelli già arrivati alla data.',
          '**Reinvia ora** manda l\'email subito, anche prima della data prevista.',
        ],
      },
    ],
  },

  {
    id: 'impostazioni',
    title: 'Impostazioni',
    icon: <SettingOutlined />,
    path: '/settings',
    requires: { all: ['CAN_MANAGE_SETTINGS'] },
    intro: 'L\'invio delle email, l\'indirizzo dell\'amministratore e i backup dei dati.',
    topics: [
      {
        id: 'smtp',
        title: 'Configurare l\'invio delle email',
        text:
          'Per mandare promemoria e link di recupero password il gestionale usa una casella email del club. I dati ' +
          'li trovi nelle istruzioni del fornitore della posta (Gmail, Aruba…).',
        steps: [
          'Apri **Impostazioni**, scheda **Email & SMTP**.',
          'Compila **Host SMTP**, **Porta** (di solito 587, oppure 465), **Username**, **Password** e **Indirizzo Mittente**.',
          'Premi **Salva Configurazione SMTP**.',
          'Scrivi il tuo indirizzo in **Invio di prova** e premi **Invia email di prova**; controlla la casella (anche lo spam).',
        ],
        tips: [
          'La password viene salvata cifrata e non si vede più: lascia il campo vuoto per non cambiarla.',
          'Se cambi server o utente, la password va scritta di nuovo.',
          'Per Gmail serve una «password per le app», non la password normale.',
        ],
      },
      {
        id: 'email-admin',
        title: 'Email dell\'amministratore',
        steps: [
          'Nella scheda **Email & SMTP**, riquadro **Email Amministratore**, scrivi l\'indirizzo.',
          'Premi **Salva**.',
        ],
        tips: ['Riceve i promemoria dei veicoli, le copie di quelli dello staff e quelli di chi non ha un\'email.'],
      },
      {
        id: 'generali',
        title: 'Impostazioni generali',
        text:
          'La scheda **Impostazioni Generali** serve per configurazioni tecniche particolari: di norma non va toccata. ' +
          'Attenzione: **Elimina** cancella subito l\'impostazione, senza chiedere conferma.',
      },
      {
        id: 'backup',
        title: 'Fare un backup',
        requires: MANAGE_BACKUP,
        steps: [
          'Apri **Impostazioni**, scheda **Backup & Restore**.',
          'Premi **Backup Completo** (dati e file insieme). In alternativa **Backup Database** salva solo i dati, **Backup MinIO** solo i file (documenti, foto, ricevute).',
          'Nell\'elenco **Backup Disponibili** premi **Scarica** e conserva il file in un posto sicuro (es. un disco esterno).',
        ],
        tips: [
          'Fai un backup prima di operazioni importanti (import grandi, manutenzione dati).',
          'I file di backup sono cifrati: si possono ripristinare solo in questo gestionale.',
          'Con **Elimina** togli dall\'elenco i backup vecchi che non servono.',
        ],
      },
      {
        id: 'ripristino',
        title: 'Ripristinare un backup',
        requires: MANAGE_BACKUP,
        steps: [
          'Nella scheda **Backup & Restore**, riquadro **Ripristina da Backup**, premi **Carica Backup Database (.sql)** oppure **Carica Backup MinIO (.tar)**.',
          'Scegli il file, controlla nome e dimensione nella conferma e premi **Ripristina**.',
          'Al termine ricarica la pagina.',
        ],
        tips: [
          'Prima di ripristinare i dati il gestionale salva da solo una copia di quelli attuali; se qualcosa va storto torna da solo com\'era.',
          'Un file non valido, o di un\'altra installazione, viene rifiutato senza cambiare nulla.',
        ],
        warning:
          'Il ripristino dei dati sostituisce TUTTO con il contenuto del backup: quello che è stato inserito dopo quel ' +
          'backup va perso. Il ripristino dei file sovrascrive quelli con lo stesso nome. Fallo solo se sai cosa stai ' +
          'facendo, e dopo aver fatto un backup completo.',
      },
      {
        id: 'cambio-password-impostazioni',
        title: 'Cambio password',
        text: 'La scheda **Cambio Password** fa la stessa cosa del riquadro nel tuo **Profilo**.',
      },
    ],
  },
];
