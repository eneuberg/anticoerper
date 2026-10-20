import type { MaterialWahl } from './farben'

// Zuordnung Projekt → 3D-Standbilder unter public/3d/ (erzeugt mit scripts/render-3d.mjs).
// Alle PNGs sind freigestellt (Alpha), daneben liegt jeweils eine WebP-Version.

const BASIS = `${import.meta.env.BASE_URL}3d/`

export type Render = {
  /** Dateiname ohne Endung, gleich dem Szenen-Schlüssel in szenen.ts */
  name: string
  png: string
  webp: string
  /** Was drauf ist (für alt-Texte und die Galerie). */
  alt: string
}

const r = (name: string, alt: string): Render => ({ name, png: `${BASIS}${name}.png`, webp: `${BASIS}${name}.webp`, alt })

export const RENDERS = {
  exoModul: r('exo-modul', 'Mechanisches Fingermodul eines Hand-Exoskeletts mit Servo, Gelenkkette und Seilzug'),
  ledKasten: r('led-kasten', 'Holzkasten mit 8×8-LED-Matrix, einige LEDs leuchten grün, USB-Kabel'),
  platine: r('platine', 'Leiterplatte mit Mikrocontroller, Funkmodul, Bauteilen und Leiterbahnen'),
  handyTelegram: r('handy-telegram', 'Smartphone mit Chat: Bot schickt ein Wohnungsinserat und einen Anschreiben-Entwurf'),
  tablet: r('tablet-werkzeug', 'Tablet mit Oberfläche eines Design-Werkzeugs'),
  makerspace: r('makerspace', '3D-Drucker mit Filamentrolle und gedruckten Teilen'),
  globus: r('globus-daten', 'Globus mit Datensäulen über dem asiatisch-pazifischen Raum'),
  drohne: r('drohne-seedpods', 'Quadcopter mit Magazin für Samenkugeln, eine Kugel fällt gerade'),
  luftbild: r('luftbild-maske', 'Stück Stadtboden von oben, grüne Segmentierungsmaske über kahlen Erdflächen'),
  untertitel: r('untertitel-wellenform', 'Tonwellenform als 3D-Band mit schwebenden Untertitel-Kärtchen, ein Fachbegriff korrigiert'),
  antikoerperGruen: r('antikoerper-gruen', 'Y-förmiger Antikörper, grün glänzend, schwebend'),
  antikoerperOrange: r('antikoerper-orange', 'Y-förmiger Antikörper, orange glänzend, schwebend'),
  antikoerperMilchglas: r('antikoerper-milchglas', 'Y-förmiger Antikörper aus Milchglas, schwebend'),
  antikoerperGruppe: r('antikoerper-gruppe', 'Mehrere Antikörper in Chrom, Grün und Orange, schwerelos'),
  antikoerperGruppeChrom: r('antikoerper-gruppe-chrom', 'Mehrere Antikörper aus Chrom, schwerelos'),
  antikoerperGruppeWeich: r('antikoerper-gruppe-weich', 'Mehrere Antikörper in mattem Pastellgrün und Milchglas, schwerelos'),
} satisfies Record<string, Render>

/** Projekt-ID (wie in src/data/projekte.ts) → Renders, wichtigstes zuerst. */
export const PROJEKT_RENDERS: Record<string, Render[]> = {
  exoskelett: [RENDERS.exoModul],
  konzern: [RENDERS.tablet, RENDERS.antikoerperGruppe],
  'led-kasten': [RENDERS.ledKasten, RENDERS.platine],
  immobot: [RENDERS.handyTelegram],
  makerspace: [RENDERS.makerspace, RENDERS.platine],
  'un-escap': [RENDERS.globus],
  seedington: [RENDERS.drohne, RENDERS.luftbild],
  untertitel: [RENDERS.untertitel],
}

/** Antikörper-Renders je Material (auch Ersatzbild für Antikoerper3D ohne WebGL). */
export const ANTIKOERPER_RENDER: Record<MaterialWahl, string> = {
  chrom: RENDERS.antikoerperGruppeChrom.png,
  gruen: RENDERS.antikoerperGruen.png,
  orange: RENDERS.antikoerperOrange.png,
  weich: RENDERS.antikoerperGruppeWeich.png,
  milchglas: RENDERS.antikoerperMilchglas.png,
  mix: RENDERS.antikoerperGruppe.png,
}

/** Erstes Render-PNG eines Projekts oder undefined. */
export const renderFuer = (projektId: string): string | undefined => PROJEKT_RENDERS[projektId]?.[0]?.png
