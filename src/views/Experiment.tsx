import { Fragment, Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from 'react'
import { PROJEKTE, type Projekt } from '../data/projekte'
import { KOMPETENZEN, LEISTUNGEN, PERSON, STATIONEN, THESE } from '../data/person'
import { useName } from '../components/Wortmarke'
import { Abschnittskopf, Markierung } from '../design/Bausteine'
import { PROJEKT_RENDERS, RENDERS } from '../raum/renders'
import { Abstossung } from './experiment/Abstossung'
import { Marke, Zeichen } from './experiment/Marke'
import { Ph, Profilfoto, RenderBild } from './experiment/Bilder'
import { srcsetVon } from './experiment/medien'
import { ProjektOverlay, Projekte, useProjektWahl, zeigeProjekt } from './experiment/Projekte'
import { RechtsDialog, useRecht } from './experiment/Rechtliches'
import { geheZu, setzeStationen, useStationen } from './experiment/stationen'
import { Vergleich } from './experiment/Vergleich'
import { BREIT, RUHIG, Takt, TaktCtx, klemmen, seitenOben, useMedia, useScrollEffekt } from './experiment/scroll'
import '../design/tokens.css'
import '../design/bausteine.css'
import './experiment.css'

// three.js (ca. 900 KB) nur laden, wenn die Antikörper wirklich gebraucht werden, nicht im Haupt-Chunk
const Antikoerper3D = lazy(() => import('../raum/Antikoerper3D').then(m => ({ default: m.Antikoerper3D })))

/*
 * Aufbau: Titel → These → Erik → Angebot → Projekte → Lebenslauf | Kompetenzen → Kontakt.
 * Die Kapsel oben links zeigt immer Nummer, Titel und Fortschritt. Pro Abschnitt genau ein Ausreißer:
 *   01 der Name kommt als Haufen abstoßender Buchstaben ins Bild
 *   02 ein grüner Körper wächst zum Feld, eine kurze Phrase der These wird beim Scrollen markiert wie ausgewählter Text
 *   03 Zeitungsseite, das Foto schiebt sich über die Schlagzeile
 *   04 schwebende 3D-Antikörper, angepinnt neben den Leistungen
 *   05 die Projekte schweben frei auf einem Feld, groß nach Relevanz; ein Klick öffnet sie als Overlay
 *   06 die Zeitleiste ist eine Grafik: Balken pro Station mit echtem Zeitraum, die übrigen Projekte als Reihe darunter
 *   07 „schreib mir.“ besteht wieder aus abstoßenden Buchstaben
 */

// Titel klein im Quelltext (Screenreader und Kopieren bekommen dasselbe wie die Anzeige). In Kapsel und Menü heißt 06
// „lebenslauf“ (danach suchen Personaler), die Überschrift selbst bleibt „building stuff“.
const ABSCHNITTE = [
  { id: 'x-titel', titel: 'titel' },
  { id: 'x-these', titel: 'these' },
  { id: 'x-erik', titel: 'erik' },
  { id: 'x-angebot', titel: 'was ich anbiete' },
  { id: 'x-projekte', titel: 'projekte' },
  { id: 'x-cv', titel: 'lebenslauf' },
  { id: 'x-kontakt', titel: 'kontakt' },
]
const GITHUB = 'https://github.com/eneuberg'
const GESAMT = ABSCHNITTE.length
const nn = (n: number) => String(n).padStart(2, '0')

const springe = (id: string) => {
  const ruhig = matchMedia(RUHIG).matches
  document.getElementById(id)?.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' })
}

/* ---------- Beobachter ---------- */

/** Welcher Abschnitt liegt auf der Linie bei 40 % Höhe? Nur IntersectionObserver. */
function useWoBinIch() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const io = new IntersectionObserver(eintraege => {
      for (const e of eintraege) {
        if (!e.isIntersecting) continue
        const a = ABSCHNITTE.findIndex(x => x.id === e.target.id)
        if (a >= 0) setIndex(a)
      }
    }, { rootMargin: '-40% 0px -59% 0px' })
    ABSCHNITTE.forEach(({ id }) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  return index
}

/** Elemente mit .x-rein bekommen .da, sobald sie ins Bild kommen (einmal). */
function useRein(wurzel: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const els = wurzel.current?.querySelectorAll('.x-rein')
    if (!els) return
    const io = new IntersectionObserver(eintraege => {
      for (const e of eintraege) if (e.isIntersecting) { e.target.classList.add('da'); io.unobserve(e.target) }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [wurzel])
}

/**
 * true, sobald das Element in die Nähe des Bildschirms kommt, oder vorher im Leerlauf nach dem Titel-Auftritt.
 * WebGL kompiliert beim Start Shader (auf schwachen Geräten einige 100 ms): das soll nicht mitten ins Scrollen fallen,
 * deshalb wartet der Leerlauf-Start, bis seit mindestens 800 ms nicht mehr gescrollt wurde.
 */
function useNah(ref: RefObject<HTMLElement | null>, rand = '60% 0px') {
  const [nah, setNah] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || nah) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNah(true) }, { rootMargin: rand })
    io.observe(el)
    let leer = 0, timer = 0, gescrollt = -Infinity
    const beimScrollen = () => { gescrollt = performance.now() }
    addEventListener('scroll', beimScrollen, { passive: true })
    const versuchen = () => {
      if (performance.now() - gescrollt < 800) { timer = window.setTimeout(versuchen, 400); return }
      if ('requestIdleCallback' in window) leer = requestIdleCallback(() => setNah(true), { timeout: 2000 })
      else setNah(true)
    }
    timer = window.setTimeout(versuchen, 2600)
    return () => { io.disconnect(); removeEventListener('scroll', beimScrollen); clearTimeout(timer); if (leer) cancelIdleCallback(leer) }
  }, [ref, rand, nah])
  return nah
}

