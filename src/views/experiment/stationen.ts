import { useEffect } from 'react'

/**
 * Titel → These-Karte → Aufschlüsselung: In diesem Bereich macht eine Scroll-Geste genau einen Schritt, danach scrollt die Seite normal.
 *
 * - Die Positionen misst die These einmal (setzeStationen), pro Bild wird nur scrollTo geschrieben.
 * - Trackpads laufen nach: Solange die Radereignisse dicht aufeinander folgen, gehören sie zur selben Geste und bewegen nichts mehr.
 * - Touch bleibt nativ (CSS-Scroll-Snap in experiment.css), Reduced Motion scrollt normal.
 */

const DAUER = 750
/** Länger als diese Pause zwischen zwei Radereignissen: eine neue Geste. */
const RUHE = 140

let ys: number[] = []
let frame = 0, faehrt = false, gesperrt = false, letztesRad = -Infinity

export function setzeStationen(neu: number[]) { ys = neu }

const sanft = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function abbrechen() {
  cancelAnimationFrame(frame)
  frame = 0
  faehrt = false
}

function fahre(ziel: number) {
  abbrechen()
  const von = scrollY
  if (Math.abs(ziel - von) < 1) return
  faehrt = true
  const start = performance.now()
  const tick = (jetzt: number) => {
    const t = Math.min(Math.max(jetzt - start, 0) / DAUER, 1)
    scrollTo({ top: von + (ziel - von) * sanft(t), behavior: 'instant' })
    if (t < 1) frame = requestAnimationFrame(tick)
    else { frame = 0; faehrt = false }
  }
  frame = requestAnimationFrame(tick)
}

/** Nächste Station in Scrollrichtung, oder undefined außerhalb des Bereichs. */
function naechste(richtung: number, y: number) {
  if (richtung > 0) return ys.find(v => v > y + 2)
  if (y > ys[ys.length - 1] + 2) return undefined
  return [...ys].reverse().find(v => v < y - 2)
}

const ueberlagert = (ziel: EventTarget | null) =>
  !!document.querySelector('dialog[open]') || (ziel instanceof Element && !!ziel.closest('.x-kapsel'))

function beimRad(e: WheelEvent) {
  if (e.ctrlKey || !ys.length || ueberlagert(e.target)) return
  const dieselbeGeste = e.timeStamp - letztesRad < RUHE
  letztesRad = e.timeStamp
  if (faehrt || (gesperrt && dieselbeGeste)) { e.preventDefault(); return }
  gesperrt = false
  const richtung = Math.sign(e.deltaY)
  if (!richtung) return
  const y = scrollY, letzte = ys[ys.length - 1]
  // von unten mit Schwung angekommen: erst an der Aufschlüsselung halten, nicht gleich weiter zur Karte
  if (richtung < 0 && dieselbeGeste && y <= letzte + 2) {
    e.preventDefault()
    fahre(letzte)
    gesperrt = true
    return
  }
  const ziel = naechste(richtung, y)
  if (ziel === undefined) return
  e.preventDefault()
  fahre(ziel)
  gesperrt = true
}

function beiTaste(e: KeyboardEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !ys.length || ueberlagert(e.target)) return
  const ziel = e.target instanceof Element ? e.target : null
  if (ziel?.closest('input,textarea,select,[contenteditable]')) return
  const leertaste = e.key === ' '
  if (leertaste && ziel?.closest('a,button,summary')) return
  const richtung = e.key === 'ArrowDown' || e.key === 'PageDown' || (leertaste && !e.shiftKey) ? 1
    : e.key === 'ArrowUp' || e.key === 'PageUp' || (leertaste && e.shiftKey) ? -1 : 0
  if (!richtung) return
  const station = naechste(richtung, scrollY)
  if (station === undefined) return
  e.preventDefault()
  if (!faehrt && !e.repeat) fahre(station)
}

/** Für die ↓-Knöpfe. Ohne Stationen (Reduced Motion) springt der Knopf direkt zum Element. */
export function geheZu(index: number, ersatz: string) {
  if (ys[index] !== undefined) fahre(ys[index])
  else document.querySelector(ersatz)?.scrollIntoView()
}

export function useStationen(aktiv: boolean) {
  useEffect(() => {
    if (!aktiv) return
    addEventListener('wheel', beimRad, { passive: false })
    addEventListener('keydown', beiTaste)
    // greift jemand selbst ein (Scrollbalken, Finger, Sprung per Hash), hört die Fahrt sofort auf
    addEventListener('pointerdown', abbrechen, { passive: true })
    addEventListener('touchstart', abbrechen, { passive: true })
    addEventListener('hashchange', abbrechen)
    return () => {
      removeEventListener('wheel', beimRad)
      removeEventListener('keydown', beiTaste)
      removeEventListener('pointerdown', abbrechen)
      removeEventListener('touchstart', abbrechen)
      removeEventListener('hashchange', abbrechen)
      abbrechen()
      ys = []
    }
  }, [aktiv])
}
