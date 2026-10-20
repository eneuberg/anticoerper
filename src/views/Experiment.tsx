import { Fragment, Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from 'react'
import { PROJEKTE, type Projekt } from '../data/projekte'
import { KOMPETENZEN, LEISTUNGEN, PERSON, STATIONEN, THESE } from '../data/person'
import { useName } from '../components/Wortmarke'
import { Abschnittskopf, Markierung } from '../design/Bausteine'
import { PROJEKT_RENDERS, RENDERS } from '../raum/renders'
import { Abstossung } from './experiment/Abstossung'
import { Marke, Zeichen } from './experiment/Marke'
import { Clip, Foto, Ph, Profilfoto, RenderBild } from './experiment/Bilder'
import { anteil, auf, medienVon, srcsetVon, verhaeltnis } from './experiment/medien'
import { RechtsDialog, useRecht } from './experiment/Rechtliches'
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
 *   05 Fotos und Renders ragen in die Projekttitel, der laufende Auftrag liegt auf einer eigenen Fläche
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

// Projekte in Kapiteln, Reihenfolge wie in projekte.ts. Jedes Projekt mit prio 1 oder 2 bekommt ein eigenes Kapitel:
//   prio 1                          → Hauptprojekt (x-p-exo)
//   laufender Auftrag (status)      → große Bühne mit Kernkompetenzen und Ablauf (x-p-auftrag)
//   sonst                           → Projektblock, Form nach Material: Hochformat-Fotos, Screenshots oder Render (links/rechts im Wechsel)
// prio 3 sammelt „weitere“ am Ende.
const WEITERE = PROJEKTE.filter(p => p.prio === 3)

type Form = 'hoch' | 'screens' | 'rechts' | 'links'
type Kapitel = { id: string; titel: string; art: 'exo' | 'auftrag' | 'labor' | 'weitere'; p?: Projekt; form?: Form }
const KAPITEL: Kapitel[] = []
let renderSeite = 0
for (const p of PROJEKTE) {
  if (p.prio === 3) continue
  if (p.prio === 1 && !KAPITEL.some(k => k.art === 'exo')) { KAPITEL.push({ id: 'x-p-exo', titel: p.titel, art: 'exo', p }); continue }
  if (p.art === 'kunde' && p.status && !KAPITEL.some(k => k.art === 'auftrag')) { KAPITEL.push({ id: 'x-p-auftrag', titel: p.titel, art: 'auftrag', p }); continue }
  const haupt = p.bilder?.[0]
  const form: Form = haupt ? (verhaeltnis(haupt) < 1 ? 'hoch' : 'screens') : (renderSeite++ % 2 === 0 ? 'rechts' : 'links')
  KAPITEL.push({ id: `x-p-${p.id}`, titel: p.titel, art: 'labor', p, form })
}
if (WEITERE.length) KAPITEL.push({ id: 'x-p-weitere', titel: 'weitere', art: 'weitere' })
const UNTER = KAPITEL.map(({ id, titel }) => ({ id, titel }))
const kapitelNr = (id: string) => UNTER.findIndex(u => u.id === id) + 1

const springe = (id: string) => {
  const ruhig = matchMedia(RUHIG).matches
  document.getElementById(id)?.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' })
}

/* ---------- Beobachter ---------- */

/** Welcher Abschnitt (und welches Projekt-Kapitel) liegt auf der Linie bei 40 % Höhe? Nur IntersectionObserver. */
function useWoBinIch() {
  const [index, setIndex] = useState(0)
  const [unter, setUnter] = useState(-1)
  useEffect(() => {
    const ids = [...ABSCHNITTE.map(a => a.id), ...UNTER.map(u => u.id)]
    const io = new IntersectionObserver(eintraege => {
      for (const e of eintraege) {
        if (!e.isIntersecting) continue
        const id = e.target.id
        const a = ABSCHNITTE.findIndex(x => x.id === id)
        if (a >= 0) { setIndex(a); if (id !== 'x-projekte') setUnter(-1) }
        const u = UNTER.findIndex(x => x.id === id)
        if (u >= 0) setUnter(u)
      }
    }, { rootMargin: '-40% 0px -59% 0px' })
    ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  return { index, unter: index === 4 ? unter : -1 }
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
 * WebGL kompiliert beim Start Shader (auf schwachen Geräten einige 100 ms): das soll nicht mitten ins Scrollen fallen.
 */
function useNah(ref: RefObject<HTMLElement | null>, rand = '60% 0px') {
  const [nah, setNah] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || nah) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNah(true) }, { rootMargin: rand })
    io.observe(el)
    let leer = 0
    const timer = setTimeout(() => {
      if ('requestIdleCallback' in window) leer = requestIdleCallback(() => setNah(true), { timeout: 2000 })
      else setNah(true)
    }, 2600)
    return () => { io.disconnect(); clearTimeout(timer); if (leer) cancelIdleCallback(leer) }
  }, [ref, rand, nah])
  return nah
}

