import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { PROJEKTE, type Projekt } from '../../data/projekte'
import { Abschnittskopf, Markierung } from '../../design/Bausteine'
import { PROJEKT_RENDERS } from '../../raum/renders'
import { Clip, Foto, Ph, RenderBild } from './Bilder'
import { bildtext, medienVon, srcsetVon } from './medien'
import { BREIT, RUHIG, useMedia, useScrollEffekt } from './scroll'
import './projekte.css'

/*
 * 05 Projekte: statt einer langen Abfolge schweben die Objekte frei auf einem Feld, so hoch wie ein Bildschirm.
 * Klick öffnet das Projekt als modaler <dialog> darüber. Medien laden erst beim Öffnen.
 * Direkt verlinkbar: anticoerper.com/#projekt-<id>.
 */

/* ---------- Welches Projekt ist offen: im Hash gespiegelt ---------- */

const ausHash = () => {
  const id = location.hash.match(/^#projekt-(.+)$/)?.[1]
  return id && PROJEKTE.some(p => p.id === id) ? id : null
}

// Öffnen von der Seite aus legt einen Verlaufseintrag an, damit die Zurück-Geste das Projekt schließt statt die Seite zu verlassen.
let gepusht = false

export function zeigeProjekt(id: string | null) {
  if (id) {
    const ziel = `#projekt-${id}`
    if (ausHash()) history.replaceState(null, '', ziel)
    else { history.pushState(null, '', ziel); gepusht = true }
  } else if (gepusht) {
    gepusht = false
    history.back() // löst selbst hashchange aus
    return
  } else {
    history.replaceState(null, '', location.pathname + location.search)
  }
  dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useProjektWahl() {
  const [id, setId] = useState<string | null>(ausHash)
  useEffect(() => {
    const onHash = () => {
      const neu = ausHash()
      if (!neu) gepusht = false
      setId(neu)
    }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])
  return id
}

/* ---------- Das Feld ---------- */

// Seitenverhältnis der freigestellten Renders: das Objekt nimmt so viel Fläche ein, wie seine Relevanz sagt, egal wie es geschnitten ist.
const FORMAT: Record<string, number> = {
  'exo-modul': 1600 / 802, 'tablet-werkzeug': 1503 / 1425, 'handy-telegram': 791 / 1600, makerspace: 1291 / 1600,
  'globus-daten': 1119 / 1159, 'drohne-seedpods': 1388 / 921, 'led-kasten': 1600 / 1323, 'untertitel-wellenform': 1600 / 1100,
}

// Plätze von Hand: x/y = Mitte des Objekts als Anteil des Felds. m = Spalten im schmalen Raster (von, bis), o = Versatz nach unten in px.
type Platz = { x: number; y: number; m: [number, number]; o?: number }
const PLATZ: Record<string, Platz> = {
  exoskelett: { x: 0.24, y: 0.33, m: [1, 13] },
  konzern: { x: 0.7, y: 0.36, m: [1, 13] },
  immobot: { x: 0.5, y: 0.28, m: [2, 5], o: 12 },
  makerspace: { x: 0.06, y: 0.82, m: [1, 5], o: 20 },
  virtubooth: { x: 0.39, y: 0.8, m: [5, 13] },
  'ion-like-fish': { x: 0.92, y: 0.6, m: [2, 6] },
  seedington: { x: 0.62, y: 0.86, m: [7, 13], o: 18 },
  'un-escap': { x: 0.93, y: 0.2, m: [1, 5] },
  'led-kasten': { x: 0.2, y: 0.84, m: [5, 9], o: 26 },
  untertitel: { x: 0.84, y: 0.9, m: [9, 13] },
}
/** Neue Projekte ohne eigenen Platz: gleichmäßig über das Feld gestreut. */
const platzVon = (p: Projekt, i: number): Platz => PLATZ[p.id] ?? { x: 0.12 + ((i * 0.618) % 1) * 0.76, y: 0.15 + ((i * 0.382) % 1) * 0.7, m: [1 + (i % 2) * 6, 7 + (i % 2) * 6] }

const seitenverhaeltnis = (p: Projekt) => {
  const r = PROJEKT_RENDERS[p.id]?.[0]
  if (r) return FORMAT[r.name] ?? 1
  if (p.bilder?.[0]) { const [b, h] = bildtext(p.bilder[0]).masse; return b / h }
  return 1.4
}

// Kleine Fassungen der Renders fürs Feld (public/3d/feld/): ein Objekt ist hier höchstens rund 560 px breit, das Original 1600 px.
const FELD_BASIS = `${import.meta.env.BASE_URL}3d/feld/`
const FELD_BREITEN: Record<string, number[]> = {
  'exo-modul': [480, 800, 1280], 'tablet-werkzeug': [480, 800, 1280], makerspace: [240, 480, 800],
  'handy-telegram': [240, 480], 'globus-daten': [240, 480], 'drohne-seedpods': [240, 480], 'led-kasten': [240, 480], 'untertitel-wellenform': [240, 480],
}
const SIZES: Record<Projekt['relevanz'], string> = {
  gross: '(max-width: 899px) 90vw, 600px',
  mittel: '(max-width: 899px) 46vw, 240px',
  klein: '(max-width: 899px) 40vw, 160px',
}

function Objekt({ p }: { p: Projekt }) {
  const r = PROJEKT_RENDERS[p.id]?.[0]
  const foto = p.bilder?.[0]
  const sizes = SIZES[p.relevanz]
  if (r) {
    const breiten = FELD_BREITEN[r.name]
    const srcSet = breiten?.map(w => `${FELD_BASIS}${r.name}-${w}.webp ${w}w`).join(', ')
    return <img className="x-f-render" src={r.webp} srcSet={srcSet} sizes={srcSet && sizes} alt="" loading="lazy" decoding="async" draggable={false} />
  }
  if (foto) return <img className="x-f-foto" sizes={sizes} srcSet={srcsetVon(foto)} src={foto} alt="" loading="lazy" decoding="async" draggable={false} />
  return <span className="x-f-wort" aria-hidden="true">{p.titel}</span>
}

const zufall = (seed: number) => {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/** Treibweg je Objekt, einmal ausgewürfelt: läuft als CSS-Animation auf dem Compositor, ohne JavaScript pro Bild. */
const treiben = (i: number): CSSProperties => {
  const rnd = zufall(41 + i * 97)
  const weg = (max: number) => `${((rnd() * 2 - 1) * max).toFixed(1)}px`
  const dreh = () => `${((rnd() * 2 - 1) * 1.4).toFixed(2)}deg`
  return {
    '--ax': weg(14), '--ay': weg(12), '--ar': dreh(), '--bx': weg(14), '--by': weg(12), '--br': dreh(), '--cx': weg(14), '--cy': weg(12), '--cr': dreh(),
    '--dauer': `${(18 + rnd() * 12).toFixed(1)}s`, '--vor': `${(-rnd() * 30).toFixed(1)}s`,
  } as CSSProperties
}

/**
 * Treiben läuft in CSS; hier nur, was der Zeiger auslöst: Ausweichen als kleine Feder auf dem äußeren Element.
 * Die Schleife läuft nur, solange sich etwas bewegt. Maße sind gecacht (messen), pro Bild wird kein Layout gelesen.
 * Liegt der Zeiger auf einem Objekt, bleibt es stehen, damit man es treffen kann.
 * Dazu Klassen am Feld: `laeuft` (nah am Bildschirm, nur dann Ebenen und Animation), `da` und `kommt` (Auftritt beim ersten Erscheinen).
 */
function useAusweichen(feld: RefObject<HTMLUListElement | null>, an: boolean) {
  const messen = useRef<() => void>(() => {})
  useEffect(() => {
    const wurzel = feld.current
    if (!wurzel || !an) return
    const els = [...wurzel.children] as HTMLElement[]
    const n = els.length
    const x = new Float32Array(n), y = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n)
    const mx = new Float32Array(n), my = new Float32Array(n), hb = new Float32Array(n), hh = new Float32Array(n)
    let oben = 0, links = 0, zx = -1e6, zy = -1e6, raf = 0, letzte = 0, auftritt = 0

    const frame = (jetzt: number) => {
      raf = 0
      const dt = Math.min((jetzt - (letzte || jetzt - 16)) / 1000, 1 / 30)
      letzte = jetzt
      const RAND = 120, K = 16, C = 6.5
      let bewegt = false
      for (let i = 0; i < n; i++) {
        let tx = 0, ty = 0
        const dx = mx[i] + x[i] - zx, dy = my[i] + y[i] - zy
        const ax = Math.abs(dx) - hb[i], ay = Math.abs(dy) - hh[i]
        if (ax < 0 && ay < 0) { tx = x[i]; ty = y[i] }
        else {
          const e = Math.hypot(Math.max(ax, 0), Math.max(ay, 0))
          if (e < RAND) {
            const d = Math.hypot(dx, dy) + 1e-3, k = (1 - e / RAND) ** 2 * 42
            tx = (dx / d) * k; ty = (dy / d) * k
          }
        }
        if (Math.abs(tx - x[i]) + Math.abs(ty - y[i]) + Math.abs(vx[i]) + Math.abs(vy[i]) < 0.05) {
          if (vx[i] || vy[i]) { vx[i] = vy[i] = 0 }
          continue
        }
        bewegt = true
        vx[i] += (K * (tx - x[i]) - C * vx[i]) * dt
        vy[i] += (K * (ty - y[i]) - C * vy[i]) * dt
        x[i] += vx[i] * dt; y[i] += vy[i] * dt
        // ganz in Ruhe zählt wieder die Stelle aus dem CSS (auch fürs Auftreten)
        els[i].style.transform = Math.abs(x[i]) + Math.abs(y[i]) < 0.1 && !tx && !ty ? '' : `translate(${x[i].toFixed(1)}px,${y[i].toFixed(1)}px)`
      }
      if (bewegt) raf = requestAnimationFrame(frame)
      else letzte = 0
    }
    const anstossen = () => { if (!raf) raf = requestAnimationFrame(frame) }

    messen.current = () => {
      const r = wurzel.getBoundingClientRect()
      oben = r.top + scrollY
      links = r.left + scrollX
      for (let i = 0; i < n; i++) {
        hb[i] = els[i].offsetWidth / 2; hh[i] = els[i].offsetHeight / 2
        mx[i] = els[i].offsetLeft + hb[i]; my[i] = els[i].offsetTop + hh[i]
      }
    }
    messen.current()

    const io = new IntersectionObserver(([e]) => {
      wurzel.classList.toggle('laeuft', e.isIntersecting)
      if (e.isIntersecting && !wurzel.classList.contains('da')) {
        wurzel.classList.add('da', 'kommt')
        auftritt = window.setTimeout(() => wurzel.classList.remove('kommt'), 1700)
      }
    }, { rootMargin: '10% 0px' })
    io.observe(wurzel)

    const beiZeiger = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      zx = e.pageX - links; zy = e.pageY - oben
      anstossen()
    }
    const zeigerWeg = () => { zx = zy = -1e6; anstossen() }
    wurzel.addEventListener('pointermove', beiZeiger, { passive: true })
    wurzel.addEventListener('pointerleave', zeigerWeg)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(auftritt)
      io.disconnect()
      wurzel.removeEventListener('pointermove', beiZeiger)
      wurzel.removeEventListener('pointerleave', zeigerWeg)
      wurzel.classList.remove('laeuft', 'da', 'kommt')
      for (const el of els) el.style.transform = ''
      messen.current = () => {}
    }
  }, [feld, an])
  useScrollEffekt({ messen: () => messen.current(), lesen: () => {} }, an)
}

