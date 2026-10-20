import { Suspense, lazy, useState } from 'react'

// Feedback-Werkzeug nur im Dev-Modus; schickt Anmerkungen an den lokalen agentation-mcp-Server.
// Kostet beim Scrollen spürbar JavaScript, deshalb abschaltbar (Leiste unten oder ?ohne-feedback).
const Agentation = import.meta.env.DEV
  ? lazy(() => import('agentation').then(m => ({ default: m.Agentation })))
  : null

const KEY = 'feedback'
function startwert() {
  if (new URLSearchParams(location.search).has('ohne-feedback')) return false
  try { return localStorage.getItem(KEY) !== 'aus' } catch { return true }
}

export function useFeedback() {
  const [an, setAn] = useState(startwert)
  const umschalten = () => setAn(v => {
    try { localStorage.setItem(KEY, v ? 'aus' : 'an') } catch { /* egal */ }
    return !v
  })
  return { verfuegbar: !!Agentation, an, umschalten }
}

export function Feedback({ an }: { an: boolean }) {
  if (!Agentation || !an) return null
  return (
    <Suspense>
      <Agentation endpoint="http://localhost:4747" appName="anticoerper" />
    </Suspense>
  )
}
