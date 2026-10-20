import { useEffect, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { MIX, type MaterialArt, type MaterialWahl } from './farben'
import { material, gelenkMaterial, studioUmgebung } from './studio'
import { antikoerperGeometrie } from './modelle/antikoerper'
import { ANTIKOERPER_RENDER, RENDERS } from './renders'

// Schwebende Antikörper (WebGL). Stoßen sich gegenseitig ab und weichen dem Mauszeiger aus.
// Transparenter Hintergrund, Canvas lässt Klicks durch (pointer-events: none): kann über Typo liegen.
//
// Performance:
// - eine InstancedMesh pro Material (Hülle + Gelenk): 2–6 Draw Calls, egal wie viele Antikörper
// - devicePixelRatio auf 1.75 begrenzt
// - rendert nur, wenn sichtbar (IntersectionObserver) und der Tab offen ist
// - prefers-reduced-motion: ein Standbild, kein Loop
// - keine Allokationen pro Frame (alle Vektoren vorab angelegt)
// - ohne WebGL: statisches Bild (WebP, PNG als Rückfall)

export type Antikoerper3DProps = {
  /** Anzahl der Antikörper (Standard 7). */
  anzahl?: number
  material?: MaterialWahl
  /** Dem Mauszeiger ausweichen (Standard an). */
  interaktiv?: boolean
  /** Größe eines Antikörpers relativ zur Höhe der Fläche (Standard 0.3). */
  groesse?: number
  /** Bild ohne WebGL. Standard: Gruppen-Render passend zum Material. */
  ersatzbild?: string
  className?: string
  style?: CSSProperties
}

const MAX_DPR = 1.75

/** PNG-Pfad → WebP daneben (nur für bekannte Renders, sonst gibt es keine WebP). */
const WEBP_ZU_PNG = new Map<string, string>(Object.values(RENDERS).map(r => [r.png, r.webp]))

// Grundstellung mit Spezifität 0: jede Klasse der Seite (z. B. position:absolute; inset:0) gewinnt.
// Bewusst kein Inline-Style, der würde die Positionierung der Seite überschreiben.
if (typeof document !== 'undefined' && !document.getElementById('antikoerper3d-grund')) {
  const s = document.createElement('style')
  s.id = 'antikoerper3d-grund'
  s.textContent = ':where(.antikoerper3d){position:relative}'
  document.head.prepend(s)
}

/** Zufall mit festem Startwert: gleiche Anordnung bei jedem Laden. */
function zufall(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

function webglMoeglich(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export function Antikoerper3D({ anzahl = 7, material: wahl = 'mix', interaktiv = true, groesse = 0.3, ersatzbild, className = '', style }: Antikoerper3DProps) {
  const huelle = useRef<HTMLDivElement>(null)
  const [ohneWebgl, setOhneWebgl] = useState(false)

  useEffect(() => {
    const el = huelle.current
    if (!el) return
    if (!webglMoeglich()) { setOhneWebgl(true); return }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      setOhneWebgl(true)
      return
    }
    const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR))
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.setClearColor(0x000000, 0)
    const canvas = renderer.domElement
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none'
    el.appendChild(canvas)

    const szene = new THREE.Scene()
    const env = studioUmgebung(renderer)
    szene.environment = env
    szene.environmentIntensity = 1
    const licht = new THREE.DirectionalLight(0xffffff, 1.4)
    licht.position.set(-4, 6, 5)
    szene.add(licht)

    const kamera = new THREE.PerspectiveCamera(30, 1, 1, 60)
    kamera.position.set(0, 0, 18)

    // Geometrie einmal, für alle Instanzen
    const geo = antikoerperGeometrie(6)
    const arten: MaterialArt[] = wahl === 'mix' ? MIX : [wahl]
    const rnd = zufall(23)

    // Körper: Zustand in flachen Arrays
    const n = Math.max(1, Math.round(anzahl))
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), heim = new Float32Array(n * 3)
    // Startlage: Y-Fläche ungefähr zur Kamera, damit die Form lesbar ist; um z frei gedreht
    const drehung = Array.from({ length: n }, () => new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.4, rnd() * 6.28)))
    const spin = new Float32Array(n * 3)
    const phase = new Float32Array(n)
    const skala = new Float32Array(n)
    const artVon = new Uint8Array(n)
    for (let i = 0; i < n; i++) {
      artVon[i] = i % arten.length
      phase[i] = rnd() * 100
      skala[i] = 0.8 + rnd() * 0.4
      spin[i * 3] = (rnd() - 0.5) * 0.2; spin[i * 3 + 1] = (rnd() - 0.5) * 0.2; spin[i * 3 + 2] = (rnd() - 0.5) * 0.6
    }

    // Instanzen je Material
    type Gruppe = { huelle: THREE.InstancedMesh; gelenk: THREE.InstancedMesh; index: number[] }
    const gruppen: Gruppe[] = arten.map((art, a) => {
      const index = [...Array(n).keys()].filter(i => artVon[i] === a)
      const h = new THREE.InstancedMesh(geo.huelle, material(art), index.length)
      const g = new THREE.InstancedMesh(geo.gelenk, gelenkMaterial(art), index.length)
      h.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      g.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      h.frustumCulled = g.frustumCulled = false
      szene.add(h, g)
      return { huelle: h, gelenk: g, index }
    })

    // Weltgröße der sichtbaren Fläche bei z = 0
    let halbB = 1, halbH = 1, einheit = 1
    const verteilen = () => {
      // Heimatpunkte auf einem lockeren Raster, leicht verwackelt
      const spalten = Math.max(1, Math.round(Math.sqrt(n * (halbB / halbH))))
      const zeilen = Math.ceil(n / spalten)
      const r2 = zufall(5)
      for (let i = 0; i < n; i++) {
        const sx = (i % spalten + 0.5) / spalten, sy = (Math.floor(i / spalten) + 0.5) / zeilen
        heim[i * 3] = (sx * 2 - 1) * halbB * 0.78 + (r2() - 0.5) * einheit * 0.8
        heim[i * 3 + 1] = (sy * 2 - 1) * halbH * 0.72 + (r2() - 0.5) * einheit * 0.8
        heim[i * 3 + 2] = (r2() - 0.5) * einheit * 2
      }
    }
    const groesseSetzen = () => {
      const b = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight)
      renderer.setSize(b, h, false)
      kamera.aspect = b / h
      kamera.updateProjectionMatrix()
      halbH = Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2)) * kamera.position.z
      halbB = halbH * kamera.aspect
      // Modell ist ca. 2.1 hoch: auf groesse × Flächenhöhe bringen
      einheit = (halbH * 2 * groesse) / 2.1
      verteilen()
    }
    groesseSetzen()
    for (let i = 0; i < n * 3; i++) pos[i] = heim[i]

    // Maus in Weltkoordinaten (z = 0); weit weg, solange keine Maus da ist
    const maus = new THREE.Vector2(1e6, 1e6)
    const beiZeiger = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      maus.set(((e.clientX - r.left) / r.width * 2 - 1) * halbB, -((e.clientY - r.top) / r.height * 2 - 1) * halbH)
    }
    const zeigerWeg = () => maus.set(1e6, 1e6)

    // Vorab angelegte Hilfsobjekte (keine Allokation im Loop)
    const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _dq = new THREE.Quaternion(), _ax = new THREE.Vector3()

    const schritt = (dt: number, t: number) => {
      const abstossR = einheit * 2.6, mausR = einheit * 2.4
      for (let i = 0; i < n; i++) {
        const ix = i * 3
        let fx = (heim[ix] - pos[ix]) * 0.9, fy = (heim[ix + 1] - pos[ix + 1]) * 0.9, fz = (heim[ix + 2] - pos[ix + 2]) * 0.9
        // Schweben: langsame, unregelmäßige Drift
        const ph = phase[i]
        fx += Math.sin(t * 0.31 + ph) * einheit * 0.35
        fy += Math.cos(t * 0.27 + ph * 1.3) * einheit * 0.45
        fz += Math.sin(t * 0.19 + ph * 0.7) * einheit * 0.3
        // gegenseitiges Abstoßen
        for (let j = 0; j < n; j++) {
          if (j === i) continue
          const jx = j * 3
          const dx = pos[ix] - pos[jx], dy = pos[ix + 1] - pos[jx + 1], dz = pos[ix + 2] - pos[jx + 2]
          const d2 = dx * dx + dy * dy + dz * dz
          if (d2 < abstossR * abstossR && d2 > 1e-6) {
            const d = Math.sqrt(d2), k = (1 - d / abstossR) ** 2 * 6 / d
            fx += dx * k; fy += dy * k; fz += dz * k
          }
        }
        // Maus: wegdrücken (in der Ebene) und etwas nach hinten, plus Drehimpuls
        if (interaktiv) {
          const mx = pos[ix] - maus.x, my = pos[ix + 1] - maus.y
          const md2 = mx * mx + my * my
          if (md2 < mausR * mausR) {
            const md = Math.sqrt(md2) + 1e-4, k = (1 - md / mausR) ** 2 * 26
            fx += (mx / md) * k; fy += (my / md) * k; fz -= k * 0.35
            spin[ix] += my / md * k * 0.02 * dt * 60
            spin[ix + 1] -= mx / md * k * 0.02 * dt * 60
          }
        }
        // Integration mit Dämpfung (bildratenunabhängig)
        const daempf = Math.exp(-1.6 * dt)
        vel[ix] = (vel[ix] + fx * dt) * daempf
        vel[ix + 1] = (vel[ix + 1] + fy * dt) * daempf
        vel[ix + 2] = (vel[ix + 2] + fz * dt) * daempf
        pos[ix] += vel[ix] * dt; pos[ix + 1] += vel[ix + 1] * dt; pos[ix + 2] += vel[ix + 2] * dt
        // Drehung: Spin klingt auf eine langsame Grunddrehung ab
        const sd = Math.exp(-0.8 * dt)
        for (let k = 0; k < 3; k++) {
          const ziel = Math.sign(spin[ix + k] || 1) * (k === 2 ? 0.14 : 0.03)
          spin[ix + k] = ziel + (spin[ix + k] - ziel) * sd
        }
        // sanft zurück zur Kamera drehen (Vorder- oder Rückseite, egal), sonst sieht man nur Kanten
        _ax.set(0, 0, 1).applyQuaternion(drehung[i])
        if (_ax.z < 0) _ax.negate()
        spin[ix] += _ax.y * 0.9 * dt // ω = n × z dreht n Richtung z
        spin[ix + 1] -= _ax.x * 0.9 * dt
        _ax.set(spin[ix], spin[ix + 1], spin[ix + 2])
        const w = _ax.length()
        if (w > 1e-5) {
          _dq.setFromAxisAngle(_ax.divideScalar(w), w * dt)
          drehung[i].premultiply(_dq)
        }
      }
    }

    const schreiben = () => {
      for (const g of gruppen) {
        for (let k = 0; k < g.index.length; k++) {
          const i = g.index[k]
          _p.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
          _s.setScalar(einheit * skala[i])
          _m.compose(_p, drehung[i], _s)
          g.huelle.setMatrixAt(k, _m)
          g.gelenk.setMatrixAt(k, _m)
        }
        g.huelle.instanceMatrix.needsUpdate = true
        g.gelenk.instanceMatrix.needsUpdate = true
      }
    }

    // Loop nur bei Sichtbarkeit
    let raf = 0, letzte = 0, zeit = 0, imBild = false
    const frame = (jetzt: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((jetzt - (letzte || jetzt)) / 1000, 1 / 30)
      letzte = jetzt
      zeit += dt
      schritt(dt, zeit)
      schreiben()
      renderer.render(szene, kamera)
    }
    const einmal = () => { schreiben(); renderer.render(szene, kamera) }
    const steuern = () => {
      const laufen = imBild && !document.hidden && !ruhig
      if (laufen && !raf) { letzte = 0; raf = requestAnimationFrame(frame) }
      if (!laufen && raf) { cancelAnimationFrame(raf); raf = 0 }
    }
    const io = new IntersectionObserver(([e]) => { imBild = e.isIntersecting; steuern() }, { rootMargin: '100px' })
    io.observe(el)
    const ro = new ResizeObserver(() => { groesseSetzen(); if (!raf) einmal() })
    ro.observe(el)
    document.addEventListener('visibilitychange', steuern)
    if (interaktiv && !ruhig) {
      window.addEventListener('pointermove', beiZeiger, { passive: true })
      document.addEventListener('pointerleave', zeigerWeg)
    }
    // ein Bild sofort (auch für reduced motion)
    if (ruhig) { for (let i = 0; i < 40; i++) schritt(1 / 30, i / 30) }
    einmal()

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect(); ro.disconnect()
      document.removeEventListener('visibilitychange', steuern)
      window.removeEventListener('pointermove', beiZeiger)
      document.removeEventListener('pointerleave', zeigerWeg)
      for (const g of gruppen) {
        ;(g.huelle.material as THREE.Material).dispose()
        ;(g.gelenk.material as THREE.Material).dispose()
        g.huelle.dispose(); g.gelenk.dispose()
      }
      geo.huelle.dispose(); geo.gelenk.dispose()
      env.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    }
  }, [anzahl, wahl, interaktiv, groesse])

  const ersatz = ersatzbild ?? ANTIKOERPER_RENDER[wahl]
  const ersatzWebp = WEBP_ZU_PNG.get(ersatz)
  return (
    <div ref={huelle} className={`antikoerper3d ${className}`.trim()} style={style} aria-hidden="true">
      {ohneWebgl && (
        <picture>
          {ersatzWebp && <source srcSet={ersatzWebp} type="image/webp" />}
          <img src={ersatz} alt="" draggable={false} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </picture>
      )}
    </div>
  )
}
