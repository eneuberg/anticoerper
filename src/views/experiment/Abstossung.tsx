import { useEffect, useLayoutEffect, useRef, type ElementType } from 'react'
import { RUHIG, klemmen, useMedia, useScrollEffekt } from './scroll'

/**
 * Ein Wort aus abstoßenden Körpern (anti + coerper).
 *
 * - Auftritt: Die Buchstaben starten als Haufen in der Mitte, stoßen sich ab und federn in ihre Plätze.
 * - Zeiger: Der Mauszeiger ist ein weiterer Körper, Buchstaben in seiner Nähe weichen aus.
 * - heben: Beim Herausscrollen steigen die Buchstaben unterschiedlich schnell auf (Anti-Schwerkraft).
 *
 * Performance: eine kleine Federsimulation, nur transform pro Buchstabe. Positionen werden einmal
 * gemessen (und bei Größenänderung neu). Die Schleife schläft, sobald alles ruht oder das Wort nicht
 * im Bild ist. Bei reduzierter Bewegung steht das Wort einfach da.
 */
type Props = {
  text: string
  as?: ElementType
  className?: string
  /** 'laden' = sofort, 'sichtbar' = wenn es ins Bild kommt, false = steht schon */
  auftritt?: 'laden' | 'sichtbar' | false
  heben?: boolean
  /** Schriftgröße so wählen, dass das Wort die Innenbreite des Elternelements füllt */
  fit?: boolean
}

const K = 140   // Federhärte
const C = 12.5  // Dämpfung: < 2·√K, also leichtes Überschwingen

type Sim = {
  messen: () => void
  lesen: (y: number, vh: number) => void
}

/** fester Zufall: gleiche Flugbahnen bei jedem Laden */
const zufall = (seed: number) => {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1
}

