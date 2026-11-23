/**
 * Eine Quelle für alle Projekte. Reihenfolge = Reihenfolge auf der Seite.
 * Alle Texte klein geschrieben, kurz.
 * `bilder`: Fotos/Screenshots unter public/projekte/<id>/; ohne Bilder zeigt die Seite Renders.
 */
export type Abschnitt = { titel: string; text: string }
export type Link = { label: string; url: string }

export type Projekt = {
  id: string
  art: 'kunde' | 'labor'
  /** 1 = Hauptprojekt, 2 = wichtig, 3 = weiteres */
  prio: 1 | 2 | 3
  /** Wie groß das Objekt auf dem Projektfeld schwebt */
  relevanz: 'gross' | 'mittel' | 'klein'
  /** Was für eine Art Projekt, klein, z. B. „startup · mitgründer“. Überschreibt die Anzeige von `art`. */
  label: string
  titel: string
  /** ein Satz */
  satz: string
  zeitraum: string
  rolle?: string
  abschnitte: Abschnitt[]
  /** höchstens vier */
  tags: string[]
  links?: Link[]
  bilder?: string[]
  /** Kurzer stummer Clip (mp4 + webm + Poster) */
  clip?: { mp4: string; webm: string; poster: string; alt: string }
  /** Drehung in Grad für Ausschnitte und Sticker */
  dreh: number
  /** Stand eines laufenden Auftrags */
  status?: string
}