export function Projekte({ nr, gesamt }: { nr: number; gesamt: number }) {
  const feld = useRef<HTMLUListElement>(null)
  const breit = useMedia(BREIT), ruhig = useMedia(RUHIG)
  useAusweichen(feld, breit && !ruhig)
  return (
    <section id="x-projekte" className="x-sek x-projekte">
      <div className="x-rahmen">
        <Abschnittskopf nr={nr} titel="projekte" gesamt={gesamt} />
        <p className="x-f-hinweis">such dir eins aus.</p>
      </div>
      <ul className="x-feld" ref={feld}>
        {PROJEKTE.map((p, i) => {
          const pl = platzVon(p, i), ar = seitenverhaeltnis(p), w = Math.sqrt(ar)
          return (
            <li key={p.id} className={`x-f x-f-${p.relevanz}`}
              style={{ '--x': pl.x, '--y': pl.y, '--bf': w.toFixed(3), '--hf': (1 / w).toFixed(3), '--bild': ar.toFixed(3), '--von': pl.m[0], '--bis': pl.m[1], '--o': `${pl.o ?? 0}px`, '--dreh': `${(p.dreh / 2).toFixed(1)}deg` } as CSSProperties}>
              <div className="x-f-treiben" style={treiben(i)}>
                <button type="button" className="x-f-knopf" data-projekt={p.id} aria-haspopup="dialog" aria-label={`${p.titel}, ${p.label}. projekt öffnen`} onClick={() => zeigeProjekt(p.id)}>
                  <span className="x-f-bild"><Objekt p={p} /></span>
                  <span className="x-f-name" aria-hidden="true"><b>{p.titel}</b><small>{p.label}</small></span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ---------- Das Overlay ---------- */

/** Zeitangabe ohne Wörter, die schon im Label stehen („auftrag · laufend“ + „2026, laufend“ → „2026“; „nebenbei“ nur einmal). */
function zeitOhneDoppel(p: Projekt) {
  const z = p.zeitraum.trim()
  if (!z || z === p.label) return undefined
  return z.split(/,\s*/).filter(teil => !p.label.includes(teil)).join(', ') || undefined
}

/**
 * Laufender Auftrag: der Ablauf des Werkzeugs als kleine Pipeline ersetzt die Abschnitte „das werkzeug“ und „wo ki reinkommt“
 * (sie sagt dasselbe). Screenshots vom Konzern gibt es nicht, darum zeigt die Pipeline, was das Werkzeug tut.
 */
const ABLAUF = [
  { wer: 'teams', was: 'reichen entwürfe für werbung und kommunikation ein' },
  { wer: 'ki prüft vor', was: 'zum beispiel schriften im entwurf erkennen und vermessen' },
  { wer: 'design-team', was: 'prüft, ob der entwurf zur marke passt' },
]

// Anzeigebreite im Overlay (projekte.css: Medien 7 von 12 Spalten, Sheet höchstens 1180 px)
const GROSS = '(max-width: 899px) calc(100vw - 48px), 680px'
const KLEIN = '(max-width: 899px) 46vw, 330px'

function Inhalt({ p }: { p: Projekt }) {
  const { haupt, galerie, zuAbschnitt } = medienVon(p, 5)
  const render = PROJEKT_RENDERS[p.id]?.[0]
  const zeit = zeitOhneDoppel(p)
  const links = (p.links ?? []).filter(l => l.url.startsWith('http'))
  const abschnitte = p.status ? p.abschnitte.filter(a => a.titel === 'meine rolle') : p.abschnitte
  return (
    <>
      <div className="x-po-kopf">
        <p className="x-po-meta"><span>{p.label}</span>{zeit && <span><Ph>{zeit}</Ph></span>}</p>
        <h2 className="x-po-titel" id="x-po-titel" tabIndex={-1}>{p.titel}</h2>
        <p className="x-po-satz">{p.satz}</p>
        {p.rolle && <p className="x-po-rolle"><Ph>{p.rolle}</Ph></p>}
      </div>
      <div className="x-po-raster">
        <div className="x-po-medien">
          {haupt
            ? <Foto src={haupt} sizes={GROSS} />
            : render && <RenderBild r={render} className="x-po-render" />}
          {p.clip && <Clip clip={p.clip} />}
          {galerie.length > 0 && (
            <div className="x-po-galerie">
              {galerie.map(s => <Foto key={s} src={s} sizes={KLEIN} />)}
            </div>
          )}
        </div>
        <div className="x-po-text">
          {p.status && (
            <div className="x-po-ablauf">
              <h3 className="x-po-h">so läuft eine prüfung</h3>
              <ol className="x-ablauf" aria-label="ablauf einer prüfung">
                {ABLAUF.map((s, i) => (
                  <li key={s.wer} className={i === 1 ? 'x-ablauf-ki' : undefined}>
                    <span className="x-ablauf-punkt" aria-hidden="true" />
                    <b>{s.wer}</b>
                    <span>{s.was}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="x-po-teile">
            {abschnitte.map((a, i) => (
              <section key={a.titel}>
                {a.titel !== 'notiz' && <h3 className="x-po-h">{p.prio === 1 && i === abschnitte.length - 1 ? <Markierung art="gruen">{a.titel}</Markierung> : a.titel}</h3>}
                <p><Ph>{a.text}</Ph></p>
                {zuAbschnitt(a.titel).map(s => <Foto key={s} src={s} sizes={KLEIN} />)}
              </section>
            ))}
          </div>
          <div className="x-po-fuss">
            {p.tags.length > 0 && <ul className="ac-chips">{p.tags.map(t => <li key={t} className="ac-chip">{t}</li>)}</ul>}
            {links.length > 0 && (
              <ul className="x-po-links">
                {links.map(l => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.label} <span aria-hidden="true">↗</span></a></li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/** Gehört an die Wurzel der Seite. Fokusfalle und Esc kommen vom modalen <dialog>. */
export function ProjektOverlay({ id }: { id: string | null }) {
  const ref = useRef<HTMLDialogElement>(null)
  const zuletzt = useRef(id)
  if (id) zuletzt.current = id
  const i = PROJEKTE.findIndex(p => p.id === id)
  const p = PROJEKTE[i]
  const nachbar = (d: number) => PROJEKTE[(i + d + PROJEKTE.length) % PROJEKTE.length]

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (id && !d.open) {
      const html = document.documentElement
      const balken = innerWidth - html.clientWidth
      html.classList.add('x-gesperrt')
      if (balken) html.style.paddingRight = `${balken}px`
      d.showModal()
    } else if (!id && d.open) d.close()
  }, [id])

  // jedes Projekt beginnt oben, der Screenreader beim Titel
  useEffect(() => {
    if (!id) return
    ref.current?.scrollTo(0, 0)
    ref.current?.querySelector<HTMLElement>('#x-po-titel')?.focus({ preventScroll: true })
  }, [id])

  const zu = () => {
    document.documentElement.classList.remove('x-gesperrt')
    document.documentElement.style.paddingRight = ''
    if (ausHash()) zeigeProjekt(null)
    // der Dialog gibt den Fokus selbst zurück; war der Auslöser ein Menüpunkt, gibt es ihn nicht mehr: dann das Objekt auf dem Feld
    if (document.activeElement === document.body || !document.activeElement) {
      document.querySelector<HTMLElement>(`[data-projekt="${zuletzt.current}"]`)?.focus({ preventScroll: true })
    }
  }

  return (
    <dialog ref={ref} className="x-po" aria-labelledby="x-po-titel" onClose={zu}
      onClick={e => { if (e.target === ref.current) zeigeProjekt(null) }}>
      {p && (
        <div className="x-po-innen">
          <div className="x-po-leiste">
            <button type="button" className="x-po-knopf" onClick={() => zeigeProjekt(nachbar(-1).id)} aria-label={`vorheriges projekt: ${nachbar(-1).titel}`}>
              <span aria-hidden="true">←</span>
            </button>
            <span className="x-po-stand ac-label">{String(i + 1).padStart(2, '0')} / {String(PROJEKTE.length).padStart(2, '0')}</span>
            <button type="button" className="x-po-knopf" onClick={() => zeigeProjekt(nachbar(1).id)} aria-label={`nächstes projekt: ${nachbar(1).titel}`}>
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" className="x-po-knopf x-po-zu" onClick={() => zeigeProjekt(null)} aria-label="schließen">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
          <Inhalt key={p.id} p={p} />
        </div>
      )}
    </dialog>
  )
}