export function Abstossung({ text, as: Tag = 'span', className = '', auftritt = false, heben = false, fit = false }: Props) {
  const ref = useRef<HTMLElement>(null)
  const sim = useRef<Sim | null>(null)
  const ruhig = useMedia(RUHIG)
  const bewegt = !ruhig

  // Breite füllen (wie Wortmarke fit), vor dem ersten Bild
  useLayoutEffect(() => {
    const el = ref.current
    if (!fit || !el) return
    const run = () => {
      const box = el.parentElement!
      const cs = getComputedStyle(box)
      const verfuegbar = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      el.style.fontSize = '100px'
      const b = el.scrollWidth
      if (b) el.style.fontSize = `${(100 * verfuegbar / b * 0.99).toFixed(2)}px`
    }
    run()
    document.fonts?.ready.then(run)
    addEventListener('resize', run)
    return () => removeEventListener('resize', run)
  }, [fit, text])

  useEffect(() => {
    const wurzel = ref.current
    if (!wurzel || !bewegt) return
    const els = [...wurzel.querySelectorAll<HTMLElement>('[data-b]')]
    const n = els.length
    const x = new Float32Array(n), y = new Float32Array(n), r = new Float32Array(n)
    const vx = new Float32Array(n), vy = new Float32Array(n), vr = new Float32Array(n)
    const mx = new Float32Array(n), my = new Float32Array(n)
    const steig = new Float32Array(n), drift = new Float32Array(n), dreh = new Float32Array(n)
    const rnd = zufall(text.length * 97 + 11)
    for (let i = 0; i < n; i++) {
      steig[i] = 0.55 + (rnd() + 1) * 0.6   // 0.55 … 1.75
      drift[i] = rnd() * 0.5
      dreh[i] = rnd() * 22
    }
    let h = 1, oben = 0, links = 0, hebStart = 0, hebStrecke = 1
    let p = 0                       // Hebe-Fortschritt 0–1
    let zx = 1e6, zy = 1e6          // Zeiger in Wurzel-Koordinaten
    let zeigerX = -1e6, zeigerY = -1e6 // Zeiger im Fenster (clientX/Y)
    let raf = 0, letzte = 0, imBild = true, gestartet = auftritt === false

    const schreiben = () => {
      for (let i = 0; i < n; i++) els[i].style.transform = `translate3d(${x[i].toFixed(1)}px,${y[i].toFixed(1)}px,0) rotate(${r[i].toFixed(2)}deg)`
    }

    const schritt = (dt: number) => {
      // Fenster → Wurzel; oben/links sind gemessen, scrollY lesen ist billig
      zx = zeigerX + scrollX - links
      zy = zeigerY + scrollY - oben
      const R = h * 1.05
      let unruhe = 0
      for (let i = 0; i < n; i++) {
        let tx = drift[i] * p * h, ty = -steig[i] * p * h * 1.4, tr = dreh[i] * p
        // Zeiger stößt ab
        const dx = mx[i] + x[i] - zx, dy = my[i] + y[i] - zy
        const d2 = dx * dx + dy * dy
        if (d2 < R * R) {
          const d = Math.sqrt(d2) + 1e-3, k = (1 - d / R) ** 2 * h * 0.42
          tx += (dx / d) * k; ty += (dy / d) * k; tr += (dx / d) * (k / h) * 16
        }
        vx[i] += (K * (tx - x[i]) - C * vx[i]) * dt
        vy[i] += (K * (ty - y[i]) - C * vy[i]) * dt
        vr[i] += (K * (tr - r[i]) - C * vr[i]) * dt
        x[i] += vx[i] * dt; y[i] += vy[i] * dt; r[i] += vr[i] * dt
        unruhe += Math.abs(vx[i]) + Math.abs(vy[i]) + Math.abs(vr[i]) + Math.abs(tx - x[i]) + Math.abs(ty - y[i])
      }
      return unruhe
    }

    const frame = (jetzt: number) => {
      const dt = Math.min((jetzt - (letzte || jetzt - 16)) / 1000, 1 / 30)
      letzte = jetzt
      // zwei halbe Schritte: stabil auch bei 30 fps
      schritt(dt / 2)
      const unruhe = schritt(dt / 2)
      schreiben()
      if (unruhe > n * 0.08 && imBild) raf = requestAnimationFrame(frame)
      else { raf = 0; letzte = 0 }
    }
    const wecken = () => { if (!raf && imBild && gestartet) raf = requestAnimationFrame(frame) }

    sim.current = {
      messen: () => {
        h = wurzel.offsetHeight || 1
        const rr = wurzel.getBoundingClientRect()
        oben = rr.top + scrollY
        links = rr.left + scrollX
        for (let i = 0; i < n; i++) {
          mx[i] = els[i].offsetLeft + els[i].offsetWidth / 2
          my[i] = els[i].offsetTop + els[i].offsetHeight / 2
        }
        const vh = innerHeight
        hebStart = Math.max(0, oben + h - vh)
        hebStrecke = Math.max(1, vh * 0.85)
      },
      lesen: (yy) => {
        if (!heben) return
        const neu = klemmen((yy - hebStart) / hebStrecke)
        if (Math.abs(neu - p) > 0.0005) { p = neu; wecken() }
      },
    }
    sim.current.messen()

    const loslegen = () => {
      if (gestartet) return
      sim.current?.messen()
      const w = wurzel.offsetWidth
      for (let i = 0; i < n; i++) {
        // alle Körper auf einen Haufen in der Mitte, leicht verdreht
        x[i] = (w / 2 - mx[i]) * 0.92 + rnd() * h * 0.12
        y[i] = rnd() * h * 0.18
        r[i] = rnd() * 55
        vx[i] = vy[i] = vr[i] = 0
      }
      schreiben()
      wurzel.classList.remove('xa-warten')
      gestartet = true
      // ein Bild Haufen zeigen, dann stoßen sie sich ab
      setTimeout(wecken, auftritt === 'laden' ? 260 : 60)
    }

    const io = new IntersectionObserver(([e]) => {
      imBild = e.isIntersecting
      if (imBild && auftritt === 'sichtbar' && e.intersectionRatio > 0.35) loslegen()
      if (imBild) wecken()
    }, { threshold: [0, 0.35, 0.6] })
    io.observe(wurzel)

    let abbruch = false
    if (auftritt === 'laden') {
      // erst wenn die Schrift da ist, sonst stimmen die Plätze nicht
      const fertig = document.fonts?.ready ?? Promise.resolve()
      fertig.then(() => { if (!abbruch) requestAnimationFrame(loslegen) })
    }

    const fein = matchMedia('(pointer: fine)').matches
    const beiZeiger = (e: PointerEvent) => { zeigerX = e.clientX; zeigerY = e.clientY; wecken() }
    const zeigerWeg = () => { zeigerX = zeigerY = -1e6; wecken() }
    if (fein) {
      addEventListener('pointermove', beiZeiger, { passive: true })
      document.documentElement.addEventListener('pointerleave', zeigerWeg)
    }

    return () => {
      abbruch = true
      cancelAnimationFrame(raf)
      io.disconnect()
      removeEventListener('pointermove', beiZeiger)
      document.documentElement.removeEventListener('pointerleave', zeigerWeg)
      for (const el of els) el.style.transform = ''
      wurzel.classList.remove('xa-warten')
      sim.current = null
    }
  }, [bewegt, auftritt, heben, text])

  useScrollEffekt({
    messen: () => sim.current?.messen(),
    lesen: (y, vh) => sim.current?.lesen(y, vh),
  }, bewegt)

  const warten = bewegt && auftritt ? ' xa-warten' : ''
  return (
    <Tag ref={ref} className={`xa ${className}${warten}`}>
      {/* Vorlesetext als echter (unsichtbarer) Inhalt: aria-label ist auf <p> nicht erlaubt und wird oft ignoriert */}
      <span className="ac-unsichtbar xa-text">{text}</span>
      {[...text].map((c, i) => <span key={i} data-b aria-hidden="true" className="xa-b">{c === ' ' ? '\u00a0' : c}</span>)}
    </Tag>
  )
}
