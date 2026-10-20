import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { DATENSCHUTZ, IMPRESSUM } from '../../data/rechtliches'
import './rechtliches.css'

// Impressum und Datenschutz in einem modalen <dialog> (Esc, Klick daneben, Schließen-Knopf).
// Inhalt aus src/data/rechtliches.ts, in normaler Schreibung: .rt-recht hebt das klein-Schreiben der Seite auf.
// Direkt verlinkbar: anticoerper.com/#impressum und /#datenschutz öffnen den Dialog.

export type RechtArt = 'impressum' | 'datenschutz'
type Teil = { titel: string; zeilen?: readonly string[]; text?: string }
const TEXTE: Record<RechtArt, { titel: string; abschnitte: readonly Teil[] }> = { impressum: IMPRESSUM, datenschutz: DATENSCHUTZ }

const MAIL = /([\w.+-]+@[\w-]+\.[\w.]+)/

/** [Klammern] markiert (.ph), Mail-Adressen als mailto-Link. */
function Zeile({ children }: { children: string }): ReactNode {
  return children.split(/(\[[^\]]+\]|[\w.+-]+@[\w-]+\.[\w.]*\w)/).map((t, i) => {
    if (t.startsWith('[')) return <span key={i} className="ph">{t}</span>
    if (MAIL.test(t)) return <a key={i} href={`mailto:${t}`}>{t}</a>
    return t
  })
}

/** Nur der Text, ohne Titel. `ebene`: Überschrift der Abschnitte (h3 unter einem h2). */
export function RechtsText({ art, ebene = 'h3' }: { art: RechtArt; ebene?: 'h3' | 'h4' }) {
  const H = ebene
  return (
    <div className="rt-recht rt-text" lang="de">
      {TEXTE[art].abschnitte.map(a => (
        <section key={a.titel}>
          <H>{a.titel}</H>
          {a.zeilen
            ? <p>{a.zeilen.map((z, i) => <Fragment key={i}>{i > 0 && <br />}<Zeile>{z}</Zeile></Fragment>)}</p>
            : a.text && <p><Zeile>{a.text}</Zeile></p>}
        </section>
      ))}
    </div>
  )
}

const ausHash = (): RechtArt | null => {
  const h = location.hash.slice(1)
  return h === 'impressum' || h === 'datenschutz' ? h : null
}

/** Zustand für den Dialog: welcher Text offen ist (oder keiner), gespiegelt im Hash. */
export function useRecht() {
  const [art, setArt] = useState<RechtArt | null>(ausHash)
  useEffect(() => {
    const onHash = () => setArt(ausHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])
  const setze = (a: RechtArt | null) => {
    history.replaceState(null, '', a ? `#${a}` : location.pathname + location.search)
    setArt(a)
  }
  return { art, oeffne: setze, schliessen: () => setze(null) }
}

/** Modaler Dialog mit Umschalter Impressum | Datenschutz. Gehört an die Wurzel der Seite, nicht in eine Sektion mit eigener Palette. */
export function RechtsDialog({ art, oeffne, schliessen }: { art: RechtArt | null; oeffne: (a: RechtArt) => void; schliessen: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const zuletzt = useRef<RechtArt>('impressum')
  if (art) zuletzt.current = art
  const zeigt = art ?? zuletzt.current

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (art && !d.open) d.showModal()
    else if (!art && d.open) d.close()
  }, [art])

  // beim Wechsel des Textes wieder oben anfangen
  useEffect(() => { ref.current?.scrollTo(0, 0) }, [art])

  return (
    <dialog ref={ref} className="rt-dialog rt-recht" aria-labelledby="rt-titel" onClose={schliessen}
      onClick={e => { if (e.target === ref.current) schliessen() }}>
      <div className="rt-innen">
        <div className="rt-leiste">
          <div className="rt-wahl" role="group" aria-label="Rechtliches">
            {(['impressum', 'datenschutz'] as const).map(a => (
              <button key={a} type="button" aria-pressed={a === zeigt} onClick={() => oeffne(a)}>{TEXTE[a].titel}</button>
            ))}
          </div>
          <button type="button" className="rt-zu" onClick={schliessen} aria-label="Schließen">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <h2 id="rt-titel" className="rt-titel">{TEXTE[zeigt].titel}</h2>
        <RechtsText art={zeigt} />
      </div>
    </dialog>
  )
}
