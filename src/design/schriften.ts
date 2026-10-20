/*
 * Schriften – lokal ausgeliefert (Fontsource-Pakete, exakte Versionen in package.json).
 * Kein Request an Google: Vite kopiert die woff2-Dateien ins eigene Build.
 * Jede Datei hat unicode-range, der Browser lädt nur die Teilmengen, die auf der Seite vorkommen.
 *
 * Eingebunden als ?inline (CSS als Text, url() zeigt auf die gebauten Dateien) und als ein <style>
 * in den <head> gelegt:
 * - Variable Schnitte heißen bei Fontsource „… Variable“. Die Tokens schreiben den
 *   normalen Namen ("Martian Mono" usw.), deshalb wird der Name hier umgeschrieben.
 * - Die statischen Pakete exportieren „700“, nicht „700.css“; ohne Endung kennt TypeScript den
 *   Import nur über die ?inline-Deklaration von vite/client.
 */

import bigShoulders700 from '@fontsource/big-shoulders-display/700?inline'
import bigShoulders800 from '@fontsource/big-shoulders-display/800?inline'
import bigShoulders900 from '@fontsource/big-shoulders-display/900?inline'
import serif from '@fontsource/instrument-serif/400?inline'
import serifKursiv from '@fontsource/instrument-serif/400-italic?inline'
// variabel: Atkinson (wght 200–800, normal + kursiv), Martian Mono (wght 100–800, wdth 75–112,5 %)
import atkinson from '@fontsource-variable/atkinson-hyperlegible-next/wght?inline'
import atkinsonKursiv from '@fontsource-variable/atkinson-hyperlegible-next/wght-italic?inline'
import martian from '@fontsource-variable/martian-mono/wdth?inline'

const css = [
  bigShoulders700, bigShoulders800, bigShoulders900, serif, serifKursiv, atkinson, atkinsonKursiv, martian,
]
  .join('\n')
  .replace(/font-family:\s*'([^']+) Variable'/g, "font-family: '$1'")

const stil = document.createElement('style')
stil.dataset.schriften = ''
stil.textContent = css
document.head.prepend(stil)
