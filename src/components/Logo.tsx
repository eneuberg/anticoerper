import type { CSSProperties, ReactNode } from 'react'
import { useName } from './Wortmarke'

/**
 * Zeichen von anticoerper. Einfache Vektorlinien mit runden Enden, Farbe = currentColor, skaliert mit `groesse`.
 * Empfohlen: 'andocken'. Regeln (Schutzraum, Mindestgröße): DESIGN.md → Logo.
 * Styles für Lockup und Schweben: src/design/bausteine.css.
 */
export type LogoVariante = 'andocken' | 'ypsilon' | 'abstossung' | 'feld' | 'kontur' | 'schwebe'

export const LOGO_VARIANTEN: { id: LogoVariante; name: string; idee: string }[] = [
  { id: 'andocken', name: 'Andocken', idee: 'Ein Antikörper-Y, dessen Arme wie Feldlinien auseinanderlaufen. Dazwischen schwebt ein Körper: erkannt, aber nicht berührt.' },
  { id: 'ypsilon', name: 'Ypsilon', idee: 'Der Antikörper, wie ihn Biologiebücher zeichnen: schwere und leichte Kette. Am klarsten lesbar, am wenigsten eigen.' },
  { id: 'abstossung', name: 'Abstoßung', idee: 'Zwei gleich geladene Körper, ihre Feldlinien weichen einander aus. Anti + Körper wörtlich.' },
  { id: 'feld', name: 'Feld', idee: 'Ein Punkt über gebogenen Feldlinien. Anti-Schwerkraft: etwas hält ihn oben.' },
  { id: 'kontur', name: 'Kontur', idee: 'Das Y nur als Umriss aus drei Linien, oben offen. Wirkt wie ein Kanal, in den etwas hineinpasst.' },
  { id: 'schwebe', name: 'Schwebe', idee: 'Ein kleines Y, das über dem Boden schwebt, darunter sein Schatten. Am verspieltesten.' },
]

/** Pfade im 64er-Raster. `punkt` wird mit `akzent` eingefärbt, falls gesetzt. */
function Formen({ v, akzent }: { v: LogoVariante; akzent?: string }): ReactNode {
  const p = akzent ? { fill: akzent, stroke: 'none' } : { fill: 'currentColor', stroke: 'none' }
  switch (v) {
    case 'andocken':
      return <>
        <path d="M32 60V39" />
        <path d="M32 39C30.5 30 21 24.5 12.5 12" />
        <path d="M32 39C33.5 30 43 24.5 51.5 12" />
        <circle className="ac-logo-punkt" cx="32" cy="16.5" r="5.5" {...p} />
      </>
    case 'ypsilon':
      return <>
        <path d="M28.5 60V37.5L13 18.5" />
        <path d="M35.5 60V37.5L51 18.5" />
        <path d="M18.5 35L8 22.5" />
        <path d="M45.5 35L56 22.5" />
      </>
    case 'abstossung':
      return <>
        <circle cx="15" cy="32" r="5" {...p} />
        <circle cx="49" cy="32" r="5" {...p} />
        <path d="M21 27C27 21 28.5 13 26 4" />
        <path d="M21 37C27 43 28.5 51 26 60" />
        <path d="M43 27C37 21 35.5 13 38 4" />
        <path d="M43 37C37 43 35.5 51 38 60" />
      </>
    case 'feld':
      return <>
        <circle className="ac-logo-punkt" cx="32" cy="17" r="6" {...p} />
        <path d="M7 49C17 36.5 47 36.5 57 49" />
        <path d="M15 58C22 49.5 42 49.5 49 58" />
      </>
    case 'kontur':
      return <>
        <path d="M26 60V41C26 33 19 26.5 9 16" />
        <path d="M38 60V41C38 33 45 26.5 55 16" />
        <path d="M19 7C22.5 20.5 41.5 20.5 45 7" />
      </>
    case 'schwebe':
      return <>
        <g className="ac-logo-punkt">
          <path d="M32 42V30" />
          <path d="M32 30L21 17" />
          <path d="M32 30L43 17" />
        </g>
        <path d="M24 52H40" opacity=".45" />
        <path d="M12 59H52" />
      </>
  }
}

export function Logo({ variante = 'andocken', groesse = '1em', strich, akzent, schwebt, titel = 'anticoerper', className = '', style }: {
  variante?: LogoVariante
  /** Kantenlänge (CSS-Länge oder px). Standard 1em, wächst also mit der Schriftgröße. */
  groesse?: number | string
  /** Strichstärke im 64er-Raster. Standard 4.5; unter 28px automatisch 6, damit es nicht zerfällt. */
  strich?: number
  /** Farbe für Punkt/Körper, z. B. 'var(--ac-orange)'. Ohne: currentColor. */
  akzent?: string
  /** Punkt schwebt langsam auf und ab (respektiert prefers-reduced-motion). */
  schwebt?: boolean
  /** Zugänglicher Name; leer = dekorativ. */
  titel?: string
  className?: string
  style?: CSSProperties
}) {
  const px = typeof groesse === 'number' ? groesse : undefined
  const sw = strich ?? (px !== undefined && px < 28 ? 6 : 4.5)
  return (
    <svg
      className={`ac-logo${schwebt ? ' ac-logo-schwebt' : ''} ${className}`}
      viewBox="0 0 64 64" width={groesse} height={groesse} style={style}
      fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      role={titel ? 'img' : undefined} aria-label={titel || undefined} aria-hidden={titel ? undefined : true}
    >
      <Formen v={variante} akzent={akzent} />
    </svg>
  )
}

/** Zeichen + Name klein. `gestapelt`: Zeichen über dem Namen (für quadratische Flächen, Favicon-Kacheln). */
export function LogoWortmarke({ variante = 'andocken', akzent, gestapelt, schwebt, className = '', style }: {
  variante?: LogoVariante
  akzent?: string
  gestapelt?: boolean
  schwebt?: boolean
  className?: string
  style?: CSSProperties
}) {
  const name = useName()
  return (
    <span className={`ac-lw${gestapelt ? ' ac-lw-gestapelt' : ''} ${className}`} style={style} aria-label={name} role="img">
      <Logo variante={variante} akzent={akzent} schwebt={schwebt} titel="" className="ac-lw-zeichen" />
      <span className="ac-lw-name" aria-hidden="true">{name}</span>
    </span>
  )
}