/* ---------- Kapsel: wo bin ich ---------- */

/**
 * Farbe des Bands hinter der Kapsel: die des Abschnitts, der gerade oben unter dem Band liegt (grünes Feld der These,
 * Navy im Kontakt, sonst Grund). Nur IntersectionObserver auf einem schmalen Streifen oben, nichts pro Bild.
 */
function useBandFarbe() {
  const [farbe, setFarbe] = useState<'grund' | 'keins' | 'navy'>('grund')
  useEffect(() => {
    const oben = new Set<string>()
    const io = new IntersectionObserver(es => {
      for (const e of es) { if (e.isIntersecting) oben.add(e.target.id); else oben.delete(e.target.id) }
      setFarbe(oben.has('x-kontakt') ? 'navy' : oben.has('x-these-bahn') ? 'keins' : 'grund')
    }, { rootMargin: '0px 0px -94% 0px' })
    for (const id of ['x-these-bahn', 'x-kontakt']) { const el = document.getElementById(id); if (el) io.observe(el) }
    return () => io.disconnect()
  }, [])
  return farbe
}

function Kapsel({ index, sichtbar }: { index: number; sichtbar: boolean }) {
  const [offen, setOffen] = useState(false)
  const balken = useRef<HTMLSpanElement>(null)
  const css = useMemo(() => typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()'), [])
  // Fortschritt: mit CSS scroll-timeline läuft er ohne JS; sonst über den Takt (nur scaleX)
  const max = useRef(1)
  useScrollEffekt({
    messen: vh => { max.current = Math.max(1, document.documentElement.scrollHeight - vh) },
    lesen: y => { balken.current?.style.setProperty('--p', klemmen(y / max.current).toFixed(4)) },
  }, !css)

  const kopf = useRef<HTMLElement>(null)
  const bandFarbe = useBandFarbe()
  useEffect(() => {
    if (!offen) return
    const zu = (e: KeyboardEvent) => { if (e.key === 'Escape') setOffen(false) }
    const daneben = (e: PointerEvent) => { if (!kopf.current?.contains(e.target as Node)) setOffen(false) }
    addEventListener('keydown', zu)
    addEventListener('pointerdown', daneben)
    return () => { removeEventListener('keydown', zu); removeEventListener('pointerdown', daneben) }
  }, [offen])

  const titel = ABSCHNITTE[index].titel
  return (
    <>
    {/* Band über die volle Breite hinter der Kapsel, in der Farbe des Abschnitts darunter, nach unten auslaufend:
        Text, der darunter durchläuft, blendet aus statt sichtbar neben der Kapsel vorbeizulaufen */}
    <div className={`x-band${sichtbar || offen ? ' an' : ''}`} data-farbe={bandFarbe} aria-hidden="true" />
    {/* .an zeigt die Kapsel; :focus-within zeigt sie auch, wenn die Tastatur auf dem Titel hineinspringt (erster Tab-Stopp) */}
    <header ref={kopf} className={`x-kapsel${sichtbar || offen ? ' an' : ''}`}>
      <button className="x-kapsel-knopf" aria-expanded={offen} aria-controls="x-menue" onClick={() => setOffen(o => !o)}
        aria-label={`Abschnitt ${index + 1} von ${GESAMT}: ${titel}. Inhaltsverzeichnis`}>
        <Zeichen groesse={22} akzent="var(--ac-orange)" titel="" className="x-kapsel-zeichen" />
        <span className="x-kapsel-nr" aria-hidden="true">
          <span className="x-kapsel-null">0</span>
          <span className="x-kapsel-rolle"><span style={{ '--n': index } as CSSProperties}>{ABSCHNITTE.map((_, i) => <span key={i}>{i + 1}</span>)}</span></span>
        </span>
        <span className="x-kapsel-ges ac-label" aria-hidden="true">/ {nn(GESAMT)}</span>
        <span className="x-kapsel-titel" aria-hidden="true">
          <span key={titel} className="x-kapsel-wechsel">{titel}</span>
        </span>
        <span className="x-kapsel-balken" aria-hidden="true"><span ref={balken} className={`x-kapsel-fort${css ? ' css' : ''}`} /></span>
      </button>
      {offen && (
        <nav id="x-menue" className="x-menue" aria-label="Abschnitte">
          <ol>
            {ABSCHNITTE.map((a, i) => (
              <li key={a.id}>
                <button aria-current={i === index ? 'true' : undefined} onClick={() => { setOffen(false); springe(a.id) }}>
                  <span className="ac-label">{nn(i + 1)}</span>{a.titel}
                </button>
                {a.id === 'x-projekte' && (
                  <ol className="x-menue-unter">
                    {PROJEKTE.map((p, k) => (
                      <li key={p.id}><button aria-haspopup="dialog" onClick={() => { setOffen(false); zeigeProjekt(p.id) }}>
                        <span className="ac-label">05.{k + 1}</span>{p.titel}
                      </button></li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
    </>
  )
}

/* ---------- 01 Titel ---------- */

function Titel({ zeichen }: { zeichen: ReactNode }) {
  const name = useName()
  return (
    <section id="x-titel" className="x-titel" aria-label="Titel">
      <div className="x-titel-zeichen" aria-hidden="true">{zeichen}<span className="x-titel-schatten" /></div>
      <div className="x-titel-name">
        <Abstossung as="h1" className="x-name" text={name} auftritt="laden" heben fit />
      </div>
      <button type="button" className="x-titel-pfeil ac-label" aria-label="weiter zur these" onClick={() => geheZu(1, '#x-these')}>↓</button>
    </section>
  )
}

/* ---------- 02 These ---------- */

/** Die einzige markierte Stelle der These. */
const MARKIERT = 'in den dingen'

function These() {
  const ruhig = useMedia(RUHIG)
  const bahn = useRef<HTMLDivElement>(null)
  const karte = useRef<HTMLDivElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const innen = useRef<HTMLDivElement>(null)
  const satz = useRef<HTMLParagraphElement>(null)
  const platine = useRef<HTMLDivElement>(null)
  const weiter = useRef<HTMLButtonElement>(null)
  const unten = useRef<HTMLDivElement>(null)
  useStationen(!ruhig)
  // „ki ist in der software angekommen.“ laut, „in den dingen noch nicht.“ kursiv.
  // Markiert wird nur eine kurze Phrase (Orange nie für ganze Sätze): MARKIERT im letzten Satz, sonst dessen erste drei Wörter.
  const saetze = THESE.titel.split(/(?<=\.)\s+/)
  const letzte = saetze[saetze.length - 1].split(' ')
  const ziel = MARKIERT.split(' ')
  const ab = letzte.findIndex((_, i) => ziel.every((z, j) => letzte[i + j]?.replace(/[.,]$/, '') === z))
  const [von0, bis0] = ab >= 0 ? [ab, ab + ziel.length] : [0, Math.min(3, letzte.length)]
  let k = 0
  const worte = saetze.map((s, si) => s.split(' ').map((w, wi) => ({ w, i: si === saetze.length - 1 && wi >= von0 && wi < bis0 ? k++ : -1 })))
  const N = Math.max(1, k)

  const m = useRef({ oben: 0, strecke: 1, els: [] as HTMLElement[], stand: [] as number[], karte: -1, innen: -1, plat: -1 })
  useScrollEffekt({
    messen: vh => {
      const s = m.current, el = bahn.current!
      s.oben = seitenOben(el)
      s.strecke = Math.max(1, el.offsetHeight - vh)
      s.els = [...satz.current!.querySelectorAll<HTMLElement>('[data-w]')]
      s.stand = s.els.map(() => -1)
      s.karte = s.innen = s.plat = -1
      // Stationen für den Ein-Schritt-Scroll: Titel, Karte (gewachsen und markiert, kurz vor dem Lösen), Aufschlüsselung knapp unter der Kapsel
      setzeStationen([0, s.oben + s.strecke, seitenOben(unten.current!) - Math.max(84, 0.1 * vh)])
    },
    lesen: (y, vh) => {
      const s = m.current
      // Die Karte kommt klein mit dem Abschnitt von unten herein und wächst gleichmäßig mit dem Scrollen,
      // schon während der Titel hinausläuft: von 0,75 Bildschirmhöhen vor dem Andocken oben bis 0,15 danach.
      // smoothstep: ruhiger Anfang, ruhiges Ende, kein Sprung. Steht der Abschnitt oben, ist die Karte fast voll.
      const t = klemmen((y - (s.oben - 0.75 * vh)) / (0.9 * vh))
      const groesse = 0.12 + 0.88 * t * t * (3 - 2 * t)
      if (Math.abs(groesse - s.karte) > 0.0008) {
        s.karte = groesse
        // steht sie in voller Größe, fällt das transform weg und mit .voll auch die eigene Ebene
        const voll = groesse >= 0.999
        karte.current!.style.transform = voll ? 'none' : `scale(${groesse.toFixed(4)})`
        pin.current!.classList.toggle('voll', voll)
      }
      // Kopf und Satz blenden erst ein, wenn die Karte sie fast fasst (kein Text neben der Karte)
      const deck = klemmen((t - 0.7) / 0.2)
      if (Math.abs(deck - s.innen) > 0.004) {
        s.innen = deck
        innen.current!.style.opacity = deck.toFixed(3)
        weiter.current!.style.opacity = deck.toFixed(3)
        weiter.current!.style.pointerEvents = deck < 0.5 ? 'none' : ''
      }
      // Markierung wandert Wort für Wort, wie eine Textauswahl mit der Maus, sobald das Feld steht; fertig, wenn sich die Karte löst
      const von = s.oben + 0.05 * vh, bis = s.oben + s.strecke
      const mp = klemmen((y - von) / (bis - von)) * N
      // die Platine schwebt mit dem Text von unten in ihre Lücke und richtet sich dabei auf (nur transform, bleibt in der Karte)
      const pp = klemmen((t - 0.6) / 0.4)
      if (Math.abs(pp - s.plat) > 0.002) {
        s.plat = pp
        platine.current!.style.transform = `translate3d(0,${((1 - pp) * 60).toFixed(1)}px,0) rotate(${(-13 + pp * 9).toFixed(2)}deg)`
      }
      for (let i = 0; i < s.els.length; i++) {
        const w = Math.round(klemmen(mp - i) * 200) / 200
        if (w !== s.stand[i]) {
          s.stand[i] = w
          s.els[i].style.setProperty('--w', String(w))
          s.els[i].classList.toggle('voll', w >= 1)
        }
      }
    },
  }, !ruhig)

  return (
    <section id="x-these" className="x-these" aria-labelledby="x-these-satz">
      <div className="x-these-bahn" id="x-these-bahn" ref={bahn}>
        <span className="x-these-halt" aria-hidden="true" />
        <div className="x-these-pin" ref={pin}>
          <div className="x-these-karte" ref={karte} aria-hidden="true" />
          <div className="x-these-innen x-rahmen" ref={innen}>
            <Abschnittskopf nr={2} titel="these" gesamt={GESAMT} />
            <div className="x-these-aussage">
              <p className="x-these-satz" id="x-these-satz" ref={satz}>
                {worte.map((s, si) => (
                  <span key={si} className={si === 0 ? 'x-these-laut' : 'x-these-leise'}>
                    {s.map(({ w, i }, wi) => (
                      <Fragment key={wi}>
                        {i < 0 ? w : <span data-w className={`x-w${ruhig ? ' voll' : ''}`} style={{ '--w': ruhig ? 1 : 0 } as CSSProperties}>{w}</span>}{' '}
                        {i === N - 1 && <br className="x-these-bruch" />}
                      </Fragment>
                    ))}
                  </span>
                ))}
              </p>
              {/* die Platine, das echte Ding, liegt in der Lücke rechts neben dem Satz */}
              <div className="x-these-platine" ref={platine} aria-hidden="true">
                <RenderBild r={RENDERS.platine} className="x-these-platine-bild" deko />
              </div>
            </div>
          </div>
          <button type="button" className="x-these-weiter" ref={weiter} aria-label="weiter zur aufschlüsselung" onClick={() => geheZu(2, '.x-these-text')}>
            <span aria-hidden="true">↓</span>
          </button>
        </div>
      </div>
      <div className="x-these-text">
        <div className="x-rahmen x-these-unten" ref={unten}>
          <Vergleich />
          {/* die Folgerung aus früher → heute, zwei Zeilen über die volle Breite */}
          <div className="x-these-schluss">
            <p className="x-these-fazit">{THESE.schluss}</p>
            <p className="x-these-unterzeile">{THESE.unterzeile}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 03 Erik: eine Zeitungsseite ---------- */

function Erik() {
  return (
    <section id="x-erik" className="x-sek x-erik">
      <div className="x-rahmen">
        <Abschnittskopf nr={3} titel="erik" gesamt={GESAMT} />
        <article className="x-zeitung">
          <h3 className="x-zeitung-titel">{PERSON.kurz}</h3>
          <figure className="x-zeitung-foto x-rein x-objekt">
            <Profilfoto />
          </figure>
          <p className="x-zeitung-text">{PERSON.ueber}</p>
        </article>
      </div>
    </section>
  )
}

/* ---------- 04 Was ich anbiete ---------- */

function Angebot() {
  const breit = useMedia(BREIT), ruhig = useMedia(RUHIG)
  const mit3d = breit && !ruhig
  const sek = useRef<HTMLElement>(null)
  const buehne = useRef<HTMLDivElement>(null)
  const nah = useNah(sek)
  const [aktiv, setAktiv] = useState(0)
  const ersatz = <RenderBild r={RENDERS.antikoerperGruppe} className="x-angebot-bild" deko />

  // aktive Leistung: die, die gerade durch die Bildmitte läuft
  useEffect(() => {
    const els = sek.current?.querySelectorAll<HTMLElement>('[data-leistung]')
    if (!els) return
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) setAktiv(Number((e.target as HTMLElement).dataset.leistung))
    }, { rootMargin: '-45% 0px -45% 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  // die Antikörper-Bühne wandert leicht mit dem Scrollen (nur transform); kippen darf nur das Ersatzbild, beim Canvas wären sonst die Kanten im Bild
  const m = useRef({ oben: 0, hoehe: 1, w: -1 })
  useScrollEffekt({
    messen: () => { const el = sek.current!; m.current.oben = seitenOben(el); m.current.hoehe = el.offsetHeight },
    lesen: (y, vh) => {
      const s = m.current
      const p = klemmen((y + vh - s.oben) / (s.hoehe + vh))
      if (Math.abs(p - s.w) < 0.002) return
      s.w = p
      buehne.current!.style.transform = `translate3d(0,${((0.5 - p) * 80).toFixed(1)}px,0)${mit3d ? '' : ` rotate(${((p - 0.5) * -10).toFixed(2)}deg)`}`
    },
  }, !ruhig)

  return (
    <section id="x-angebot" className="x-sek x-angebot" ref={sek}>
      <div className="x-rahmen">
        <Abschnittskopf nr={4} titel="was ich anbiete" gesamt={GESAMT} />
        <div className="x-angebot-raster">
          <div className="x-angebot-spalte">
            <div className="x-angebot-buehne" ref={buehne}>
              {mit3d && nah
                ? <Suspense fallback={ersatz}><Antikoerper3D anzahl={5} material="mix" groesse={0.3} fokus={buehne} className="x-angebot-3d" /></Suspense>
                : ersatz}
            </div>
          </div>
          {/* die erste Leistung ist der Kern der These und steht groß, die übrigen als Zeilen: Titel links, Satz rechts */}
          <ul className="x-angebot-liste">
            {LEISTUNGEN.map((l, i) => (
              <li key={l.titel} data-leistung={i} className={`x-leistung${i === 0 ? ' x-leistung-haupt' : ''}${i === aktiv ? ' aktiv' : ''}`}>
                <h3>{l.titel}</h3>
                <p>{l.text}</p>
              </li>
            ))}
          </ul>
          <div className="x-angebot-cta">
            <a className="ac-knopf x-angebot-knopf" href="#x-kontakt" onClick={e => { e.preventDefault(); springe('x-kontakt') }}>schreib mir <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 06 building stuff | Kompetenzen ---------- */

// Zeitleiste als Grafik: Jahre als Achse, jede Station mit echtem Zeitraum ein Balken, ihre Projekte als kleine Bilder darauf.
// Stationen ohne Jahr („die ganze zeit / viele projekte“) stehen nicht auf der Achse, sonst würde die Grafik Jahre behaupten,
// die es nicht gibt: ihre Projekte folgen als Reihe darunter, in der Reihenfolge der Seite.
const HEUTE = (() => { const d = new Date(); return d.getFullYear() + (d.getMonth() + 0.5) / 12 })()
const VON = 2022
const BIS = Math.max(2027, Math.ceil(HEUTE))
const proz = (j: number) => ((klemmen(j, VON, BIS) - VON) / (BIS - VON)) * 100

/** „2024–2026“, „seit 2022“, „2026“, „die ganze zeit“ → Spanne in Jahren (grob, für die Grafik). */
function spanne(zeit: string) {
  const j = [...zeit.matchAll(/\d{4}/g)].map(m => Number(m[0]))
  if (!j.length) return { a: VON, b: HEUTE, offen: true }
  if (j.length === 1) return { a: j[0], b: /seit/.test(zeit) || j[0] >= Math.floor(HEUTE) ? HEUTE : j[0] + 1, offen: false }
  return { a: j[0], b: Math.min(HEUTE, j[1] + 0.5), offen: false }
}

/** Projekte, die eine Station nennt (Titel beginnt mit einem Stück aus „was“ oder „detail“). */
function projekteZu(s: { was: string; detail: string }) {
  const stuecke = `${s.was}, ${s.detail}`.split(/[,.:]\s+|\s+und\s+/).map(t => t.trim()).filter(t => t.length > 3)
  return PROJEKTE.filter(p => stuecke.some(t => p.titel.startsWith(t)))
}

const ALLE_ZL = STATIONEN.map((s, i) => ({ ...s, ...spanne(s.zeit), i, projekte: projekteZu(s) }))
const STATIONEN_ZL = ALLE_ZL.filter(s => !s.offen).sort((x, y) => x.a - y.a || y.b - x.b)
const OHNE_JAHR = ALLE_ZL.filter(s => s.offen)

const mitBild = (liste: Projekt[]) => liste
  .map(p => ({ p, render: PROJEKT_RENDERS[p.id]?.[0], foto: p.bilder?.[0] }))
  .filter(b => b.render || b.foto)

/** Kleines Projektbild als Link zum Projekt (auf dem Balken absolut gesetzt, in der Reihe im Fluss). Vorschau 72 px, Handy 56 px. */
function ZlBild({ b, style }: { b: ReturnType<typeof mitBild>[number]; style?: CSSProperties }) {
  return (
    <a className="x-zl-bild" href={`#projekt-${b.p.id}`} style={style} onClick={e => { e.preventDefault(); zeigeProjekt(b.p.id) }} aria-label={`projekt ${b.p.titel} öffnen`} title={b.p.titel}>
      {b.render ? <RenderBild r={b.render} className="x-zl-render" deko /> : <img className="x-zl-foto" sizes="120px" srcSet={b.foto ? srcsetVon(b.foto) : undefined} src={b.foto} alt="" decoding="async" fetchPriority="low" draggable={false} />}
    </a>
  )
}

function Zeitleiste() {
  const jahre = Array.from({ length: BIS - VON }, (_, i) => VON + i)
  const neueste = Math.max(...STATIONEN_ZL.map(s => s.a))
  return (
    <>
    <figure className="x-zl x-rein" aria-label="zeitleiste seit 2022">
      <div className="x-zl-linien" aria-hidden="true">
        {jahre.map(j => <span key={j} style={{ left: `${proz(j)}%` }}><b className="ac-label">{j}</b></span>)}
        <span className="x-zl-heute" style={{ left: `${proz(HEUTE)}%` }}><b className="ac-label">heute</b></span>
      </div>
      <ol className="x-zl-zeilen">
        {STATIONEN_ZL.map((s, k) => {
          const bilder = mitBild(s.projekte).slice(0, 4)
          return (
            <li key={s.i} className={`x-zl-zeile${s.offen ? ' offen' : ''}${s.a === neueste ? ' neu' : ''}${bilder.length ? '' : ' ohne-bilder'}`} style={{ '--k': k } as CSSProperties}>
              <div className="x-zl-text">
                <span className="ac-label x-zl-zeit"><Ph>{s.zeit}</Ph></span>
                <h4><Ph>{s.was}</Ph></h4>
                <p><Ph>{s.detail}</Ph></p>
              </div>
              <div className="x-zl-spur">
                <span className="x-zl-balken" style={{ left: `${proz(s.a)}%`, width: `${proz(s.b) - proz(s.a)}%` }} aria-hidden="true" />
                {bilder.map((b, n) => {
                  const mitte = proz(s.a) + (proz(s.b) - proz(s.a)) * ((n + 1) / (bilder.length + 1))
                  return <ZlBild key={b.p.id} b={b} style={{ '--x': mitte, '--n': n, '--rest': bilder.length - 1 - n } as CSSProperties} />
                })}
              </div>
            </li>
          )
        })}
      </ol>
    </figure>
    {OHNE_JAHR.map(s => (
      <div key={s.i} className="x-zl-viele">
        <div className="x-zl-text">
          <span className="ac-label x-zl-zeit"><Ph>{s.zeit}</Ph></span>
          <h4><Ph>{s.was}</Ph></h4>
          <p><Ph>{s.detail}</Ph></p>
        </div>
        <ul className="x-zl-reihe">
          {mitBild(s.projekte).slice(0, 8).map((b, n) => <li key={b.p.id} style={{ '--n': n } as CSSProperties}><ZlBild b={b} /></li>)}
        </ul>
      </div>
    ))}
    </>
  )
}

function Lebenslauf() {
  return (
    <section id="x-cv" className="x-sek x-cv">
      <div className="x-rahmen">
        <Abschnittskopf nr={6} titel="building stuff" gesamt={GESAMT} />
        <h3 className="x-cv-h">seit 2022</h3>
        <Zeitleiste />
        <h3 className="x-cv-h x-cv-h-komp">kompetenzen</h3>
        <div className="x-cv-komp">
          {KOMPETENZEN.map(g => (
            <div key={g.gruppe}>
              <h4>{g.gruppe}</h4>
              <ul>{g.punkte.map(pk => <li key={pk}><Ph>{pk}</Ph></li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- 07 Kontakt ---------- */

/**
 * Kontakt: eine Aufforderung („schreib mir.“), darunter die Adresse. Sie ist zugleich der mailto-Link (Betreff „projektanfrage“)
 * und markierbar: draggable=false erlaubt das Ziehen zum Markieren, und wer gerade markiert hat, öffnet nicht aus Versehen das Mailprogramm.
 */
function Kontakt() {
  const mail = PERSON.mail
  const echt = mail.includes('@') && !mail.includes('[')
  const nichtBeimMarkieren = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    const auswahl = getSelection()
    if (auswahl && !auswahl.isCollapsed && e.currentTarget.contains(auswahl.anchorNode)) e.preventDefault()
  }
  return (
    <section id="x-kontakt" className="x-sek x-kontakt" data-ac-palette="nacht">
      <div className="x-rahmen">
        <Abschnittskopf nr={7} titel="kontakt" gesamt={GESAMT} />
        <Abstossung as="p" className="x-kontakt-gross" text="schreib mir." auftritt="sichtbar" fit />
        <div className="x-kontakt-zeile">
          {echt
            ? <a className="x-kontakt-mail" href={`mailto:${mail}?subject=projektanfrage`} draggable={false} onClick={nichtBeimMarkieren}>{mail}</a>
            : <p className="x-kontakt-mail"><Ph>{mail}</Ph></p>}
          <a className="x-kontakt-link" href={GITHUB} target="_blank" rel="noopener noreferrer">github <span aria-hidden="true">↗</span></a>
        </div>
        <div className="x-kontakt-info">
          <p><Markierung art="gruen">offen für projekte</Markierung></p>
          <p className="x-kontakt-ort">köln. ein-personen-betrieb, also antwortet immer derselbe.</p>
        </div>
        <footer className="x-fuss">
          <Marke akzent="var(--ac-gruen)" className="x-fuss-marke" />
          <a className="x-fuss-link" href="#impressum">impressum</a>
          <a className="x-fuss-link" href="#datenschutz">datenschutz</a>
        </footer>
      </div>
    </section>
  )
}

/* ---------- Seite ---------- */

export function Experiment() {
  const wurzel = useRef<HTMLDivElement>(null)
  const takt = useMemo(() => new Takt(), [])
  const ruhig = useMedia(RUHIG)
  const index = useWoBinIch()
  const [titelWeg, setTitelWeg] = useState(false)
  const recht = useRecht()
  const projekt = useProjektWahl()

  useEffect(() => {
    const el = wurzel.current!
    takt.starten(el)
    return () => takt.stoppen()
  }, [takt])
  useRein(wurzel)

  // Kapsel erst zeigen, wenn der Titel zur Hälfte weg ist: auf dem Titel stehen nur Name und Logo
  useEffect(() => {
    const t = document.getElementById('x-titel')
    if (!t) return
    const io = new IntersectionObserver(([e]) => setTitelWeg(e.intersectionRatio < 0.5), { threshold: [0, 0.5, 1] })
    io.observe(t)
    return () => io.disconnect()
  }, [])

  return (
    <TaktCtx.Provider value={takt}>
      {/* Wurzel ohne eigene Landmarke: <main> darf nicht in einer anderen Landmarke stecken */}
      <div className={`view on${ruhig ? '' : ' x-bewegt'}`} id="v-experiment" ref={wurzel}>
        <Kapsel index={index} sichtbar={titelWeg} />
        <main className="x-haupt">
          <Titel zeichen={<Zeichen groesse="100%" akzent="var(--ac-orange)" schwebt titel="" />} />
          <These />
          <Erik />
          <Angebot />
          <Projekte nr={5} gesamt={GESAMT} />
          <Lebenslauf />
          <Kontakt />
        </main>
        <RechtsDialog {...recht} />
        <ProjektOverlay id={projekt} />
      </div>
    </TaktCtx.Provider>
  )
}
