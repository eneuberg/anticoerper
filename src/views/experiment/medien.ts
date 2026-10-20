import { useEffect, useRef, useState } from 'react'
import type { Projekt } from '../../data/projekte'

// Fotos und Clips der Projekte (Projekt.bilder / Projekt.clip): Bildunterschrift, alt-Text und Pixelmaße.
// Gilt für alle drei Varianten aus Runde 3 (G Klar, H Experiment, I OS); die Darstellung baut jede Variante selbst.
// Bildunterschriften und alt-Texte.

export type Bildtext = {
  /** kurz, klein geschrieben, steht sichtbar unter oder auf dem Foto */
  unterschrift: string
  alt: string
  /** Breite × Höhe in Pixeln, für width/height und feste Seitenverhältnisse */
  masse: [number, number]
  /** Titel eines Abschnitts, zu dem das Foto gehört (z. B. „unterwegs“); sonst Galerie */
  abschnitt?: string
  /** Mittlere Bildfarbe: Hintergrund, solange das Foto lädt (kein graues Feld beim schnellen Scrollen) */
  farbe?: string
}

const P = '/projekte/'

export const BILDTEXTE: Record<string, Bildtext> = {
  [`${P}exoskelett/01-handschuh.webp`]: { unterschrift: 'der handschuh im studio', alt: 'hand-exoskelett mit blauen gliedern über den fingern, vor schwarzem hintergrund', masse: [2000, 1499], farbe: '#141519' },
  [`${P}exoskelett/05-roboterhand.webp`]: { unterschrift: 'handschuh steuert eine 3d-gedruckte roboterhand', alt: 'der handschuh neben einem laptop steuert eine graue, 3d-gedruckte roboterhand, future tech fest', masse: [1600, 1067], farbe: '#7c7c7e' },
  [`${P}exoskelett/02-prototyp.webp`]: { unterschrift: 'blauer prototyp mit platine', alt: 'blauer prototyp mit platine auf der hand, finger angewinkelt', masse: [1200, 1600], farbe: '#9b9591' },
  [`${P}exoskelett/03-platinen.webp`]: { unterschrift: 'zwei eigene platinen', alt: 'zwei eigene platinen auf dem schreibtisch, eine mit rundem display', masse: [900, 1600], farbe: '#605f5d' },
  [`${P}exoskelett/07-future-tech-fest.webp`]: { unterschrift: 'am stand beim future tech fest', alt: 'erik am felya-labs-stand beim future tech fest in düsseldorf, mit dem handschuh, dahinter das roll-up', masse: [1400, 934], abschnitt: 'unterwegs', farbe: '#5f626b' },
  [`${P}exoskelett/08-erster-prototyp.webp`]: { unterschrift: 'der erste prototyp', alt: 'frühes, grau gedrucktes exoskelett auf der hand (feelback glove)', masse: [1594, 1600], farbe: '#9d9388' },
  [`${P}ion-like-fish/01-lenker-aufgebaut.webp`]: { unterschrift: 'der aufgeschraubte lenker', alt: 'aufgeschraubter e-scooter-lenker mit kabeln und handy-halterung', masse: [1200, 1600], farbe: '#95897b' },
  [`${P}ion-like-fish/02-gasknopf.webp`]: { unterschrift: 'daumen am gasknopf', alt: 'daumen am gasknopf des scooter-lenkers', masse: [1205, 1600], farbe: '#6b615d' },
  [`${P}ion-like-fish/03-blinkerschalter.webp`]: { unterschrift: 'der blinkerschalter', alt: 'hand am blinkerschalter des lenkers', masse: [1205, 1600], farbe: '#7b6c63' },
  [`${P}ion-like-fish/04-spiel.webp`]: { unterschrift: 'startbild des spiels', alt: 'startbild des spiels: „dodge the escooter batteries“ über einem meer', masse: [567, 855], farbe: '#433d4e' },
  [`${P}virtubooth/01-ml-pipeline.webp`]: { unterschrift: 'admin: die ml-pipeline', alt: 'admin-ansicht der ml-pipeline: modelle, status, claude als optionaler ki-dienst', masse: [1400, 875], farbe: '#edeff1' },
  [`${P}virtubooth/02-beer-cam.webp`]: { unterschrift: 'gast-ansicht der beer cam', alt: 'gast-ansicht der beer cam: eine gezeichnete flasche zeigt, wohin man die flasche hält', masse: [1600, 1000], farbe: '#120d0a' },
  [`${P}virtubooth/03-admin-gaeste.webp`]: { unterschrift: 'admin: gästeliste', alt: 'admin: gästeliste mit status, instagram und gerät', masse: [1440, 900], farbe: '#f0f1f3' },
  [`${P}virtubooth/04-admin-export.webp`]: { unterschrift: 'admin: export', alt: 'admin: export als archiv, zeitraffer und qr-bogen', masse: [1440, 900], farbe: '#f0f0f0' },
}

/** Clips: Unterschrift und Maße, Schlüssel ist die mp4-Datei. */
export const CLIPTEXTE: Record<string, { unterschrift: string; masse: [number, number]; farbe?: string }> = {
  [`${P}exoskelett/clip-handschuh-studio.mp4`]: { unterschrift: 'finger öffnen und schließen', masse: [1280, 720], farbe: '#1b1a16' },
}

export const bildtext = (src: string): Bildtext => BILDTEXTE[src] ?? { unterschrift: '', alt: '', masse: [4, 3] }

/** Seitenverhältnis als Zahl (Breite / Höhe). */
export const verhaeltnis = (src: string) => { const [b, h] = bildtext(src).masse; return b / h }

/* ---------- Responsive Bilder (srcset) ---------- */

