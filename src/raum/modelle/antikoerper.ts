import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Y-förmiger Antikörper (IgG), stilisiert wie ein Produkt aus Kapseln:
// Stiel (Fc) aus zwei schweren Ketten, zwei Arme (Fab) aus schwerer + leichter Kette,
// jede Kette in zwei „Domänen“ geteilt. In der Mitte ein Gelenk mit Achse.
// Koordinaten: Y nach oben, Gelenk im Ursprung, Höhe gesamt ca. 2.1 Einheiten.

const R = 0.135 // Kettenradius
const SPALT = -0.02 // Domänen überlappen leicht: Taille statt Lücke
const WINKEL = THREE.MathUtils.degToRad(50) // Arm gegen die Senkrechte

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _y = new THREE.Vector3(0, 1, 0)

/** Kapsel von a nach b (Mittelpunkte der Halbkugeln). */
function kapsel(a: THREE.Vector3, b: THREE.Vector3, r: number, detail: number): THREE.BufferGeometry {
  const d = new THREE.Vector3().subVectors(b, a)
  const g = new THREE.CapsuleGeometry(r, d.length(), detail, detail * 3)
  _q.setFromUnitVectors(_y, d.clone().normalize())
  _m.compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), _q, new THREE.Vector3(1, 1, 1))
  return g.applyMatrix4(_m)
}

/** Kette entlang Richtung dir ab Start, aufgeteilt in Domänen der Längen laengen. */
function kette(start: THREE.Vector3, dir: THREE.Vector3, laengen: number[], r: number, detail: number) {
  const teile: THREE.BufferGeometry[] = []
  let s = 0
  for (const l of laengen) {
    // l = sichtbare Länge inkl. Kappen
    const a = start.clone().addScaledVector(dir, s + r)
    const b = start.clone().addScaledVector(dir, s + l - r)
    teile.push(kapsel(a, b, r, detail))
    s += l + SPALT
  }
  return teile
}

export type AntikoerperGeometrie = { huelle: THREE.BufferGeometry; gelenk: THREE.BufferGeometry }

/** Baut die (teilbaren) Geometrien. detail 6 = interaktiv, 12 = Standbild. */
export function antikoerperGeometrie(detail = 6): AntikoerperGeometrie {
  const teile: THREE.BufferGeometry[] = []
  const versatz = R * 0.98 // Abstand Kettenachse ↔ Mitte
  const unten = new THREE.Vector3(0, -1, 0)

  // Stiel: zwei schwere Ketten nebeneinander, leicht in z versetzt wirkt organischer
  for (const sx of [-1, 1]) {
    teile.push(...kette(new THREE.Vector3(sx * versatz, -0.1, sx * 0.015), unten, [0.5, 0.48], R, detail))
  }

  // Arme
  for (const sx of [-1, 1]) {
    const dir = new THREE.Vector3(sx * Math.sin(WINKEL), Math.cos(WINKEL), 0)
    const aussen = new THREE.Vector3(sx * Math.cos(WINKEL), -Math.sin(WINKEL), 0) // weg vom V
    const basis = new THREE.Vector3(sx * 0.05, 0.06, 0)
    // schwere Kette innen
    teile.push(...kette(basis.clone().addScaledVector(dir, 0.08), dir, [0.48, 0.46], R, detail))
    // leichte Kette außen, etwas schlanker und kürzer
    const rl = R * 0.9
    teile.push(...kette(basis.clone().addScaledVector(aussen, R + rl * 0.95).addScaledVector(dir, 0.16), dir, [0.42, 0.42], rl, detail))
  }

  const huelle = mergeGeometries(teile, false)!
  teile.forEach(t => t.dispose())

  // Gelenk: Kugel + Achse quer (z), wie ein Scharnier
  const kugel = new THREE.SphereGeometry(0.17, detail * 4, detail * 3).translate(0, -0.02, 0)
  const achse = new THREE.CylinderGeometry(0.06, 0.06, 0.42, detail * 4, 1).rotateX(Math.PI / 2).translate(0, -0.02, 0)
  // Achskappen leicht gerundet
  const kappeA = new THREE.SphereGeometry(0.06, detail * 4, detail * 2).scale(1, 1, 0.45).translate(0, -0.02, 0.21)
  const kappeB = kappeA.clone().translate(0, 0, -0.42)
  const gelenk = mergeGeometries([kugel, achse, kappeA, kappeB], false)!
  ;[kugel, achse, kappeA, kappeB].forEach(t => t.dispose())

  // Mittelpunkt der Bounding-Box ungefähr in den Ursprung (für Rotation um die Mitte)
  huelle.computeBoundingBox()
  const mitte = huelle.boundingBox!.getCenter(new THREE.Vector3())
  huelle.translate(-mitte.x, -mitte.y, -mitte.z)
  gelenk.translate(-mitte.x, -mitte.y, -mitte.z)
  huelle.computeBoundingSphere()
  gelenk.computeBoundingSphere()
  return { huelle, gelenk }
}
