import { createContext, useContext, useLayoutEffect, useRef, type ElementType } from 'react'

export type Schreibweise = 'lower' | 'upper' | 'title'
export const SchreibweiseCtx = createContext<Schreibweise>('lower')

const NAME = 'anticoerper'
export function useName() {
  const s = useContext(SchreibweiseCtx)
  return s === 'upper' ? NAME.toUpperCase() : s === 'title' ? 'Anticoerper' : NAME
}

/**
 * Der Name in der gewählten Schreibweise. `fit` skaliert ihn auf die volle Breite des Elternelements,
 * `markiert` hebt einzelne Buchstaben (Index) wie ausgewählten Text hervor.
 */
export function Wortmarke({ as: Tag = 'span', className, fit, markiert }: { as?: ElementType; className?: string; fit?: boolean; markiert?: number[] }) {
  const name = useName()
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!fit || !el) return
    const run = () => {
      const box = el.parentElement!
      const cs = getComputedStyle(box)
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      el.style.fontSize = '100px'
      const w = el.offsetWidth
      if (w) el.style.fontSize = (100 * avail / w * 0.995) + 'px'
    }
    run()
    document.fonts?.ready.then(run)
    addEventListener('resize', run)
    return () => removeEventListener('resize', run)
  }, [fit, name])

  if (!markiert) return <Tag ref={ref} className={className}>{name}</Tag>
  return (
    <Tag ref={ref} className={className} aria-label={name}>
      {[...name].map((c, i) => markiert.includes(i) ? <span key={i} className="sel" aria-hidden="true">{c}</span> : <span key={i} aria-hidden="true">{c}</span>)}
    </Tag>
  )
}