/**
 * Echte Breite jeder Datei unter public/projekte/ und welche kleinen Fassungen daneben liegen (`<name>-480.webp`,
 * `<name>-960.webp`). Nur was hier steht, kommt ins srcset (sonst 404).
 * Neues Foto: Breite eintragen, kleine Fassungen nur, wenn die Datei wirklich da ist.
 */
const FASSUNGEN: Record<string, { breite: number; klein: number[] }> = {
  [`${P}exoskelett/01-handschuh.webp`]: { breite: 1800, klein: [480, 960] },
  [`${P}exoskelett/02-prototyp.webp`]: { breite: 1050, klein: [480, 960] },
  [`${P}exoskelett/03-platinen.webp`]: { breite: 788, klein: [480] },
  [`${P}exoskelett/05-roboterhand.webp`]: { breite: 1400, klein: [480, 960] },
  [`${P}exoskelett/06-software.webp`]: { breite: 1400, klein: [480, 960] },
  [`${P}exoskelett/07-future-tech-fest.webp`]: { breite: 1400, klein: [480, 960] },
  [`${P}exoskelett/08-erster-prototyp.webp`]: { breite: 1395, klein: [480, 960] },
  [`${P}ion-like-fish/01-lenker-aufgebaut.webp`]: { breite: 1050, klein: [480, 960] },
  [`${P}ion-like-fish/02-gasknopf.webp`]: { breite: 1054, klein: [480, 960] },
  [`${P}ion-like-fish/03-blinkerschalter.webp`]: { breite: 1054, klein: [480, 960] },
  [`${P}ion-like-fish/04-spiel.webp`]: { breite: 567, klein: [480] },
  [`${P}virtubooth/01-ml-pipeline.webp`]: { breite: 1400, klein: [480, 960] },
  [`${P}virtubooth/02-beer-cam.webp`]: { breite: 1400, klein: [480, 960] },
  [`${P}virtubooth/03-admin-gaeste.webp`]: { breite: 1440, klein: [480, 960] },
  [`${P}virtubooth/04-admin-export.webp`]: { breite: 1440, klein: [480, 960] },
}

/** srcset aus dem Bildpfad: vorhandene kleine Fassungen plus Original mit seiner echten Breite. Unbekannte Datei: undefined. */
export function srcsetVon(src: string): string | undefined {
  const f = FASSUNGEN[src]
  if (!f) return undefined
  return [...f.klein.map(w => `${src.replace(/\.webp$/, `-${w}.webp`)} ${w}w`), `${src} ${f.breite}w`].join(', ')
}

/**
 * Anteil eines Fotos an der Breite einer Flex-Reihe, deren Bilder nach Seitenverhältnis wachsen (`flex: var(--r) 1 0`).
 * `extra`: Seitenverhältnisse weiterer Glieder der Reihe (z. B. ein Clip). Für `sizes` in Galerie-Streifen.
 */
export function anteil(src: string, reihe: string[], extra = 0) {
  const summe = reihe.reduce((s, x) => s + verhaeltnis(x), extra)
  return summe > 0 ? verhaeltnis(src) / summe : 1
}

/** Länge für `sizes`, auf ganze Einheiten aufgerundet (lieber eine Spur zu groß als unscharf). */
export const auf = (wert: number, einheit: 'vw' | 'px') => `${Math.ceil(wert)}${einheit}`

/**
 * Bilder eines Projekts aufgeteilt: das erste ist das Hauptbild, Fotos mit `abschnitt` gehören zu diesem Abschnitt,
 * der Rest ist Galerie (höchstens `max`). Ohne Bilder: haupt undefined, Seiten zeigen dann das Render.
 */
export function medienVon(p: Projekt, max = 4) {
  const [haupt, ...rest] = p.bilder ?? []
  const zuAbschnitt = (titel: string) => rest.filter(s => bildtext(s).abschnitt === titel)
  const galerie = rest.filter(s => !bildtext(s).abschnitt).slice(0, max)
  return { haupt, galerie, zuAbschnitt }
}

/**
 * Steuerung für einen stummen Loop-Clip: spielt nur, solange er sichtbar ist und niemand reduzierte Bewegung will.
 * Wer selbst pausiert oder startet, behält das (bis zum nächsten Laden). Außerhalb des Bildschirms immer Pause.
 */
export function useClip() {
  const ref = useRef<HTMLVideoElement>(null)
  const [laeuft, setLaeuft] = useState(false)
  const wunsch = useRef<boolean | null>(null) // null = automatisch, true/false = von Hand
  const sichtbar = useRef(false)
  const pruefe = useRef(() => {})

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true // React setzt das Attribut nicht zuverlässig, ohne muted kein Autoplay
    const ruhig = matchMedia('(prefers-reduced-motion: reduce)')
    pruefe.current = () => {
      const soll = sichtbar.current && (wunsch.current ?? !ruhig.matches)
      if (soll && v.paused) v.play().catch(() => setLaeuft(false))
      else if (!soll && !v.paused) v.pause()
    }
    const io = new IntersectionObserver(([e]) => { sichtbar.current = e.isIntersecting; pruefe.current() }, { threshold: 0.2 })
    io.observe(v)
    const an = () => setLaeuft(true), aus = () => setLaeuft(false)
    v.addEventListener('play', an); v.addEventListener('pause', aus)
    const r = () => pruefe.current()
    ruhig.addEventListener('change', r)
    return () => { io.disconnect(); ruhig.removeEventListener('change', r); v.removeEventListener('play', an); v.removeEventListener('pause', aus); v.pause() }
  }, [])

  const umschalten = () => { wunsch.current = !laeuft; pruefe.current() }
  return { ref, laeuft, umschalten }
}
