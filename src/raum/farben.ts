import { DREI } from '../design/tokens'

// Zentrale Farb- und Materialkonfiguration für alles unter src/raum/.
// Markenfarben kommen aus src/design/tokens.ts (DREI, sRGB als Zahl). Nur Objekt-eigene
// Töne (Metall, Holz, Platine …) stehen hier. Modelle und Renders lesen alles von hier.

/** 0xRRGGBB → '#rrggbb' (sRGB, wie im CSS; THREE.Color.set rechnet selbst linear). */
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`

/** Markenfarben (sRGB-Hex) aus den Design-Tokens. */
export const MARKE = {
  gruen: hex(DREI.gruen),
  orange: hex(DREI.orange),
  schwarz: hex(DREI.schwarz),
  tiefe: hex(DREI.tiefe),
  grund: hex(DREI.grund),
  flaeche: hex(DREI.flaeche),
} as const

/** Alle Farben der 3D-Objekte. Weich = gedämpfte Varianten für die „soft“-Materialien. */
export const FARBEN = {
  ...MARKE,
  chrom: '#f2f3f5',
  alu: '#c9ccd1',
  graphit: '#5b5e63',
  weiss: '#f1f0ec',
  pastellGruen: hex(DREI.pastellGruen),
  pastellOrange: hex(DREI.pastellOrange),
  milchglas: '#f3f7f6',
  platineGruen: '#1d5a3c',
  platineSchwarz: '#1b1d1c',
  gold: '#e3b25a',
  kupfer: '#c9814f',
  holz: '#dcbb93',
  holzDunkel: '#b48a5f',
  led: hex(DREI.gruen),
  ledAus: '#4a4e4b',
  kabel: '#1e1f21',
  bildschirm: '#0d0f0e',
} as const

/** Material-Varianten der Antikörper (und Akzentteile anderer Objekte). */
export type MaterialArt = 'chrom' | 'gruen' | 'orange' | 'weich' | 'milchglas'
/** 'mix' mischt chrom, grün und orange. */
export type MaterialWahl = MaterialArt | 'mix'

/** PBR-Parameter je Variante. Farben referenzieren FARBEN, damit eine Änderung oben überall greift. */
export const MATERIAL: Record<MaterialArt, {
  farbe: string; metall: number; rauheit: number; lack?: number; lackRauheit?: number; schimmer?: number; deckkraft?: number
}> = {
  // poliertes Metall, nicht ganz spiegelnd, damit Kanten weich bleiben
  chrom: { farbe: FARBEN.chrom, metall: 1, rauheit: 0.12 },
  // Kunststoff mit Klarlack (Spielzeug-/Produktlook)
  gruen: { farbe: FARBEN.gruen, metall: 0, rauheit: 0.4, lack: 1, lackRauheit: 0.14 },
  orange: { farbe: FARBEN.orange, metall: 0, rauheit: 0.4, lack: 1, lackRauheit: 0.14 },
  // matter Soft-Touch-Kunststoff in Pastellgrün: kein Glanzpunkt, nur weiche Schatten
  weich: { farbe: FARBEN.pastellGruen, metall: 0, rauheit: 0.82, schimmer: 0.35 },
  // Milchglas: hell, halbtransparent, sehr diffuse Spiegelung
  milchglas: { farbe: FARBEN.milchglas, metall: 0, rauheit: 0.3, lack: 1, lackRauheit: 0.12, schimmer: 0.6, deckkraft: 0.58 },
}

/** Reihenfolge für 'mix'. */
export const MIX: MaterialArt[] = ['chrom', 'gruen', 'orange']
