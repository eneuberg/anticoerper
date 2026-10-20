import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MATERIAL, FARBEN, type MaterialArt } from './farben'

// Gemeinsame Bausteine: Materialien, Studio-Umgebung, Beleuchtung.
// Wird vom interaktiven Antikoerper3D und von der Render-Seite benutzt.

/** sRGB-Hex → THREE.Color (three rechnet intern linear, Color.set kümmert sich darum). */
export const farbe = (hex: string) => new THREE.Color(hex)

/** PBR-Material einer Variante aus farben.ts. */
export function material(art: MaterialArt): THREE.MeshPhysicalMaterial {
  const m = MATERIAL[art]
  const mat = new THREE.MeshPhysicalMaterial({
    color: farbe(m.farbe),
    metalness: m.metall,
    roughness: m.rauheit,
    clearcoat: m.lack ?? 0,
    clearcoatRoughness: m.lackRauheit ?? 0,
  })
  if (m.schimmer) {
    // Sheen = samtiger Rand, typisch für Soft-Touch-Oberflächen
    mat.sheen = m.schimmer
    mat.sheenRoughness = 0.8
    mat.sheenColor = farbe('#ffffff')
  }
  if (m.deckkraft !== undefined) {
    mat.transparent = true
    mat.opacity = m.deckkraft
    mat.depthWrite = true
  }
  return mat
}

/** Material für das Gelenk in der Mitte: Kontrast zur Hülle, aber ruhig. */
export function gelenkMaterial(art: MaterialArt): THREE.MeshPhysicalMaterial {
  if (art === 'chrom') return new THREE.MeshPhysicalMaterial({ color: farbe(FARBEN.alu), metalness: 1, roughness: 0.42 }) // seidenmatt
  if (art === 'weich' || art === 'milchglas') return new THREE.MeshPhysicalMaterial({ color: farbe(FARBEN.weiss), metalness: 0, roughness: 0.7 })
  return material('chrom')
}

/** Einfache Material-Fabrik für die Objekt-Modelle. */
export const mat = {
  kunststoff: (hex: string, rauheit = 0.45, lack = 0) =>
    new THREE.MeshPhysicalMaterial({ color: farbe(hex), metalness: 0, roughness: rauheit, clearcoat: lack, clearcoatRoughness: 0.15 }),
  metall: (hex: string, rauheit = 0.25) => new THREE.MeshPhysicalMaterial({ color: farbe(hex), metalness: 1, roughness: rauheit }),
  leuchte: (hex: string, staerke = 4) =>
    new THREE.MeshStandardMaterial({ color: farbe('#000000'), emissive: farbe(hex), emissiveIntensity: staerke, roughness: 0.3 }),
}

/**
 * Softbox-Studio als Umgebungs-Szene: dunkelgrauer Raum mit Verlauf, darin große weiche Lichtflächen.
 * Chrom braucht dunkle Flächen zum Spiegeln, sonst verschwindet es vor hellem Hintergrund.
 */
function softboxStudio(): { szene: THREE.Scene; dispose: () => void } {
  const szene = new THREE.Scene()
  const weg: { dispose: () => void }[] = []
  // Hülle mit vertikalem Verlauf: Decke hell, dunkles Band am Horizont (gibt Chrom seine Kontur),
  // Boden mittelgrau. Bewusst kein Schwarz, damit es weich bleibt.
  const huelleGeo = new THREE.SphereGeometry(20, 48, 24)
  const huelleMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      oben: { value: new THREE.Color(1.0, 1.0, 1.0) },
      horizont: { value: new THREE.Color(0.24, 0.24, 0.25) },
      unten: { value: new THREE.Color(0.46, 0.46, 0.46) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 oben; uniform vec3 horizont; uniform vec3 unten; varying vec3 vP;
      void main(){ float h = vP.y;
        vec3 c = h > 0. ? mix(horizont, oben, smoothstep(0.02, .7, h)) : mix(horizont, unten, smoothstep(0.0, .5, -h));
        gl_FragColor = vec4(c, 1.); }`,
  })
  szene.add(new THREE.Mesh(huelleGeo, huelleMat))
  weg.push(huelleGeo, huelleMat)

  // Lichtfläche mit weichem Rand (kein harter Kasten in der Spiegelung)
  const flaecheGeo = new THREE.PlaneGeometry(1, 1)
  weg.push(flaecheGeo)
  const box = (b: number, h: number, staerke: number, pos: [number, number, number], weich = 0.35) => {
    const m = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { staerke: { value: staerke }, weich: { value: weich } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform float staerke; uniform float weich; varying vec2 vUv;
        void main(){ vec2 d = abs(vUv - .5) * 2.; float r = max(d.x, d.y);
          float a = 1. - smoothstep(1. - weich, 1., r); gl_FragColor = vec4(vec3(staerke * a), 1.); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const mesh = new THREE.Mesh(flaecheGeo, m)
    mesh.scale.set(b, h, 1)
    mesh.position.set(...pos)
    mesh.lookAt(0, 0, 0)
    szene.add(mesh)
    weg.push(m)
  }
  box(9, 9, 2.6, [0, 12, 1])          // Decke, groß und weich
  box(5, 8, 5, [-9, 4, 6], 0.5)       // Hauptlicht links vorn
  box(1.6, 10, 6, [9, 3, -5], 0.4)    // Streiflicht rechts hinten (Kontur)
  box(6, 5, 1.4, [8, 1, 8], 0.6)      // Aufheller rechts vorn
  box(10, 1.4, 2.2, [0, 1.5, -11], 0.5) // Horizontstreifen hinten
  return { szene, dispose: () => weg.forEach(w => w.dispose()) }
}

/**
 * Studio-Umgebung über PMREM vorgefiltert. 'softbox' (Standard) oder 'raum' (three RoomEnvironment).
 * Rückgabe muss vom Aufrufer disposed werden.
 */
export function studioUmgebung(renderer: THREE.WebGLRenderer, art: 'softbox' | 'raum' = 'softbox', unschaerfe = 0.06): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer)
  let rt: THREE.WebGLRenderTarget
  if (art === 'raum') {
    const raum = new RoomEnvironment()
    rt = pmrem.fromScene(raum, unschaerfe)
    raum.dispose()
  } else {
    const s = softboxStudio()
    rt = pmrem.fromScene(s.szene, unschaerfe)
    s.dispose()
  }
  pmrem.dispose()
  return rt.texture
}
