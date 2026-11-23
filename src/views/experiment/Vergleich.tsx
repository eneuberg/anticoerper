import type { CSSProperties } from 'react'
import { THESE } from '../../data/person'

function Pfeil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M2 12h19M13 4l8 8-8 8" />
    </svg>
  )
}

/** Schematisch, ohne Zahlen: Säulen sind Ideen, ihre Höhe ist, was sie einbringen. Mit ki sinkt die Schwelle, ab der sich eine Idee lohnt. */
function Kosten() {
  const { frueher, jetzt, ideen, beschreibung, hinweis } = THESE.kosten
  return (
    <div className="x-kosten">
      <div className="x-kosten-feld" role="img" aria-label={beschreibung}>
        {ideen.map(i => (
          <div key={i.name} className={`x-idee${i.hoehe < frueher ? ' neu' : ''}`} style={{ '--h': i.hoehe } as CSSProperties}>
            <i className="x-idee-saeule" />
            <span className="x-idee-name">{i.name}</span>
          </div>
        ))}
        <span className="x-schwelle" style={{ '--h': frueher } as CSSProperties}><b>einstiegskosten früher</b></span>
        <span className="x-schwelle jetzt" style={{ '--h': jetzt } as CSSProperties}><b>einstiegskosten mit ki</b></span>
        <span className="x-schwelle-fall" style={{ '--von': frueher, '--bis': jetzt } as CSSProperties} />
      </div>
      <p className="x-kosten-text">{hinweis}</p>
    </div>
  )
}

/** Die Aufschlüsselung: zwei kurze Aussagen, ein gemeinsamer Graph, das Fazit. */
export function Vergleich() {
  const [frueher, heute] = THESE.gegen
  return (
    <div className="x-vergleich">
      <div className="x-gegen">
        <p>{frueher.vor} <em>{frueher.betont}</em></p>
        <span className="x-gegen-pfeil" aria-hidden="true"><Pfeil /></span>
        <p>{heute.vor} <em>{heute.betont}</em></p>
      </div>
      <Kosten />
      <ul className="x-folgen">
        {THESE.folgen.map(t => <li key={t}><Pfeil />{t}</li>)}
      </ul>
    </div>
  )
}
