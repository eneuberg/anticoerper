/**
 * anticoerper – Design-Tokens für JS (three.js, Canvas, Inline-Styles).
 * Gleiche Werte wie ./tokens.css. Wer hier etwas ändert, ändert es dort mit.
 */

export type PaletteName = 'feld' | 'nacht' | 'dunst'
export type Rolle =
  | 'grund' | 'flaeche' | 'vertieft' | 'text' | 'leise' | 'linie'
  | 'gruen' | 'gruenTinte' | 'orange' | 'orangeTinte' | 'tiefe'
  | 'zartGruen' | 'zartOrange' | 'aufGruen' | 'aufOrange' | 'aufOrangeGross' | 'aufTiefe'
export type Palette = Record<Rolle, string>

export const PALETTEN: Record<PaletteName, Palette> = {
  /** Empfohlen. Kühles Grau mit grünem Stich, Grün als Fläche, Orange als Markierung, Navy als Tiefe. */
  feld: {
    grund: '#E3E9E5', flaeche: '#F4F7F5', vertieft: '#CDD7D1',
    text: '#121714', leise: '#4F5B54', linie: '#B3BFB8',
    gruen: '#3BE565', gruenTinte: '#0A7033',
    orange: '#E95420', orangeTinte: '#B53A0E',
    tiefe: '#14304A', zartGruen: '#BDEFCB', zartOrange: '#F6BFA3',
    aufGruen: '#121714', aufOrange: '#121714', aufOrangeGross: '#FFFFFF', aufTiefe: '#F4F7F5',
  },
  /** Alternative, hart: Grün auf grünstichigem Schwarz. */
  nacht: {
    grund: '#0E1310', flaeche: '#171E1A', vertieft: '#222B25',
    text: '#E4ECE6', leise: '#8F9C94', linie: '#2E3832',
    gruen: '#3BE565', gruenTinte: '#3BE565',
    orange: '#FF6633', orangeTinte: '#FF6633',
    tiefe: '#1F3B5C', zartGruen: '#1E4A2C', zartOrange: '#4A2618',
    aufGruen: '#0E1310', aufOrange: '#0E1310', aufOrangeGross: '#0E1310', aufTiefe: '#E4ECE6',
  },
  /** Alternative, weich: Nebel-Mint, gedämpfte Zwischentöne, Flieder als Tiefe. */
  dunst: {
    grund: '#DCE8E0', flaeche: '#EEF4F0', vertieft: '#C8D8CE',
    text: '#1F2C25', leise: '#53625A', linie: '#AFC2B6',
    gruen: '#3BE565', gruenTinte: '#116B33',
    orange: '#E95420', orangeTinte: '#B23A10',
    tiefe: '#B9C3EE', zartGruen: '#A9EDBF', zartOrange: '#F7B899',
    aufGruen: '#1F2C25', aufOrange: '#1F2C25', aufOrangeGross: '#FFFFFF', aufTiefe: '#1F2C25',
  },
}

export const EMPFOHLEN: PaletteName = 'feld'
/** Die Farben der empfohlenen Palette, für alles, was nicht umschaltet. */
export const FARBE = PALETTEN[EMPFOHLEN]

/** Rolle → CSS-Variable. */
export const CSS_VAR: Record<Rolle, string> = {
  grund: '--ac-grund', flaeche: '--ac-flaeche', vertieft: '--ac-vertieft',
  text: '--ac-text', leise: '--ac-leise', linie: '--ac-linie',
  gruen: '--ac-gruen', gruenTinte: '--ac-gruen-tinte', orange: '--ac-orange', orangeTinte: '--ac-orange-tinte',
  tiefe: '--ac-tiefe', zartGruen: '--ac-zart-gruen', zartOrange: '--ac-zart-orange',
  aufGruen: '--ac-auf-gruen', aufOrange: '--ac-auf-orange', aufOrangeGross: '--ac-auf-orange-gross', aufTiefe: '--ac-auf-tiefe',
}

/**
 * Für three.js: Markenfarben als Zahl (0xRRGGBB). Achtung Farbraum: Werte sind sRGB wie im CSS,
 * in three.js mit `new Color().setHex(n, SRGBColorSpace)` bzw. `color.convertSRGBToLinear()` setzen.
 * `pastell*` sind gedämpfte Töne für weiche Materialien; sie liegen bewusst heller als die UI-Zwischentöne,
 * weil Licht und Schatten sie im Render abdunkeln.
 */
export const DREI = {
  gruen: 0x3be565,
  orange: 0xe95420,
  schwarz: 0x121714,
  tiefe: 0x14304a,
  grund: 0xe3e9e5,
  flaeche: 0xf4f7f5,
  pastellGruen: 0xa6e3b8,
  pastellOrange: 0xf2b49a,
} as const

export const hexZuZahl = (hex: string) => parseInt(hex.replace('#', ''), 16)

/** Relative Leuchtdichte nach WCAG 2.x. */
export function leuchtdichte(hex: string) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Kontrastverhältnis zweier Hex-Farben (1–21). */
export function kontrast(a: string, b: string) {
  const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x)
  return (hell + 0.05) / (dunkel + 0.05)
}

/** WCAG-Stufe für Text: 'AAA' ≥ 7, 'AA' ≥ 4.5, 'AA groß' ≥ 3 (ab 24px bzw. 19px fett), sonst '–'. */
export function stufe(k: number) {
  return k >= 7 ? 'AAA' : k >= 4.5 ? 'AA' : k >= 3 ? 'AA groß' : '–'
}

export const SCHRIFT = {
  display: '"Big Shoulders Display", Impact, "Arial Narrow", sans-serif',
  serif: '"Instrument Serif", Georgia, "Times New Roman", serif',
  text: '"Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif',
  label: '"Martian Mono", ui-monospace, Menlo, monospace',
} as const

/** Typo-Skala. Fluid-Stufen als [min, max] in px, dazwischen wächst es mit der Breite (siehe tokens.css). */
export const SKALA = {
  /** Untergrenze: keine Schrift unter 11px */
  label: 11,
  klein: 14,
  text: 17,
  lead: [20, 27],
  h3: [28, 44],
  h2: [48, 112],
  h1: [80, 240],
  riesig: [180, 640],
} as const

export const ABSTAND = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 144] as const

export const FORM = {
  weich: { radiusS: 8, radiusM: 16, radiusL: 32, linie: 1, unschaerfe: 16 },
  hart: { radiusS: 0, radiusM: 0, radiusL: 0, linie: 2, unschaerfe: 0 },
} as const

export const BEWEGUNG = {
  kurz: 160,
  mittel: 320,
  lang: 640,
  schweben: 7000,
  /** cubic-bezier-Punkte, z. B. für eigene Easing-Funktionen in three.js */
  ruhig: [0.2, 0.7, 0.2, 1],
  /** nur für Objekte/3D, nie für UI-Zustände */
  feder: [0.2, 0.9, 0.25, 1.2],
  schwebenKurve: [0.45, 0, 0.55, 1],
} as const
