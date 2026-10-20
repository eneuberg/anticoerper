import type { ReactNode } from 'react'
import './tokens.css'
import './bausteine.css'

/**
 * React-Hüllen für die gemeinsamen Bausteine (Styles: bausteine.css, Werte: tokens.css).
 */

/** Kleine Versalien in Martian Mono: Metadaten, Nummern, Zähler. */
export function Label({ children, className = '', as: Tag = 'span' }: { children: ReactNode; className?: string; as?: 'span' | 'p' | 'div' }) {
  return <Tag className={`ac-label ${className}`}>{children}</Tag>
}

/**
 * Markierung wie ausgewählter Text.
 * 'signal' = Orange (Standard), 'gross' = Orange mit weißer Schrift (nur ab 24px / 19px fett),
 * 'zart' = Apricot für Fließtext, 'gruen' = Grün.
 */
export function Markierung({ children, art = 'signal' }: { children: ReactNode; art?: 'signal' | 'gross' | 'zart' | 'gruen' }) {
  const cls = { signal: 'ac-mark', gross: 'ac-mark ac-mark-gross', zart: 'ac-mark-zart', gruen: 'ac-mark-gruen' }[art]
  return <mark className={cls}>{children}</mark>
}

/**
 * Abschnittskopf: oben Linie mit Nummer und Gesamtzahl („03 / 08“), darunter der große Titel.
 * Der Name steht nur einmal (als Titel), nicht noch einmal klein in der Meta-Zeile.
 * `id` landet auf dem Element, damit Navigation und useAktuellerAbschnitt es finden.
 */
export function Abschnittskopf({ nr, titel, gesamt, zeile, id, as: Tag = 'h2' }: {
  nr: number
  titel: string
  gesamt?: number
  /** ein Satz unter dem Titel, Serif kursiv */
  zeile?: ReactNode
  id?: string
  as?: 'h2' | 'h3'
}) {
  const n = (x: number) => String(x).padStart(2, '0')
  return (
    <header className="ac-kopf" id={id}>
      <div className="ac-kopf-meta ac-label">
        <span className="ac-kopf-nr" aria-label={gesamt !== undefined ? `Abschnitt ${nr} von ${gesamt}` : `Abschnitt ${nr}`}>
          <b>{n(nr)}</b>{gesamt !== undefined && <> / {n(gesamt)}</>}
        </span>
      </div>
      <Tag className="ac-kopf-titel">{titel}</Tag>
      {zeile && <p className="ac-kopf-zeile">{zeile}</p>}
    </header>
  )
}