export const PROJEKTE: Projekt[] = [
  {
    id: 'exoskelett', art: 'labor', prio: 1, relevanz: 'gross', dreh: 5, label: 'startup · mitgründer',
    titel: 'felya labs',
    satz: 'ein hand-exoskelett, mit dem man roboter steuert. zwei jahre lang mein hauptprojekt.',
    zeitraum: 'sommer 2024 bis juni 2026',
    rolle: 'mitgründer, firmware und software',
    abschnitte: [
      { titel: 'die idee', text: 'angefangen im uni-kurs interaction design, mit der aufgabe, ungewöhnliche wege zum computer zu finden. unsere antwort: die hand bewegt nicht die maus, die hand ist die maus. daraus wurde ein handschuh mit motoren, der roboter steuert und zurückgibt, was der roboter spürt.' },
      { titel: 'was ich gebaut hab', text: 'die firmware und die software dahinter: motoren und sensoren ansteuern, und ein sdk, das den ganzen handschuh als modell abbildet. wer ihn benutzt, ruft einfache funktionen auf und muss nicht wissen, wie schnell welcher motor gerade dreht.' },
      { titel: 'meine rolle', text: 'ich war für die technik über den ganzen stack verantwortlich, mit der frage dahinter: wie wird aus einem prototyp ein produkt, das andere benutzen können?' },
      { titel: 'unterwegs', text: 'gefördert von th köln kickstart, dem startup-programm von igus und würth elektronik. wir waren auf der ersten konferenz des robotics institute germany (rig) in nürnberg und beim future tech fest in düsseldorf, und haben am demo day des bergsteiger accelerators gepitcht.' },
      { titel: 'jetzt', text: 'seit juni 2026 bin ich nicht mehr im team und gehe zurück zur ursprünglichen frage: was, wenn wir den digitalen alltag mit den händen fühlen? also haptische interfaces, mit denen man direkt interagiert.' },
    ],
    tags: ['firmware', 'sdk', 'robotik', 'hci'],
    bilder: ['01-handschuh', '05-roboterhand', '02-prototyp', '03-platinen', '07-future-tech-fest', '08-erster-prototyp'].map(n => `/projekte/exoskelett/${n}.webp`),
    clip: { mp4: '/projekte/exoskelett/clip-handschuh-studio.mp4', webm: '/projekte/exoskelett/clip-handschuh-studio.webm', poster: '/projekte/exoskelett/clip-handschuh-studio-poster.webp', alt: 'der handschuh öffnet und schließt die finger' },
  },
  {
    id: 'konzern', art: 'kunde', prio: 2, relevanz: 'gross', dreh: -4, label: 'auftrag · laufend',
    titel: 'markenprüfung für einen konzern',
    satz: 'für einen der größten konzerne deutschlands bauen wir ein werkzeug, mit dem teams werbung und kommunikation gegen die markenrichtlinien prüfen lassen.',
    zeitraum: '2026', status: 'aktuell',
    rolle: 'backend, infrastruktur und ki-framework',
    abschnitte: [
      { titel: 'das werkzeug', text: 'auf der einen seite reichen teams ihre entwürfe ein, auf der anderen prüft das design-team, ob sie zur marke passen.' },
      { titel: 'wo ki reinkommt', text: 'wir bauen gerade ki ein, die einen teil der prüfungen selbst übernimmt, zum beispiel schriften im entwurf erkennen und vermessen.' },
      { titel: 'meine rolle', text: 'ich verantworte vor allem backend und infrastruktur, also dass alles läuft. dazu baue ich gerade das framework für die ki-prüfungen: damit lassen sich neue prüfungen einfach festlegen und hinzufügen.' },
    ],
    tags: ['backend', 'infrastruktur', 'ki-framework', 'produktentwicklung'],
  },
  {
    id: 'immobot', art: 'labor', prio: 2, relevanz: 'mittel', dreh: -3, label: 'eigenes projekt',
    titel: 'immobot',
    satz: 'ein bot, der zu jeder neuen wohnung in köln sofort ein persönliches anschreiben entwirft.',
    zeitraum: '2026',
    abschnitte: [
      { titel: 'idee', text: 'ich häng mich an fredy, eine open-source-app, die wohnungsportale beobachtet, und bau einen ki-teil dran, der die anschreiben entwirft. neue inserate kommen per telegram, dazu gibt es ein dashboard.' },
      { titel: 'gegen slop', text: 'der bot schlägt ein anschreiben vor, ich korrigiere es, und das system leitet aus meinen korrekturen regeln ab, die ich bestätige. nach ein paar runden braucht etwa die hälfte der anschreiben keine korrektur mehr.' },
      { titel: 'grundlage', text: 'beispiele aus meinen eigenen texten statt langer anweisungen (salemi & zamani 2024), vorlieben, die aus edits gelernt werden (cipher, gao et al. 2024), und eine regelliste, die nur in kleinen schritten wächst (expel, zhao et al. 2023).' },
    ],
    links: [
      { label: 'github', url: 'https://github.com/eneuberg/immobot' },
      { label: 'cipher', url: 'https://arxiv.org/abs/2404.15269' },
      { label: 'salemi & zamani', url: 'https://arxiv.org/abs/2409.09510' },
      { label: 'expel', url: 'https://arxiv.org/abs/2308.10144' },
    ],
    tags: ['llm', 'agent', 'telegram', 'fredy'],
  },
  {
    id: 'makerspace', art: 'kunde', prio: 2, relevanz: 'mittel', dreh: 4, label: 'beim arbeitgeber',
    titel: 'inventar per foto',
    satz: 'für einen neuen makerspace ein inventar gebaut, in das man teile nur noch fotografiert.',
    zeitraum: '2026',
    abschnitte: [
      { titel: 'problem', text: 'ein neuer makerspace braucht viel zeug: elektronik, filament, möbel. in einem deutschen unternehmen muss alles erfasst werden. von hand heißt das: eintrag anlegen, id vergeben, foto hochladen und erst mal herausfinden, wie das ding heißt.' },
      { titel: 'lösung', text: 'ein chat auf einem raspberry pi, für alle im wlan erreichbar. foto machen, claude erkennt das teil, sucht nach, was es ist, und legt es mit eigener id in snipe-it an. ausleihen geht genauso: fragen, der agent trägt es ein.' },
      { titel: 'warum', text: 'snipe-it bleibt, wie es ist. die ki sitzt davor und nimmt die tipparbeit ab.' },
    ],
    links: [{ label: 'github', url: 'https://github.com/eneuberg/snipeit-mcp-chat' }],
    tags: ['agent', 'claude', 'snipe-it', 'mcp'],
  },
  {
    id: 'virtubooth', art: 'labor', prio: 2, relevanz: 'mittel', dreh: -5, label: 'für ein event',
    titel: 'virtubooth',
    satz: 'eine ml-pipeline, die fotos live auswertet und auf einem dashboard sichtbar macht, gebaut als fotobox auf den handys von partygästen.',
    zeitraum: '2026',
    rolle: 'konzept und entwicklung',
    abschnitte: [
      { titel: 'was es ist', text: 'data analytics auf echten, chaotischen daten: fotos, die gäste mit dem eigenen handy machen. im einsatz auf einer party mit rund 150 gästen und etwa 200 fotos.' },
      { titel: 'die pipeline', text: 'jedes foto läuft durch mehrere modelle: object detection, gesichter, gesichtsausdruck, hände, brillen, hüte. die ergebnisse landen live auf einem dashboard, wo man sie auswerten kann, und werden zu kategorien für die live-wall, zum beispiel die meisten lächeln auf einem bild.' },
      { titel: 'admin', text: 'im admin-panel steuert man die party live, sieht jede analyse und legt eigene kategorien an. ohne ki hätte sich das sortieren nie gelohnt.' },
      { titel: 'als nächstes', text: 'eine echte box im raum: esp32 mit kamera und knopf.' },
    ],
    links: [{ label: 'github', url: 'https://github.com/eneuberg/virtubooth' }],
    tags: ['ml-pipeline', 'computer vision', 'fastapi', 'react'],
    bilder: ['01-ml-pipeline', '02-beer-cam', '03-admin-gaeste', '04-admin-export'].map(n => `/projekte/virtubooth/${n}.webp`),
  },
  {
    id: 'ion-like-fish', art: 'labor', prio: 2, relevanz: 'mittel', dreh: 6, label: 'uni-projekt',
    titel: 'ion like fish',
    satz: 'ein kaputter e-scooter von der straße, aufgeschraubt und zum controller für ein spiel umgebaut.',
    zeitraum: '2024',
    rolle: 'mit steve und ali, studienprojekt',
    abschnitte: [
      { titel: 'worum es geht', text: 'viele e-scooter landen am ende im fluss, mitsamt lithium-akku. darum geht es in der installation.' },
      { titel: 'was wir gemacht haben', text: 'den lenker aufgemacht und die teile einzeln angesteuert: gasknopf, blinkerschalter, blinker und leds. ein arduino schickt die signale an eine umgebaute version von flappy bird.' },
      { titel: 'das spiel', text: 'du steuerst mit dem scooter-lenker einen fisch durch ein meer aus akkus.' },
    ],
    links: [{ label: 'github', url: 'https://github.com/eneuberg/Ion-like-Fish' }],
    tags: ['hardware hacking', 'arduino', 'reverse engineering', 'installation'],
    bilder: ['01-lenker-aufgebaut', '02-gasknopf', '03-blinkerschalter', '04-spiel'].map(n => `/projekte/ion-like-fish/${n}.webp`),
  },
  {
    id: 'seedington', art: 'labor', prio: 3, relevanz: 'klein', dreh: 3, label: 'uni-projekt',
    titel: 'seedington',
    satz: 'eine drohne soll samenkugeln auf kahle stadtflächen werfen. ich hab das modell gebaut, das die flächen findet.',
    zeitraum: '2024',
    rolle: 'fast die gesamte software',
    abschnitte: [
      { titel: 'idee', text: 'guerilla gardening aus der luft: erkennen, wo in der stadt kaum etwas wächst, und dort samen abwerfen.' },
      { titel: 'modell', text: 'ein u-net-modell zur bildsegmentierung, mit eigenem datensatz selbst trainiert und mit jaccard-loss optimiert. es erkennt geeignete flächen mit einer trefferquote von 95 %.' },
      { titel: 'nächste schritte', text: 'die stadt per fotogrammetrie aktuell erfassen und daraus eine abwurfroute planen.' },
    ],
    links: [{ label: 'github', url: 'https://github.com/eneuberg/Pytorch-UNet-Grass-recognition' }],
    tags: ['u-net', 'pytorch', 'segmentierung', 'drohne'],
  },
  {
    id: 'un-escap', art: 'labor', prio: 3, relevanz: 'klein', dreh: -6, label: 'studierendenprojekt',
    titel: 'un escap analytics',
    satz: 'studierendenprojekt: ich hab die technik für ein analysetool von un escap geleitet.',
    zeitraum: '2024',
    rolle: 'technische leitung',
    abschnitte: [
      { titel: 'notiz', text: 'investoren ermitteln damit einen nachhaltigkeits-score für geplante direktinvestitionen. technisch ein schlankes formular, spannend wegen der leute dahinter. un escap hat das tool bekommen und vorgestellt.' },
    ],
    tags: ['web', 'nachhaltigkeit', 'stakeholder'],
  },
  {
    id: 'led-kasten', art: 'labor', prio: 3, relevanz: 'klein', dreh: 7, label: 'geschenk',
    titel: 'led-kasten in 48 stunden',
    satz: 'in 48 stunden gebaut, als geburtstagsgeschenk für eine freundin.',
    zeitraum: '48 h, 2025',
    abschnitte: [
      { titel: 'notiz', text: 'esp32, 64 leds, ein knopf, minecraft-sounds und ein eigenes wlan mit web-panel.' },
      { titel: 'als nächstes', text: 'eine eigene platine statt kabelsalat, dann vielleicht ein paar stück auf etsy.' },
    ],
    tags: ['esp32', 'led-matrix', 'geschenk'],
  },
  {
    id: 'untertitel', art: 'labor', prio: 3, relevanz: 'klein', dreh: -2, label: 'nebenbei',
    titel: 'untertitel-harness',
    satz: 'ein werkzeug, mit dem man ki-untertitel für bildungsvideos schnell prüft und korrigiert.',
    zeitraum: 'nebenbei',
    abschnitte: [
      { titel: 'notiz', text: 'whisper transkribiert, das werkzeug drumherum ist zum schnellen prüfen und korrigieren gebaut, gerade bei fachbegriffen, an denen das modell scheitert. damit ging es 5- bis 10-mal schneller als alles von hand.' },
    ],
    tags: ['whisper', 'human in the loop'],
  },
]

export const nummer = (i: number) => String(i + 1).padStart(2, '0')
export const projekt = (id: string) => PROJEKTE.find(p => p.id === id)!