/* ---------- Kapsel: wo bin ich ---------- */

/**
 * Farbe des Bands hinter der Kapsel: die des Abschnitts, der gerade oben unter dem Band liegt (grünes Feld der These,
 * Navy im Kontakt, sonst Grund). Nur IntersectionObserver auf einem schmalen Streifen oben, nichts pro Bild.
 */
function useBandFarbe() {
  const [farbe, setFarbe] = useState<'grund' | 'gruen' | 'navy'>('grund')
  useEffect(() => {
    const oben = new Set<string>()
    const io = new IntersectionObserver(es => {
      for (const e of es) { if (e.isIntersecting) oben.add(e.target.id); else oben.delete(e.target.id) }
      setFarbe(oben.has('x-kontakt') ? 'navy' : oben.has('x-these') ? 'gruen' : 'grund')
    }, { rootMargin: '0px 0px -94% 0px' })
    for (const id of ['x-these', 'x-kontakt']) { const el = document.getElementById(id); if (el) io.observe(el) }
    return () => io.disconnect()
  }, [])
  return farbe
}

function Kapsel({ index, unter, sichtbar }: { index: number; unter: number; sichtbar: boolean }) {
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
  const unterTitel = unter >= 0 ? UNTER[unter].titel : null
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
          <span key={titel + unterTitel} className="x-kapsel-wechsel">
            {titel}{unterTitel && <em className="x-kapsel-unter"> · {unterTitel}</em>}
          </span>
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
                    {UNTER.map((u, k) => (
                      <li key={u.id}><button aria-current={k === unter ? 'true' : undefined} onClick={() => { setOffen(false); springe(u.id) }}>
                        <span className="ac-label">05.{k + 1}</span>{u.titel}
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
      <span className="x-titel-pfeil ac-label" aria-hidden="true">↓</span>
    </section>
  )
}

/* ---------- 02 These ---------- */

/** Die einzige markierte Stelle der These. */
const MARKIERT = 'in den dingen'

function These() {
  const ruhig = useMedia(RUHIG)
  const bahn = useRef<HTMLDivElement>(null)
  const kreis = useRef<HTMLDivElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const innen = useRef<HTMLDivElement>(null)
  const satz = useRef<HTMLParagraphElement>(null)
  const text = useRef<HTMLDivElement>(null)
  const platine = useRef<HTMLDivElement>(null)
  const stufen = THESE.absaetze.length > 2 ? THESE.absaetze.slice(0, -1) : THESE.absaetze
  const schluss = THESE.absaetze.length > 2 ? THESE.absaetze[THESE.absaetze.length - 1] : undefined

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

  const m = useRef({ oben: 0, strecke: 1, els: [] as HTMLElement[], stand: [] as number[], kreis: -1, innen: -1, unten: 0, platH: 1, plat: -1 })
  useScrollEffekt({
    messen: vh => {
      const s = m.current, el = bahn.current!
      s.oben = seitenOben(el)
      s.strecke = Math.max(1, el.offsetHeight - vh)
      s.els = [...satz.current!.querySelectorAll<HTMLElement>('[data-w]')]
      s.stand = s.els.map(() => -1)
      s.kreis = s.innen = s.plat = -1
      // die Platine wird über ihren (nicht bewegten) Abschnitt gemessen, nicht über sich selbst: ihr transform würde mitzählen
      s.unten = seitenOben(text.current!)
      s.platH = platine.current!.offsetHeight
    },
    lesen: (y, vh) => {
      const s = m.current
      // Der Körper kommt als kleiner Punkt mit dem Abschnitt von unten herein und wächst gleichmäßig mit dem Scrollen,
      // schon während der Titel hinausläuft: von 0,75 Bildschirmhöhen vor dem Andocken oben bis 0,15 danach.
      // smoothstep: ruhiger Anfang, ruhiges Ende, kein Sprung. Steht der Abschnitt oben, ist das Feld fast voll.
      const t = klemmen((y - (s.oben - 0.75 * vh)) / (0.9 * vh))
      const groesse = 0.035 + 0.965 * t * t * (3 - 2 * t)
      if (Math.abs(groesse - s.kreis) > 0.0008) {
        s.kreis = groesse
        kreis.current!.style.transform = `translate(-50%,-50%) scale(${groesse.toFixed(4)})`
        // füllt er das Bild, übernimmt die gleichfarbige flache Fläche (deckungsgleich, also unsichtbar): keine riesige Ebene mehr zum Zusammensetzen
        pin.current!.classList.toggle('gefuellt', groesse >= 0.999)
      }
      // Kopf und Satz blenden schon im wachsenden Körper ein (kein leerer Bildschirm nur mit Kreis)
      const deck = klemmen((t - 0.42) / 0.38)
      if (Math.abs(deck - s.innen) > 0.004) { s.innen = deck; innen.current!.style.opacity = deck.toFixed(3) }
      // Markierung wandert Wort für Wort, wie eine Textauswahl mit der Maus, sobald das Feld steht
      const von = s.oben + 0.05 * vh, bis = s.oben + Math.max(0.35 * vh, s.strecke - 0.12 * vh)
      const mp = klemmen((y - von) / (bis - von)) * N
      // die Platine schwebt über die Unterkante der Bühne herein: hebt sich und richtet sich dabei auf (höchstens 40 px unter ihrem Platz, damit sie nie auf Text rutscht)
      const pp = klemmen((y + vh - (s.unten - s.platH)) / (vh + s.platH))
      if (Math.abs(pp - s.plat) > 0.002) {
        s.plat = pp
        platine.current!.style.transform = `translate3d(0,${((0.25 - pp) * 160).toFixed(1)}px,0) rotate(${(-13 + pp * 9).toFixed(2)}deg)`
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
      <div className="x-these-bahn" ref={bahn}>
        <div className="x-these-pin" ref={pin}>
          <div className="x-these-kreis" ref={kreis} aria-hidden="true" />
          <div className="x-these-innen x-rahmen" ref={innen}>
            <Abschnittskopf nr={2} titel="these" gesamt={GESAMT} />
            <p className="x-these-satz" id="x-these-satz" ref={satz}>
              {worte.map((s, si) => (
                <span key={si} className={si === 0 ? 'x-these-laut' : 'x-these-leise'}>
                  {s.map(({ w, i }, wi) => (
                    <Fragment key={wi}>
                      {i < 0 ? w : <span data-w className={`x-w${ruhig ? ' voll' : ''}`} style={{ '--w': ruhig ? 1 : 0 } as CSSProperties}>{w}</span>}{' '}
                    </Fragment>
                  ))}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
      <div className="x-these-text" ref={text}>
        <div className="x-rahmen x-these-unten">
          {/* die Platine: echtes Ding zwischen These und Absätzen, ragt nach oben in die Bühne */}
          <div className="x-these-platine" ref={platine} aria-hidden="true">
            <RenderBild r={RENDERS.platine} className="x-these-platine-bild" deko />
          </div>
          {/* früher → heute als zwei versetzte Stufen, das erste Wort groß. Der Schlussabsatz steht als ruhiger Satz darunter,
              ohne Gipfel und ohne Orange (keine Vorher-nachher-wir-Folie). */}
          <div className="x-these-folge">
            {stufen.map((a, i) => {
              const [wort, ...rest] = a.split(' ')
              return (
                <p key={i} className="x-stufe">
                  <span className="x-stufe-wort">{wort}</span>{' '}
                  <span className="x-stufe-rest"><Ph>{rest.join(' ')}</Ph></span>
                </p>
              )
            })}
          </div>
          {schluss && <p className="x-these-schluss"><Ph>{schluss}</Ph></p>}
          <p className="x-these-name">{THESE.name}</p>
        </div>
      </div>
    </section>
  )
}

/* ---------- 03 Erik: eine Zeitungsseite ---------- */

function Erik() {
  // Schlagzeile und Unterzeile aus PERSON.kurz: „Tagsüber …“ / „Abends …“
  const [schlag, unterzeile] = PERSON.kurz.split(/(?<=\.)\s+/)
  return (
    <section id="x-erik" className="x-sek x-erik">
      <div className="x-rahmen">
        <Abschnittskopf nr={3} titel="erik" gesamt={GESAMT} />
        <article className="x-zeitung">
          <h3 className="x-zeitung-titel">{schlag}</h3>
          <figure className="x-zeitung-foto x-rein x-objekt">
            <Profilfoto />
          </figure>
          {unterzeile && <p className="x-zeitung-unter ac-serif">{unterzeile}</p>}
          {/* eine Spalte in Fließtextgröße: das ist der eigentliche „wer bin ich“-Text, kein Kleingedrucktes */}
          <div className="x-zeitung-spalten">
            {PERSON.ueber.map((a, i) => <p key={i}><Ph>{a}</Ph></p>)}
          </div>
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

  // die Antikörper-Bühne kippt und wandert leicht mit dem Scrollen (nur transform)
  const m = useRef({ oben: 0, hoehe: 1, w: -1 })
  useScrollEffekt({
    messen: () => { const el = sek.current!; m.current.oben = seitenOben(el); m.current.hoehe = el.offsetHeight },
    lesen: (y, vh) => {
      const s = m.current
      const p = klemmen((y + vh - s.oben) / (s.hoehe + vh))
      if (Math.abs(p - s.w) < 0.002) return
      s.w = p
      buehne.current!.style.transform = `translate3d(0,${((0.5 - p) * 80).toFixed(1)}px,0) rotate(${((p - 0.5) * -10).toFixed(2)}deg)`
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
                ? <Suspense fallback={ersatz}><Antikoerper3D anzahl={5} material="mix" groesse={0.3} className="x-angebot-3d" /></Suspense>
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

/* ---------- 05 Projekte ---------- */

function KapitelKopf({ nr, art, zeit }: { nr: number; art: string; zeit?: string }) {
  return (
    <div className="x-p-kopf">
      <b className="ac-label">05.{nr}</b><span>{art}</span>{zeit && <span><Ph>{zeit}</Ph></span>}
    </div>
  )
}

/** Zeitangabe ohne Wörter, die schon im Label stehen („auftrag · laufend“ + „2026, laufend“ → „2026“; „nebenbei“ nur einmal). */
function zeitOhneDoppel(p: Projekt) {
  const z = p.zeitraum.trim()
  if (!z || z === p.label) return undefined
  return z.split(/,\s*/).filter(teil => !p.label.includes(teil)).join(', ') || undefined
}
const istNotiz = (titel: string) => titel.toLowerCase() === 'notiz'

/** Tags als Chips (höchstens vier) und echte Links (github, Paper). Links mit [Platzhalter] fallen weg. */
function Fuss({ p }: { p: Projekt }) {
  const links = (p.links ?? []).filter(l => l.url.startsWith('http'))
  return (
    <div className="x-p-fuss">
      {p.tags.length > 0 && <ul className="ac-chips">{p.tags.slice(0, 4).map(t => <li key={t} className="ac-chip">{t}</li>)}</ul>}
      {links.length > 0 && (
        <ul className="x-p-links">
          {links.map(l => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.label} <span aria-hidden="true">↗</span></a></li>)}
        </ul>
      )}
    </div>
  )
}

function Exo({ p }: { p: Projekt }) {
  // „Hand-Exoskelett“ → Hand / exo / skelett (der Schriftmix aus dem Zine)
  const teile = p.titel.split(/(exo)/i)
  // Mit Fotos: das Hauptfoto ragt von unten in den Titel, der Clip läuft links neben den Abschnitten, darunter ein Streifen
  const { haupt, galerie, zuAbschnitt } = medienVon(p, 4)
  return (
    <article id="x-p-exo" className={`x-p x-exo x-rahmen${haupt ? ' x-exo-mitfoto' : ''}`}>
      <KapitelKopf nr={kapitelNr('x-p-exo')} art={p.label} zeit={zeitOhneDoppel(p)} />
      <div className="x-exo-buehne">
        <h3 className="x-exo-titel">
          {teile.length === 3
            ? <><span>{teile[0].replace(/-$/, '')}</span><span className="x-exo-kursiv">{teile[1].toLowerCase()}</span><span>{teile[2]}</span></>
            : <span>{p.titel}</span>}
        </h3>
        {!haupt && <RenderBild r={PROJEKT_RENDERS[p.id]?.[0]} className="x-exo-bild x-rein x-objekt" />}
      </div>
      <div className="x-exo-raster">
        <div className="x-exo-vorn">
          <p className="x-exo-satz">{p.satz}</p>
          {p.rolle && <p className="x-exo-rolle">{p.rolle}</p>}
          <ul className="ac-chips">{p.tags.slice(0, 4).map(t => <li key={t} className="ac-chip">{t}</li>)}</ul>
          {p.clip && <Clip clip={p.clip} className="x-exo-clip" />}
        </div>
        <div className="x-exo-hinten">
          {haupt && <Foto src={haupt} ueber className="x-exo-foto x-rein x-objekt" sizes={GROESSE.exo} />}
          <ol className="x-exo-schritte">
            {p.abschnitte.map((a, i) => (
              <li key={a.titel}>
                <h4>{i === p.abschnitte.length - 1 ? <Markierung art="gruen">{a.titel}</Markierung> : a.titel}</h4>
                <p><Ph>{a.text}</Ph></p>
                {zuAbschnitt(a.titel).map(s => <Foto key={s} src={s} className="x-exo-schritt-foto" sizes={GROESSE.schritt} />)}
              </li>
            ))}
          </ol>
        </div>
      </div>
      {galerie.length > 0 && <div className="x-streifen">{galerie.map((s, i) => <Foto key={s} src={s} style={{ '--i': i } as CSSProperties} sizes={streifenGroesse(s, galerie)} />)}</div>}
    </article>
  )
}

/**
 * Laufender Auftrag auf einer hellen Fläche: Titel mit Tablet-Render, darunter „meine rolle“ mit den vier Schwerpunkten
 * groß in einer Zeile (ohne Nummern) und dem Rollentext, dann der Ablauf des Werkzeugs als kleine Pipeline. Die Pipeline
 * ersetzt die Abschnitte „das werkzeug“ und „wo ki reinkommt“ (sie sagt dasselbe, doppelt stand es nur im Weg).
 * Screenshots vom Konzern gibt es nicht, darum zeigt die Pipeline, was das Werkzeug tut.
 */
const ABLAUF = [
  { wer: 'teams', was: 'reichen entwürfe für werbung und kommunikation ein' },
  { wer: 'ki prüft vor', was: 'zum beispiel schriften im entwurf erkennen und vermessen' },
  { wer: 'design-team', was: 'prüft, ob der entwurf zur marke passt' },
]

function Auftrag({ p }: { p: Projekt }) {
  const r = PROJEKT_RENDERS[p.id]?.[0]
  const rolle = p.abschnitte.find(a => a.titel === 'meine rolle')
  return (
    <article id="x-p-auftrag" className="x-p x-auftrag">
      <div className="x-auftrag-feld">
        <div className="x-rahmen">
          <KapitelKopf nr={kapitelNr('x-p-auftrag')} art={p.label} zeit={zeitOhneDoppel(p)} />
          <div className="x-auftrag-buehne">
            <h3 className="x-auftrag-titel">{p.titel}</h3>
            {p.bilder?.[0]
              ? <Foto src={p.bilder[0]} ueber className="x-auftrag-bild x-rein x-objekt" sizes={GROESSE.auftrag} />
              : r && <RenderBild r={r} className="x-auftrag-bild x-rein x-objekt" />}
            <p className="x-auftrag-satz">{p.satz}</p>
          </div>
          <div className="x-kern">
            <h4 className="x-kern-h">{rolle?.titel ?? 'mein teil'}</h4>
            <ul className="x-kern-liste">
              {p.tags.slice(0, 4).map(t => <li key={t}>{t}</li>)}
            </ul>
            {rolle && <p className="x-kern-text"><Ph>{rolle.text}</Ph></p>}
          </div>
          <div className="x-ablauf-block">
            <h4 className="x-kern-h">so läuft eine prüfung</h4>
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
          {(p.links ?? []).some(l => l.url.startsWith('http')) && <Fuss p={{ ...p, tags: [] }} />}
        </div>
      </div>
    </article>
  )
}

/** Abschnitte eines Projektblocks: Titel als kleine Überschrift, Text darunter, durch Linien getrennt. */
function Teile({ p, className = '' }: { p: Projekt; className?: string }) {
  return (
    <dl className={`x-teile ${className}`}>
      {p.abschnitte.map(a => <div key={a.titel}><dt>{a.titel}</dt><dd><Ph>{a.text}</Ph></dd></div>)}
    </dl>
  )
}

/**
 * Projektblock mit eigenem Kapitel. Eine Linie für alle: Kopfzeile, riesiger Titel, das Bild ragt in seine untere Kante,
 * Satz in Serif, Abschnitte mit Linien, Tags. Abwechslung über das Material:
 *   hoch     Hochformat-Fotos (ion like fish): Hauptfoto schräg rechts, kleine Fotos versetzt darunter
 *   screens  Screenshots (virtubooth): Hauptbild groß rechts, die übrigen als breite Reihe über die ganze Seite
 *   rechts / links  nur ein Render (immobot, inventar per foto): großes Objekt, im Wechsel rechts und links
 */
function Labor({ p, form }: { p: Projekt; form: Form }) {
  const { haupt, galerie } = medienVon(p, 3)
  const r = PROJEKT_RENDERS[p.id]?.[0]
  const dreh = `${(p.dreh / 2).toFixed(1)}deg`
  const id = `x-p-${p.id}`
  return (
    <article id={id} className={`x-p x-labor x-rahmen x-labor-${form}`}>
      <KapitelKopf nr={kapitelNr(id)} art={p.label} zeit={zeitOhneDoppel(p)} />
      <h3 className="x-labor-titel">{p.titel}</h3>
      <div className="x-labor-medien">
        {haupt
          ? <Foto src={haupt} ueber={form !== 'screens'} className="x-labor-haupt x-rein x-objekt" zuschnitt={form === 'hoch' ? 4 / 5 : undefined} style={{ '--dreh': dreh } as CSSProperties} sizes={form === 'screens' || form === 'hoch' ? GROESSE[form] : GROESSE.seite} />
          : r && <RenderBild r={r} className="x-labor-render x-rein x-objekt" />}
        {form === 'hoch' && galerie.length > 0 && (
          <div className="x-labor-klein">
            {galerie.map((s, i) => <Foto key={s} src={s} style={{ '--i': i } as CSSProperties} sizes={laborKleinGroesse(s, galerie)} />)}
          </div>
        )}
      </div>
      <div className="x-labor-text">
        <p className="x-labor-satz">{p.satz}</p>
        {p.rolle && <p className="x-labor-rolle"><Ph>{p.rolle}</Ph></p>}
        {form !== 'screens' && <Teile p={p} />}
        {form !== 'screens' && <Fuss p={p} />}
      </div>
      {form === 'screens' && (
        <>
          {galerie.length > 0 && (
            <div className="x-screens">
              {galerie.map((s, i) => <Foto key={s} src={s} style={{ '--i': i } as CSSProperties} sizes={GROESSE.screensKlein} />)}
            </div>
          )}
          <div className="x-screens-text">
            <Teile p={p} className="x-teile-raster" />
            <Fuss p={p} />
          </div>
        </>
      )}
    </article>
  )
}

/*
 * `sizes` der Projektfotos, nachgemessen an der Anzeigebreite bei 320–2560 px (experiment.css: Umbruch bei 560 und 899).
 * Jeweils eine Spur größer als die Anzeige, damit der Browser nie zu klein wählt.
 */
const GROESSE = {
  /** Hauptprojekt: großes Foto hinter dem Text */
  exo: '(max-width: 899px) calc(100vw - 32px), (max-width: 1440px) 52vw, 740px',
  /** Foto eines Abschnitts (höchstens 380 px breit) */
  schritt: '(max-width: 412px) calc(100vw - 32px), 380px',
  /** Labor, Screenshots: Hauptbild 7 von 12 Spalten */
  screens: '(max-width: 899px) calc(100vw - 32px), (max-width: 1440px) 54vw, 770px',
  /** Labor, Hochformat: Hauptbild 5 von 12 Spalten, auf dem Handy höchstens 78 % bzw. 420 px */
  hoch: '(max-width: 580px) 73vw, (max-width: 899px) 420px, (max-width: 1440px) 38vw, 540px',
  /** Labor, Foto rechts oder links: 6 von 12 Spalten */
  seite: '(max-width: 899px) calc(100vw - 32px), (max-width: 1440px) 50vw, 720px',
  /** Labor, Screenshots darunter zu dritt (zu zweit bis 899) */
  screensKlein: '(max-width: 560px) calc(100vw - 32px), (max-width: 899px) 46vw, (max-width: 1440px) 30vw, 430px',
  /** laufender Auftrag: min(44vw, 640px), Handy min(74vw, 440px) */
  auftrag: '(max-width: 594px) 74vw, (max-width: 899px) 440px, (max-width: 1454px) 44vw, 640px',
  /** weitere Projekte: Bild höchstens 300 px (mit großer Zahl 440 px) */
  meldung: '(max-width: 472px) calc(100vw - 32px), 440px',
  /** Zeitleiste: Vorschau 72 px (Handy 56 px), Ausschnitt per object-fit */
  zeitleiste: '120px',
}
/** Streifen nach Seitenverhältnis (Hauptprojekt-Galerie, kleine Hochformate im Labor). Unter 560 px Umbruch, darum volle Breite. */
const streifenGroesse = (s: string, reihe: string[]) => {
  const a = anteil(s, reihe)
  return `(max-width: 560px) calc(100vw - 32px), (max-width: 1440px) ${auf(a * 88, 'vw')}, ${auf(a * 1250, 'px')}`
}
const laborKleinGroesse = (s: string, reihe: string[]) => {
  const a = anteil(s, reihe)
  return `(max-width: 899px) ${auf(a * 90, 'vw')}, (max-width: 1440px) ${auf(a * 35, 'vw')}, ${auf(a * 490, 'px')}`
}

/** Ohne Foto und Render: die Tags als ruhiges Wortbild (wird automatisch durch ein Render ersetzt, sobald es eins gibt). */
function Wortbild({ p }: { p: Projekt }) {
  return (
    <div className="x-wortbild" aria-hidden="true">
      {p.tags.slice(0, 4).map(t => <span key={t}>{t}</span>)}
    </div>
  )
}

/** Eine große Zahl im Titel („48“) steht als Stempel am Bild. */
const grosseZahl = (p: Projekt) => p.titel.match(/\b(\d{2,})\b/)?.[1]

function Weitere({ liste }: { liste: Projekt[] }) {
  return (
    <article id="x-p-weitere" className="x-p x-weitere x-rahmen">
      <KapitelKopf nr={kapitelNr('x-p-weitere')} art="weitere" />
      <ul className="x-weitere-liste">
        {liste.map(p => {
          const zahl = grosseZahl(p)
          const r = PROJEKT_RENDERS[p.id]?.[0]
          const foto = p.bilder?.[0]
          const mitTiteln = p.abschnitte.length > 1
          return (
            <li key={p.id} className={`x-meldung${zahl ? ' x-meldung-zahl' : ''}${!foto && !r ? ' x-meldung-ohne' : ''}`}>
              <div className="x-meldung-bild">
                {zahl && <span className="x-zahl" aria-hidden="true">{zahl}</span>}
                {foto ? <Foto src={foto} sizes={GROESSE.meldung} /> : r ? <RenderBild r={r} className="x-rein x-objekt" /> : <Wortbild p={p} />}
              </div>
              <div className="x-meldung-text">
                <p className="x-meldung-meta"><span>{p.label}</span>{zeitOhneDoppel(p) && <span>{zeitOhneDoppel(p)}</span>}{p.rolle && <span>{p.rolle}</span>}</p>
                <h4>{p.titel}</h4>
                <p className="x-meldung-satz">{p.satz}</p>
                {p.abschnitte.map(a => (
                  <Fragment key={a.titel}>
                    {mitTiteln && !istNotiz(a.titel) && <h5>{a.titel}</h5>}
                    <p><Ph>{a.text}</Ph></p>
                  </Fragment>
                ))}
                {(p.links ?? []).some(l => l.url.startsWith('http')) && <Fuss p={{ ...p, tags: [] }} />}
              </div>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

function Projekte() {
  return (
    <section id="x-projekte" className="x-sek x-projekte">
      <div className="x-rahmen">
        <Abschnittskopf nr={5} titel="projekte" gesamt={GESAMT} />
        <nav className="x-p-index" aria-label="Projekte">
          <ol>
            {UNTER.map((u, i) => (
              <li key={u.id}><a href={`#${u.id}`} onClick={e => { e.preventDefault(); springe(u.id) }}><span className="ac-label">05.{i + 1}</span>{u.titel}</a></li>
            ))}
          </ol>
        </nav>
      </div>
      {KAPITEL.map(k => {
        switch (k.art) {
          case 'exo': return <Exo key={k.id} p={k.p!} />
          case 'auftrag': return <Auftrag key={k.id} p={k.p!} />
          case 'labor': return <Labor key={k.id} p={k.p!} form={k.form!} />
          case 'weitere': return <Weitere key={k.id} liste={WEITERE} />
        }
      })}
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

const kapitelVon = (p: Projekt) => (p.prio === 3 ? 'x-p-weitere' : KAPITEL.find(k => k.p === p)?.id ?? 'x-projekte')

const ALLE_ZL = STATIONEN.map((s, i) => ({ ...s, ...spanne(s.zeit), i, projekte: projekteZu(s) }))
const STATIONEN_ZL = ALLE_ZL.filter(s => !s.offen).sort((x, y) => x.a - y.a || y.b - x.b)
const OHNE_JAHR = ALLE_ZL.filter(s => s.offen)

const mitBild = (liste: Projekt[]) => liste
  .map(p => ({ p, render: PROJEKT_RENDERS[p.id]?.[0], foto: p.bilder?.[0] }))
  .filter(b => b.render || b.foto)

/** Kleines Projektbild als Link zum Kapitel (auf dem Balken absolut gesetzt, in der Reihe im Fluss). */
function ZlBild({ b, style }: { b: ReturnType<typeof mitBild>[number]; style?: CSSProperties }) {
  const ziel = kapitelVon(b.p)
  return (
    <a className="x-zl-bild" href={`#${ziel}`} style={style} onClick={e => { e.preventDefault(); springe(ziel) }} aria-label={`zum projekt ${b.p.titel}`} title={b.p.titel}>
      {b.render ? <RenderBild r={b.render} className="x-zl-render" deko /> : <img className="x-zl-foto" sizes={GROESSE.zeitleiste} srcSet={b.foto ? srcsetVon(b.foto) : undefined} src={b.foto} alt="" decoding="async" fetchPriority="low" draggable={false} />}
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
  const { index, unter } = useWoBinIch()
  const [titelWeg, setTitelWeg] = useState(false)
  const recht = useRecht()

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
        <Kapsel index={index} unter={unter} sichtbar={titelWeg} />
        <main className="x-haupt">
          <Titel zeichen={<Zeichen groesse="100%" akzent="var(--ac-orange)" schwebt titel="" />} />
          <These />
          <Erik />
          <Angebot />
          <Projekte />
          <Lebenslauf />
          <Kontakt />
        </main>
        <RechtsDialog {...recht} />
      </div>
    </TaktCtx.Provider>
  )
}
