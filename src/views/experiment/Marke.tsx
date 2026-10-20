import type { CSSProperties } from 'react'
import { Logo, LogoWortmarke, type LogoVariante } from '../../components/Logo'

/**
 * Die einzige Stelle, an der die Seite das Logo wählt. Zum Tauschen nur diese Zeile ändern.
 */
const VARIANTE: LogoVariante = 'andocken'

/** Nur das Zeichen. */
export function Zeichen(props: { groesse?: number | string; akzent?: string; schwebt?: boolean; titel?: string; className?: string; style?: CSSProperties }) {
  return <Logo variante={VARIANTE} {...props} />
}

/** Zeichen mit Namen (Fuß). */
export function Marke(props: { akzent?: string; className?: string; style?: CSSProperties }) {
  return <LogoWortmarke variante={VARIANTE} {...props} />
}
