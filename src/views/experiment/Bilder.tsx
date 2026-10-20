import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Render } from '../../raum/renders'
import type { Projekt } from '../../data/projekte'
import { bildtext, CLIPTEXTE, srcsetVon, useClip } from './medien'
import { VORSCHAU } from './vorschau'

/** Text mit [Platzhaltern]: Klammerteile werden sichtbar markiert (.ph). */
export function Ph({ children }: { children: string }): ReactNode {
  return children.split(/(\[[^\]]+\])/).map((teil, i) =>
    teil.startsWith('[') ? <span key={i} className="ph">{teil}</span> : teil,
  )
}

/**
 * Bild mit Ersatzkette: erst WebP, dann PNG, dann ein beschrifteter Platzhalter.
 * Manche Renders und das Profilfoto gibt es evtl. noch nicht.
 * Kein loading="lazy": beim schnellen Scrollen und in Screenshots sollen sie da sein.
 */
function Kette({ quellen, alt, platzhalter, className = '', style }: { quellen: string[]; alt: string; platzhalter: string; className?: string; style?: CSSProperties }) {
  const [stufe, setStufe] = useState(0)
  if (stufe >= quellen.length) {
    return <div className={`x-platzhalter ${className}`} style={style} role="img" aria-label={alt}><span className="ph">[{platzhalter}]</span></div>
  }
  return <img className={className} style={style} src={quellen[stufe]} alt={alt} decoding="async" draggable={false} onError={() => setStufe(s => s + 1)} />
}

export function RenderBild({ r, className, style, deko }: { r?: Render; className?: string; style?: CSSProperties; deko?: boolean }) {
  if (!r) return <div className={`x-platzhalter ${className ?? ''}`} style={style} aria-hidden="true"><span className="ph">[render fehlt]</span></div>
  return <Kette key={r.name} quellen={[r.webp, r.png]} alt={deko ? '' : r.alt} platzhalter={`render: ${r.name}`} className={className} style={style} />
}

const BASIS = import.meta.env.BASE_URL
export function Profilfoto({ className }: { className?: string }) {
  return <Kette quellen={[`${BASIS}erik/profil.webp`, `${BASIS}erik/profil.png`]} alt="Erik Neuberger" platzhalter="foto: Erik" className={className} />
}

/* ---------- Fotos und Clips der Projekte (Projekt.bilder / Projekt.clip) ---------- */
// Rechteckig, runde Ecken, weicher Schatten (.ac-foto), festes Seitenverhältnis (nichts springt).
// Kein loading="lazy": wer schnell scrollt, überholt das Nachladen und sieht leere Felder. Stattdessen laden alle Fotos
// gleich, aber mit niedriger Priorität (Schrift und Titel zuerst), und bis dahin steht eine unscharfe Vorschau im Rahmen.

/** Hintergrund des Bildrahmens: unscharfe Vorschau, falls vorhanden. */
const vorschau = (src: string): CSSProperties | undefined => (VORSCHAU[src] ? { backgroundImage: `url("${VORSCHAU[src]}")` } : undefined)

type FotoProps = { src: string; className?: string; ueber?: boolean; zuschnitt?: number; style?: CSSProperties; sizes?: string }

/**
 * `ueber`: Unterschrift im Glasschild auf dem Foto, sonst klein darunter. `zuschnitt`: eigenes Seitenverhältnis.
 * `sizes`: Anzeigebreite für die Auswahl aus dem srcset (480/960/Original); ohne Angabe 100vw (sicher, aber groß).
 */
export function Foto({ src, className = '', ueber, zuschnitt, style, sizes = '100vw' }: FotoProps) {
  const t = bildtext(src)
  const [b, h] = t.masse
  return (
    <figure className={`x-bild ${className}`} style={{ '--r': zuschnitt ?? b / h, ...style } as CSSProperties}>
      <div className="ac-foto x-bild-rahmen" style={vorschau(src)}>
        <img sizes={sizes} srcSet={srcsetVon(src)} src={src} width={b} height={h} alt={t.alt} decoding="async" fetchPriority="low" draggable={false} />
        {ueber && t.unterschrift && <figcaption>{t.unterschrift}</figcaption>}
      </div>
      {!ueber && t.unterschrift && <figcaption className="x-bild-unter">{t.unterschrift}</figcaption>}
    </figure>
  )
}

/** Stummer Loop-Clip: spielt nur sichtbar und ohne reduzierte Bewegung, sonst Poster. Knopf zum Anhalten/Starten. */
export function Clip({ clip, className = '' }: { clip: NonNullable<Projekt['clip']>; className?: string }) {
  const { ref, laeuft, umschalten } = useClip()
  const t = CLIPTEXTE[clip.mp4]
  const [b, h] = t?.masse ?? [16, 9]
  return (
    <figure className={`x-bild x-clip ${className}`} style={{ '--r': b / h } as CSSProperties}>
      <div className="ac-foto x-bild-rahmen" style={vorschau(clip.poster)}>
        <video ref={ref} muted playsInline loop preload="none" poster={clip.poster} width={b} height={h} aria-label={clip.alt}>
          <source src={clip.webm} type="video/webm" />
          <source src={clip.mp4} type="video/mp4" />
        </video>
        <button type="button" className="x-clip-knopf" onClick={umschalten} aria-label={laeuft ? 'clip anhalten' : 'clip abspielen'}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            {laeuft ? <path d="M4.5 3v10M11.5 3v10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /> : <path d="M5 3.2v9.6L13 8Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />}
          </svg>
        </button>
      </div>
      {t && <figcaption className="x-bild-unter">{t.unterschrift}</figcaption>}
    </figure>
  )
}
