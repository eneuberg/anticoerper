// Person, These, Leistungen, Lebenslauf. Alles klein geschrieben.

export const PERSON = {
  name: 'erik neuberger',
  ort: 'köln',
  mail: 'erik@nbgr.eu',
  /** Kurz, für Fenster und Fußzeilen */
  intro: 'anticoerper ist erik neuberger, freelancer in köln. ich baue software und hardware, von der firmware bis zur web-app, und baue ki in bestehende abläufe ein.',
  kurz: 'ich baue software und hardware.',
  ueber: 'ich bin erik, freelancer unter dem namen anticoerper. am meisten interessiert mich, wie menschen mit maschinen umgehen, deshalb baue ich beide seiten selbst.',
}

/** Die These der Seite. */
export const THESE = {
  titel: 'ki ist in der software angekommen. in den dingen noch nicht.',
  gegen: [
    { vor: 'früher brauchte hardware ein ganzes', betont: 'team' },
    { vor: 'heute eine', betont: 'person' },
  ],
  /** Schematisch: hoehe = was eine Idee einbringt, frueher/jetzt = Einstiegskosten, alles in Prozent der Graphenhöhe. */
  kosten: {
    frueher: 68,
    jetzt: 14,
    ideen: [
      { name: 'auto', hoehe: 96 },
      { name: 'kühlschrank', hoehe: 82 },
      { name: 'futterautomat für die katze', hoehe: 38 },
      { name: 'pflanzen-gießer', hoehe: 32 },
      { name: 'kunstinstallation', hoehe: 27 },
      { name: 'led-kasten als geschenk', hoehe: 22 },
    ],
    beschreibung: 'schematischer graph: früher lagen die einstiegskosten so hoch, dass sich nur große dinge wie auto und kühlschrank gelohnt haben. mit ki liegen sie viel tiefer, jetzt lohnen sich auch futterautomat für die katze, pflanzen-gießer, kunstinstallation und led-kasten als geschenk.',
    hinweis: 'schematisch. je größer der balken, desto mehr bringt die idee.',
  },
  folgen: ['viel günstiger', 'mehr ideen lohnen sich'],
  schluss: 'anticoerper baut dinge, die sich früher nicht gelohnt haben.',
  unterzeile: 'wie ein antikörper: erkennt fremde strukturen und dockt an.',
}

export const LEISTUNGEN = [
  { titel: 'ki in bestehende systeme', text: 'ich schau mir an, wie ein ablauf heute läuft, und baue ki dort ein, wo sie arbeit abnimmt. zum beispiel prüfungen, die bisher von hand liefen.' },
  { titel: 'produkte & software', text: 'apps, web-produkte, interne werkzeuge. vom ersten prototyp bis es läuft.' },
  { titel: 'hardware & prototypen', text: 'firmware, elektronik, motoren und sensoren, bis zum gerät, das andere benutzen können.' },
  { titel: 'systeme neu denken', text: 'ich arbeite eng mit design-teams und schau mir an, wie menschen ein system wirklich benutzen, bevor ich etwas daran ändere.' },
]

export const KOMPETENZEN = [
  { gruppe: 'ki', punkte: ['llm-integration', 'agenten & harnesses', 'ml-pipelines & computer vision', 'eigene modelle trainieren'] },
  { gruppe: 'software', punkte: ['systemarchitektur & systems thinking', 'backend & infrastruktur', 'web & apps (react, fastapi)', 'sdk-design, low level in c/c++'] },
  { gruppe: 'hardware', punkte: ['firmware: esp32, nrf, stm32 (esp-idf, nrf sdk)', 'motorsteuerung & mechatronik', 'ros2 & robotik', 'hardware hacking'] },
  { gruppe: 'arbeitsweise', punkte: ['systeme erkennen', 'technische verantwortung über den ganzen stack', 'design-zusammenarbeit', 'pitchen & startup'] },
]

/** Lebenslauf als „building stuff“: die Projekte sind der Lebenslauf . */
export const STATIONEN = [
  { zeit: 'seit 2026', was: 'anticoerper', detail: 'freelance. aktuell: markenprüfung für einen konzern' },
  { zeit: '2024–2026', was: 'felya labs', detail: 'mitgründer, firmware und software für ein hand-exoskelett' },
  { zeit: 'die ganze zeit', was: 'viele projekte', detail: 'immobot, virtubooth, inventar per foto, ion like fish, seedington, un escap, led-kasten und was sonst noch auf dem tisch lag' },
  { zeit: 'seit 2022', was: 'code & context, th köln', detail: 'studium zwischen code, design und entrepreneurship' },
]
