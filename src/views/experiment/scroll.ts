import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react'

/**
 * Ein Scroll-Takt für die ganze Variante H.
 *
 * Regeln gegen Ruckeln:
 * - Ein passiver Scroll-Listener, höchstens ein requestAnimationFrame pro Bild.
 * - Pro Bild wird nur scrollY gelesen. Positionen (getBoundingClientRect) misst jeder Effekt einmal
 *   in `messen`, und nur neu, wenn sich Fenster- oder Seitengröße ändert (resize, ResizeObserver, Schriften).
 * - `lesen` schreibt nur transform/opacity oder CSS-Variablen, die in transform landen.
 */

export type Effekt = {
  /** Einmal und bei Größenänderung: Positionen messen, Höhen setzen. */
  messen?: (vh: number, vw: number) => void
  /** Pro Bild beim Scrollen: nur rechnen und transform schreiben. */
  lesen: (y: number, vh: number) => void
}

export class Takt {
  private effekte = new Set<Effekt>()
  private frame = 0
  private messFrame = 0
  private ro?: ResizeObserver
  private letzteHoehe = 0

  starten(wurzel: HTMLElement) {
    addEventListener('scroll', this.beimScrollen, { passive: true })
    addEventListener('resize', this.neuMessen)
    // Seite wird länger/kürzer (Bilder, Schriften, Umbruch): neu messen, aber nur bei echter Höhenänderung
    this.ro = new ResizeObserver(() => {
      const h = wurzel.offsetHeight
      if (h !== this.letzteHoehe) { this.letzteHoehe = h; this.neuMessen() }
    })
    this.ro.observe(wurzel)
    document.fonts?.ready.then(this.neuMessen)
    this.neuMessen()
  }

  stoppen() {
    removeEventListener('scroll', this.beimScrollen)
    removeEventListener('resize', this.neuMessen)
    this.ro?.disconnect()
    cancelAnimationFrame(this.frame)
    cancelAnimationFrame(this.messFrame)
    this.frame = this.messFrame = 0
  }

  anmelden(e: Effekt) {
    this.effekte.add(e)
    this.neuMessen()
    return () => { this.effekte.delete(e) }
  }

  private tick = () => {
    this.frame = 0
    const y = scrollY, vh = innerHeight
    for (const e of this.effekte) e.lesen(y, vh)
  }

  private beimScrollen = () => {
    if (!this.frame) this.frame = requestAnimationFrame(this.tick)
  }

  neuMessen = () => {
    if (this.messFrame) return
    this.messFrame = requestAnimationFrame(() => {
      this.messFrame = 0
      const vh = innerHeight, vw = document.documentElement.clientWidth
      for (const e of this.effekte) e.messen?.(vh, vw)
      this.tick()
    })
  }
}

export const TaktCtx = createContext<Takt | null>(null)

/**
 * Meldet einen Effekt am Takt an. `effekt` wird bei jedem Render neu gebaut,
 * angemeldet bleibt aber immer dieselbe Hülle (keine An-/Abmeldung pro Render).
 */
export function useScrollEffekt(effekt: Effekt, aktiv = true) {
  const takt = useContext(TaktCtx)
  const ref = useRef(effekt)
  ref.current = effekt
  useEffect(() => {
    if (!takt || !aktiv) return
    return takt.anmelden({
      messen: (vh, vw) => ref.current.messen?.(vh, vw),
      lesen: (y, vh) => ref.current.lesen(y, vh),
    })
  }, [takt, aktiv])
}

/** Seiten-Oberkante eines Elements (nur in `messen` aufrufen). */
export const seitenOben = (el: Element) => el.getBoundingClientRect().top + scrollY

export const klemmen = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)

/** Media Query als Zustand, live (z. B. reduzierte Bewegung, Breite). */
export function useMedia(query: string) {
  return useSyncExternalStore(
    cb => { const m = matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => matchMedia(query).matches,
    () => false,
  )
}

export const RUHIG = '(prefers-reduced-motion: reduce)'
/** Breite, ab der gepinnt, quer geschoben und WebGL gerendert wird. */
export const BREIT = '(min-width: 900px)'
