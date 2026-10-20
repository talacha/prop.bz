// Illustrative sample scenes for the demo sale listings. Low-poly, deliberately stylized: they are
// placeholders for real photography, rendered with real 3D geometry so the 360° panoramas are correct.
import * as THREE from 'three'
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js'

const canvas = document.getElementById('c')
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.outputColorSpace = THREE.SRGBColorSpace
const pmrem = new THREE.PMREMGenerator(renderer)
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

/* ------------------------------------------------------------------ helpers */
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: o.r ?? 0.85, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.t, opacity: o.o ?? 1})
function box(parent, [w, h, d], [x, y, z], color, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat ?? mat(color, o))
  m.position.set(x, y + h / 2, z)
  m.castShadow = o.cast ?? true
  m.receiveShadow = true
  if (o.rot) m.rotation.y = o.rot
  parent.add(m)
  return m
}
function cyl(parent, [rt, rb, h], [x, y, z], color, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 20), o.mat ?? mat(color, o))
  m.position.set(x, y + h / 2, z)
  m.castShadow = o.cast ?? true
  m.receiveShadow = true
  parent.add(m)
  return m
}
function sphere(parent, r, [x, y, z], color, o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), o.mat ?? mat(color, o))
  m.position.set(x, y, z)
  if (o.scale) m.scale.set(...o.scale)
  m.castShadow = o.cast ?? true
  m.receiveShadow = true
  parent.add(m)
  return m
}
const group = (parent, x, z, rot = 0, y = 0) => {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  g.rotation.y = rot
  parent.add(g)
  return g
}
const v = (a) => new THREE.Vector3(...a)

function texCanvas(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
const woodTex = (base = '#b98d62', line = '#9d7249', plank = 0.18) => {
  const t = texCanvas(1024, 1024, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const rows = Math.round(1 / plank)
    for (let i = 0; i < rows * 4; i++) {
      const y = (i * h) / (rows * 4)
      g.fillStyle = `rgba(${90 + (i % 5) * 8},${60 + (i % 3) * 6},${40},${0.06 + (i % 4) * 0.02})`
      g.fillRect(0, y, w, h / (rows * 4))
      g.strokeStyle = line
      g.globalAlpha = 0.35
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(w, y)
      g.stroke()
      g.globalAlpha = 1
      for (let k = 0; k < 3; k++) {
        const x = ((i * 137 + k * 311) % 1000) + 12
        g.fillStyle = line
        g.globalAlpha = 0.25
        g.fillRect(x, y, 2, h / (rows * 4))
        g.globalAlpha = 1
      }
    }
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}
const tileTex = (a = '#e9e4da', b = '#ddd6c9') => {
  const t = texCanvas(512, 512, (g, w, h) => {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4) }
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}
const grassTex = (a = '#6fae4f', b = '#5e9c41') => {
  const t = texCanvas(512, 512, (g, w, h) => {
    g.fillStyle = a
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = i % 3 ? b : '#7dbb5c'
      g.globalAlpha = 0.5
      g.fillRect(Math.random() * w, Math.random() * h, 3, 7)
    }
    g.globalAlpha = 1
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}
// "what you see through the window": a painted backdrop so windows do not read as white rectangles
const viewTex = (kind) =>
  texCanvas(512, 320, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.55)
    sky.addColorStop(0, kind === 'dusk' ? '#5b79b8' : '#4d9be6')
    sky.addColorStop(1, kind === 'dusk' ? '#f1b58a' : '#cfe9f8')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    if (kind === 'sea') {
      g.fillStyle = '#1aa6b7'
      g.fillRect(0, h * 0.5, w, h * 0.22)
      g.fillStyle = '#35c0c9'
      g.fillRect(0, h * 0.58, w, h * 0.1)
      g.fillStyle = '#efe0b8'
      g.fillRect(0, h * 0.72, w, h * 0.12)
      g.fillStyle = '#5da13f'
      g.fillRect(0, h * 0.84, w, h * 0.16)
    } else {
      g.fillStyle = '#4a8b3a'
      g.beginPath()
      for (let x = 0; x <= w; x += 16) g.lineTo(x, h * 0.5 - Math.abs(Math.sin(x * 0.07)) * 26)
      g.lineTo(w, h)
      g.lineTo(0, h)
      g.fill()
      g.fillStyle = '#6aa94b'
      g.fillRect(0, h * 0.72, w, h * 0.28)
      g.fillStyle = '#e8eef2'
      g.beginPath()
      g.ellipse(w * 0.3, h * 0.2, 70, 16, 0, 0, 7)
      g.ellipse(w * 0.72, h * 0.14, 90, 14, 0, 0, 7)
      g.fill()
    }
  })

/* -------------------------------------------------------------- environment */
function skyDome(scene, {top = 0x3d86d8, mid = 0xa9d4f2, bottom = 0xe6f3fa, sun = [0.4, 0.55, -0.7], glow = 0xfff2cc} = {}) {
  const s = new THREE.Vector3(...sun).normalize()
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {top: {value: new THREE.Color(top)}, mid: {value: new THREE.Color(mid)}, bottom: {value: new THREE.Color(bottom)}, sunDir: {value: s}, glow: {value: new THREE.Color(glow)}},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 glow;
      void main(){ float y = vP.y; vec3 c = mix(bottom, mid, smoothstep(-0.02, 0.18, y)); c = mix(c, top, smoothstep(0.12, 0.85, y));
        float sd = max(dot(normalize(vP), sunDir), 0.0); c += glow * (pow(sd, 900.0) * 3.0 + pow(sd, 18.0) * 0.28);
        gl_FragColor = vec4(c, 1.0); }`,
  })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), m)
  scene.add(dome)
  // flat clouds
  const cm = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false})
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (i % 3) * 0.4
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), cm)
    c.position.set(Math.cos(a) * (350 + (i % 4) * 90), 90 + (i % 5) * 28, Math.sin(a) * (350 + (i % 4) * 90))
    c.scale.set(70 + (i % 3) * 30, 9, 28 + (i % 2) * 14)
    scene.add(c)
  }
}
function lights(scene, {sunDir = [0.5, 0.8, 0.4], sunColor = 0xfff1d6, sunInt = 2.4, hemi = [0xcfe6ff, 0xb9a98d, 0.7], area = 14, env = 0.45, shadow = 2048} = {}) {
  scene.environment = ENV
  scene.environmentIntensity = env
  scene.add(new THREE.HemisphereLight(hemi[0], hemi[1], hemi[2]))
  const d = new THREE.DirectionalLight(sunColor, sunInt)
  d.position.set(...sunDir).multiplyScalar(30)
  d.castShadow = true
  d.shadow.mapSize.set(shadow, shadow)
  Object.assign(d.shadow.camera, {left: -area, right: area, top: area, bottom: -area, near: 1, far: 140})
  d.shadow.bias = -0.0004
  d.shadow.normalBias = 0.03
  d.shadow.radius = 4
  scene.add(d)
  return d
}
function palm(parent, x, z, h = 7, seed = 0) {
  const g = group(parent, x, z, seed)
  const trunkM = mat(0x8a6a45, {r: 0.95})
  let cx = 0, cy = 0
  const lean = 0.07 + (seed % 3) * 0.03
  for (let i = 0; i < 6; i++) {
    const seg = h / 6
    const s = cyl(g, [0.16 - i * 0.012, 0.19 - i * 0.012, seg], [cx, cy, 0], 0, {mat: trunkM, seg: 8})
    s.rotation.z = -lean
    cx += Math.sin(lean) * seg
    cy += Math.cos(lean) * seg
  }
  const top = group(g, cx, 0, 0, cy)
  const fm = mat(0x2f7d3a, {r: 0.7})
  for (let i = 0; i < 12; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.8, 6), fm)
    f.scale.set(1, 1, 0.16)
    f.rotation.z = Math.PI / 2 + 0.55 + (i % 3) * 0.28
    f.position.set(1.4, -0.15, 0)
    const pivot = new THREE.Group()
    pivot.rotation.y = (i / 12) * Math.PI * 2
    pivot.add(f)
    f.castShadow = true
    top.add(pivot)
  }
  sphere(top, 0.28, [0, 0, 0], 0x5a4a2a, {r: 0.9})
  return g
}
function bush(parent, x, z, r = 0.8, color = 0x3f8a3c) {
  sphere(parent, r, [x, r * 0.8, z], color, {r: 0.9, scale: [1, 0.8, 1]})
  sphere(parent, r * 0.7, [x + r * 0.7, r * 0.6, z + r * 0.3], 0x4a9a45, {r: 0.9, scale: [1, 0.8, 1]})
}
function plant(parent, x, z, h = 1.1) {
  cyl(parent, [0.2, 0.15, 0.35], [x, 0, z], 0xd9d2c4, {r: 0.6})
  sphere(parent, 0.34 * h, [x, 0.35 + 0.3 * h, z], 0x3d8b4a, {r: 0.9})
  sphere(parent, 0.26 * h, [x + 0.15, 0.35 + 0.55 * h, z + 0.05], 0x4aa058, {r: 0.9})
}

/* ----------------------------------------------------------------- furniture */
function sofa(p, x, z, rot, len = 2.3, color = 0x4f6b73) {
  const g = group(p, x, z, rot)
  box(g, [len, 0.18, 0.95], [0, 0.12, 0], 0x2d2a27)
  box(g, [len, 0.28, 0.9], [0, 0.3, 0.02], color, {r: 0.95})
  box(g, [len, 0.5, 0.22], [0, 0.45, -0.38], color, {r: 0.95})
  box(g, [0.2, 0.3, 0.95], [-len / 2 + 0.1, 0.48, 0.02], color, {r: 0.95})
  box(g, [0.2, 0.3, 0.95], [len / 2 - 0.1, 0.48, 0.02], color, {r: 0.95})
  const n = Math.max(2, Math.round(len / 0.8))
  for (let i = 0; i < n; i++) box(g, [(len - 0.4) / n - 0.03, 0.12, 0.62], [-len / 2 + 0.2 + ((i + 0.5) * (len - 0.4)) / n, 0.58, 0.14], i % 2 ? 0x5b7a83 : 0x57747c, {r: 1})
  box(g, [0.45, 0.4, 0.12], [-len / 2 + 0.55, 0.62, -0.1], 0xe0a458, {rot: 0.2, r: 1})
  box(g, [0.45, 0.4, 0.12], [len / 2 - 0.55, 0.62, -0.1], 0xf1ece2, {rot: -0.2, r: 1})
}
function armchair(p, x, z, rot, color = 0xd9a05b) {
  const g = group(p, x, z, rot)
  box(g, [0.85, 0.3, 0.85], [0, 0.18, 0], color, {r: 0.95})
  box(g, [0.85, 0.5, 0.18], [0, 0.4, -0.34], color, {r: 0.95})
  box(g, [0.14, 0.3, 0.85], [-0.36, 0.45, 0], color, {r: 0.95})
  box(g, [0.14, 0.3, 0.85], [0.36, 0.45, 0], color, {r: 0.95})
  for (const [lx, lz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) cyl(g, [0.03, 0.025, 0.2], [lx, 0, lz], 0x3a2a1c)
}
function coffeeTable(p, x, z, rot = 0, w = 1.15, d = 0.65) {
  const g = group(p, x, z, rot)
  box(g, [w, 0.05, d], [0, 0.36, 0], 0xcaa87c, {r: 0.5})
  box(g, [w - 0.2, 0.03, d - 0.2], [0, 0.18, 0], 0x6f5a45, {r: 0.6})
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, [0.05, 0.36, 0.05], [lx * (w / 2 - 0.06), 0, lz * (d / 2 - 0.06)], 0x2a2420)
  cyl(g, [0.07, 0.06, 0.2], [0.2, 0.41, 0.05], 0xf2efe8, {r: 0.4})
  box(g, [0.3, 0.03, 0.22], [-0.25, 0.41, 0], 0xa65a3c)
}
function rug(p, x, z, w = 3.2, d = 2.2, color = 0xcfc4ad, rot = 0) {
  box(p, [w, 0.02, d], [x, 0, z], color, {r: 1, cast: false, rot})
  box(p, [w - 0.3, 0.025, d - 0.3], [x, 0, z], 0xbfae93, {r: 1, cast: false, rot})
}
function tvUnit(p, x, z, rot, w = 2) {
  const g = group(p, x, z, rot)
  box(g, [w, 0.5, 0.42], [0, 0.05, 0], 0x6c553f, {r: 0.6})
  box(g, [w - 0.2, 0.04, 0.4], [0, 0.55, 0], 0xcaa87c, {r: 0.5})
  box(g, [1.4, 0.8, 0.04], [0, 1.0, -0.05], 0x111418, {r: 0.2, m: 0.3})
  box(g, [1.34, 0.74, 0.01], [0, 1.03, -0.025], 0x1c2530, {r: 0.1, m: 0.2})
}
function chair(p, x, z, rot, color = 0xe8e2d6) {
  const g = group(p, x, z, rot)
  box(g, [0.46, 0.05, 0.46], [0, 0.45, 0], color, {r: 0.7})
  box(g, [0.46, 0.5, 0.05], [0, 0.5, -0.22], color, {r: 0.7})
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, [0.04, 0.45, 0.04], [lx * 0.2, 0, lz * 0.2], 0x2a2420)
}
function diningTable(p, x, z, rot = 0, len = 2, chairs = 6) {
  const g = group(p, x, z, rot)
  box(g, [len, 0.05, 0.95], [0, 0.72, 0], 0xd7b98c, {r: 0.45})
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, [0.07, 0.72, 0.07], [lx * (len / 2 - 0.1), 0, lz * 0.4], 0x3a2b1f)
  const per = chairs / 2
  for (let i = 0; i < per; i++) {
    const cx = -len / 2 + 0.4 + (i * (len - 0.8)) / Math.max(1, per - 1)
    chair(g, cx, -0.72, 0)
    chair(g, cx, 0.72, Math.PI)
  }
  cyl(g, [0.12, 0.09, 0.28], [0, 0.77, 0], 0xf4f1ea, {r: 0.3})
  sphere(g, 0.2, [0, 1.12, 0], 0x4f9a52, {r: 0.9})
}
function pendant(p, x, y, z, color = 0xffe2a8) {
  cyl(p, [0.008, 0.008, 1.2], [x, y, z], 0x222222, {cast: false})
  sphere(p, 0.18, [x, y, z], color, {mat: new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: 2.2}), cast: false})
}
function lamp(p, x, y, z) {
  cyl(p, [0.04, 0.06, 0.26], [x, y, z], 0xf2efe8, {r: 0.4})
  const sh = cyl(p, [0.1, 0.16, 0.2], [x, y + 0.26, z], 0xffe9c1, {mat: new THREE.MeshStandardMaterial({color: 0xffe9c1, emissive: 0xffd9a0, emissiveIntensity: 1.2, roughness: 0.7})})
  sh.castShadow = false
}
function art(p, [x, y, z], rot, w, h, colors) {
  const g = group(p, x, z, rot, y)
  box(g, [w + 0.08, h + 0.08, 0.04], [0, 0, 0], 0x1d1b19, {cast: false})
  const pal = colors ?? [0xe0a458, 0x3f7f8c, 0xf3ece0, 0xc2543a]
  for (let i = 0; i < 4; i++) box(g, [w / 2 - 0.02, h / 2 - 0.02, 0.02], [(i % 2 ? 1 : -1) * (w / 4), (i < 2 ? 0 : h / 2) + 0.01, 0.03], pal[i % pal.length], {cast: false, r: 0.9})
}
function bed(p, x, z, rot, w = 1.8) {
  const g = group(p, x, z, rot)
  box(g, [w + 0.1, 0.32, 2.1], [0, 0.05, 0], 0x6a523c, {r: 0.6})
  box(g, [w, 0.26, 2.0], [0, 0.37, 0.02], 0xf4f1ea, {r: 0.95})
  box(g, [w + 0.3, 1.0, 0.1], [0, 0.05, -1.08], 0x7a6a58, {r: 0.9})
  box(g, [w, 0.04, 0.8], [0, 0.63, 0.6], 0xd49a5d, {r: 1})
  box(g, [w, 0.06, 0.5], [0, 0.63, 0.1], 0xe6dfd2, {r: 1})
  for (const s of w > 1.4 ? [-1, 1] : [0]) box(g, [0.62, 0.14, 0.38], [s * (w / 4), 0.63, -0.75], 0xfffdf8, {r: 1, rot: s * 0.04})
  box(g, [w, 0.03, 0.5], [0, 0.66, 0.78], 0x2f6f7a, {r: 1})
}
function nightstand(p, x, z, rot = 0) {
  const g = group(p, x, z, rot)
  box(g, [0.46, 0.5, 0.4], [0, 0.05, 0], 0x6a523c, {r: 0.6})
  lamp(g, 0, 0.55, 0)
}
function kitchen(p, x, z, rot, len = 4, island = true) {
  const g = group(p, x, z, rot)
  box(g, [len, 0.9, 0.62], [0, 0, 0], 0xece8df, {r: 0.5})
  box(g, [len + 0.02, 0.045, 0.68], [0, 0.9, 0.02], 0x3b3b3d, {r: 0.25, m: 0.1})
  box(g, [len - 1.2, 0.7, 0.34], [-0.6, 1.5, -0.14], 0xf4f1ea, {r: 0.5})
  box(g, [0.7, 0.7, 0.45], [len / 2 - 0.7, 1.55, -0.1], 0x9aa1a6, {r: 0.35, m: 0.6})
  box(g, [0.8, 1.9, 0.72], [-len / 2 + 0.4, 0, 0.0], 0xb8bec3, {r: 0.3, m: 0.7})
  box(g, [0.55, 0.01, 0.4], [0.4, 0.945, 0.05], 0xaaaeb2, {r: 0.2, m: 0.8, cast: false})
  if (island) {
    box(g, [2.2, 0.9, 0.9], [0.2, 0, 1.9], 0xdfe6e8, {r: 0.5})
    box(g, [2.3, 0.05, 1.0], [0.2, 0.9, 1.9], 0xf0ede6, {r: 0.2})
    for (let i = 0; i < 3; i++) {
      cyl(g, [0.19, 0.19, 0.05], [-0.4 + i * 0.6, 0.62, 2.65], 0xcaa87c, {r: 0.5})
      cyl(g, [0.025, 0.03, 0.62], [-0.4 + i * 0.6, 0, 2.65], 0x2a2420)
    }
  }
}
function windowWall(parent, wall, w, d, h, {pos = 0, width = 2.4, height = 1.6, sill = 0.9, view = 'garden'}) {
  const off = 0.02
  const g = new THREE.Group()
  let x = 0, z = 0, ry = 0
  if (wall === 'N') { z = -d / 2 + off; x = pos; ry = 0 }
  if (wall === 'S') { z = d / 2 - off; x = pos; ry = Math.PI }
  if (wall === 'E') { x = w / 2 - off; z = pos; ry = -Math.PI / 2 }
  if (wall === 'W') { x = -w / 2 + off; z = pos; ry = Math.PI / 2 }
  g.position.set(x, 0, z)
  g.rotation.y = ry
  const win = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({map: viewTex(view)}))
  win.position.set(0, sill + height / 2, 0)
  g.add(win)
  const fr = 0x2a2a2c
  const t = 0.07
  box(g, [width + 0.14, t, 0.08], [0, sill - t, 0.02], fr, {cast: false})
  box(g, [width + 0.14, t, 0.08], [0, sill + height, 0.02], fr, {cast: false})
  box(g, [t, height, 0.08], [-width / 2 - 0.03, sill, 0.02], fr, {cast: false})
  box(g, [t, height, 0.08], [width / 2 + 0.03, sill, 0.02], fr, {cast: false})
  const n = Math.max(1, Math.round(width / 1.3))
  for (let i = 1; i < n; i++) box(g, [0.045, height, 0.06], [-width / 2 + (i * width) / n, sill, 0.02], fr, {cast: false})
  parent.add(g)
}
function shell(scene, {w, d, h = 2.8, floor = 'wood', wall = 0xf2eee7, windows = []}) {
  const g = new THREE.Group()
  scene.add(g)
  const ft = floor === 'wood' ? woodTex() : tileTex()
  ft.repeat.set(w / 2.4, d / 2.4)
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({map: ft, roughness: floor === 'wood' ? 0.55 : 0.35}))
  fl.rotation.x = -Math.PI / 2
  fl.receiveShadow = true
  g.add(fl)
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0xffffff, {r: 1}))
  ce.rotation.x = Math.PI / 2
  ce.position.y = h
  g.add(ce)
  const wm = mat(wall, {r: 0.95})
  const mk = (pw, ph, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), wm)
    m.position.set(x, ph / 2, z)
    m.rotation.y = ry
    m.receiveShadow = true
    g.add(m)
  }
  mk(w, h, 0, -d / 2, 0)
  mk(w, h, 0, d / 2, Math.PI)
  mk(d, h, w / 2, 0, -Math.PI / 2)
  mk(d, h, -w / 2, 0, Math.PI / 2)
  const bb = 0xffffff
  box(g, [w, 0.1, 0.03], [0, 0, -d / 2 + 0.02], bb, {cast: false})
  box(g, [w, 0.1, 0.03], [0, 0, d / 2 - 0.02], bb, {cast: false})
  box(g, [0.03, 0.1, d], [-w / 2 + 0.02, 0, 0], bb, {cast: false})
  box(g, [0.03, 0.1, d], [w / 2 - 0.02, 0, 0], bb, {cast: false})
  for (const win of windows) windowWall(g, win.wall, w, d, h, win)
  return g
}

/* ----------------------------------------------------------------- the worlds */
const SUN_DAY = [0.45, 0.62, -0.55]

function houseExterior(scene, time = 'day') {
  skyDome(scene, time === 'dusk' ? {top: 0x35508f, mid: 0xe69a73, bottom: 0xf6cfa0, sun: [0.7, 0.12, -0.7], glow: 0xffb070} : {sun: SUN_DAY})
  lights(scene, {sunDir: time === 'dusk' ? [0.8, 0.22, -0.6] : SUN_DAY, sunColor: time === 'dusk' ? 0xffb27a : 0xfff0d8, sunInt: time === 'dusk' ? 2.2 : 2.8, area: 30, env: 0.5})
  const gt = grassTex()
  gt.repeat.set(30, 30)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({map: gt, roughness: 1}))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  // street + sidewalk (front, +z)
  box(scene, [240, 0.05, 8], [0, 0, 26], 0x4a4d52, {r: 0.95, cast: false})
  box(scene, [240, 0.14, 2.2], [0, 0, 20.6], 0xcfcac0, {r: 0.9, cast: false})
  for (let i = -10; i < 10; i++) box(scene, [2, 0.01, 0.16], [i * 5, 0.06, 26], 0xe9e4d2, {cast: false})
  // house: ground floor + wood upper + flat roofs
  const H = group(scene, 0, 0)
  box(H, [13, 3.2, 6.5], [0, 0, 0], 0xf4f1ea, {r: 0.9})
  box(H, [8, 3, 5.6], [-1.6, 3.2, -0.2], 0xb88b5d, {r: 0.7})
  box(H, [13.8, 0.3, 7.3], [0, 3.2, 0.2], 0x2f3236, {r: 0.6})
  box(H, [8.8, 0.3, 6.4], [-1.6, 6.2, -0.1], 0x2f3236, {r: 0.6})
  const glass = {r: 0.04, m: 0.85}
  box(H, [5.2, 2.2, 0.08], [-3.2, 0.45, 3.28], 0x86a9bd, glass)
  box(H, [2.4, 2.2, 0.08], [3.8, 0.45, 3.28], 0x86a9bd, glass)
  box(H, [4.2, 1.6, 0.08], [-1.6, 3.6, 2.66], 0x86a9bd, glass)
  box(H, [5.4, 0.08, 0.06], [-3.2, 2.7, 3.33], 0x2a2a2c)
  box(H, [1.1, 2.3, 0.1], [0.4, 0, 3.3], 0x7a4f2c, {r: 0.5})
  box(H, [0.08, 0.5, 0.12], [0.85, 1, 3.38], 0xcfd3d6, {m: 0.8, r: 0.3})
  // carport pergola + driveway
  box(scene, [5.5, 0.04, 9], [5.4, 0, 12.5], 0xbfb8aa, {r: 0.9, cast: false})
  box(scene, [4.4, 0.04, 14], [-3.6, 0, 11], 0xc9c3b6, {r: 0.9, cast: false})
  for (let i = 0; i < 6; i++) box(scene, [0.12, 0.14, 0.12], [-5.4 + i * 1.7, 0, 18.6], 0x8f8a7e)
  box(scene, [13.5, 0.7, 0.18], [0, 0, 18.4], 0xece8df, {r: 0.9})
  for (let i = -8; i < 9; i++) bush(scene, i * 1.7, 17.2, 0.55, i % 2 ? 0x3f8a3c : 0x4a9a45)
  // palms and bushes
  palm(scene, -8.5, 6, 8, 1)
  palm(scene, 9, 5, 7, 2)
  palm(scene, 6.5, 14, 9, 3)
  palm(scene, -9.5, 15, 6.5, 4)
  bush(scene, -6.5, 5.2, 0.9)
  bush(scene, 7.2, 4.8, 1.0)
  bush(scene, -2.5, 4.5, 0.6, 0x4a9a45)
  bush(scene, 2.8, 4.6, 0.6, 0x3f8a3c)
  // pool + deck behind the house (-z)
  box(scene, [11, 0.05, 8], [0, 0, -9], 0xd8d1c2, {r: 0.8, cast: false})
  const water = new THREE.Mesh(new THREE.BoxGeometry(7, 0.06, 3.6), new THREE.MeshStandardMaterial({color: 0x34c6d6, roughness: 0.05, metalness: 0.1, emissive: 0x0a6f86, emissiveIntensity: 0.55}))
  water.position.set(0, 0.07, -9)
  scene.add(water)
  box(scene, [7.5, 0.1, 0.25], [0, 0, -7.0], 0xf4f1ea, {cast: false})
  box(scene, [7.5, 0.1, 0.25], [0, 0, -11.0], 0xf4f1ea, {cast: false})
  // loungers + umbrella
  for (const i of [-1, 0, 1]) {
    const L = group(scene, -3.2 + i * 1.1, -12.4, 0.1)
    box(L, [0.65, 0.12, 1.9], [0, 0.18, 0], 0xf4f1ea, {r: 0.8})
    box(L, [0.65, 0.12, 0.7], [0, 0.4, -0.85], 0xf4f1ea, {rot: 0, r: 0.8})
  }
  cyl(scene, [0.04, 0.04, 2.4], [3.6, 0, -12.2], 0x3a2a1c)
  const um = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.6, 12), mat(0xe9d6a8, {r: 0.9}))
  um.position.set(3.6, 2.6, -12.2)
  um.castShadow = true
  scene.add(um)
  palm(scene, 8.5, -13, 8, 5)
  palm(scene, -8.5, -14, 7, 6)
  bush(scene, 6, -15.5, 1.1)
  // back wall (white) and a neighbor
  box(scene, [30, 2.4, 0.3], [0, 0, -17], 0xf1eee6)
  box(scene, [9, 7, 9], [26, 0, -3], 0xdcd6c8, {r: 0.9})
  box(scene, [9, 9, 9], [-28, 0, 4], 0xe6dfd0, {r: 0.9})
  return {
    cams: {
      front: {pos: [7.5, 1.9, 21.5], target: [-1.2, 2.5, 0], fov: 54},
      garden: {pos: [-4.8, 1.7, -15.2], target: [0.2, 2.0, -2], fov: 56},
      terrace: {pos: [-5.4, 1.5, -5.6], target: [3.2, 0.9, -11.8], fov: 60},
      dusk: {pos: [10.5, 1.7, -16], target: [-1, 2.6, 1], fov: 56},
    },
    panos: {garden: {pos: [0, 1.6, -9.2]}},
  }
}

function greatRoom(scene) {
  const W = 9.2, D = 6.4, Hh = 2.8
  skyDome(scene, {sun: SUN_DAY})
  lights(scene, {sunDir: [0.3, 0.55, 0.85], sunInt: 2.6, area: 8, env: 0.6, hemi: [0xdbeaff, 0xcaa77a, 0.8]})
  shell(scene, {w: W, d: D, h: Hh, windows: [
    {wall: 'S', pos: 1.2, width: 5.2, height: 2.0, sill: 0.25, view: 'garden'},
    {wall: 'E', pos: -0.6, width: 1.8, height: 1.4, sill: 0.9, view: 'garden'},
    {wall: 'N', pos: 2.9, width: 1.5, height: 1.1, sill: 1.2, view: 'garden'},
  ]})
  // living (east half)
  rug(scene, 2.0, 0.2, 3.4, 2.4)
  sofa(scene, 2.0, 1.4, Math.PI, 2.5)
  armchair(scene, 0.45, -0.3, Math.PI / 2 - 0.35)
  armchair(scene, 3.8, -0.6, -Math.PI / 2 + 0.3, 0x3f7f8c)
  coffeeTable(scene, 2.0, 0.1)
  tvUnit(scene, 2.0, -D / 2 + 0.25, 0, 2.2)
  plant(scene, 4.1, -2.5)
  plant(scene, 4.1, 2.7, 1.3)
  art(scene, [0.6, 1.3, -D / 2 + 0.03], 0, 1.0, 0.7)
  // dining (center-west)
  diningTable(scene, -1.6, 0.3, 0, 2.1, 6)
  pendant(scene, -1.6, 2.2, 0.3)
  pendant(scene, -2.15, 2.2, 0.3)
  pendant(scene, -1.05, 2.2, 0.3)
  // kitchen (west)
  kitchen(scene, -3.0, -D / 2 + 0.31, 0, 3.2)
  plant(scene, -4.1, 2.8, 1.1)
  // second light bounce
  const pl = new THREE.PointLight(0xffe2b0, 18, 9, 1.6)
  pl.position.set(-1.6, 2.3, 0.3)
  scene.add(pl)
  return {
    cams: {
      living: {pos: [-0.5, 1.45, 2.7], target: [2.9, 1.0, -1.2], fov: 74},
      kitchen: {pos: [1.0, 1.5, 2.2], target: [-3.2, 1.1, -1.6], fov: 68},
      dining: {pos: [3.9, 1.5, 2.4], target: [-2.4, 1.0, -0.6], fov: 72},
    },
    panos: {living: {pos: [0.4, 1.55, 1.0]}, kitchen: {pos: [-1.8, 1.55, 1.3]}},
  }
}

function bedroom(scene, {w = 4.6, d = 4.2, sea = false} = {}) {
  skyDome(scene, {sun: SUN_DAY})
  lights(scene, {sunDir: [-0.5, 0.55, 0.8], sunInt: 2.2, area: 6, env: 0.6, hemi: [0xdbeaff, 0xcaa77a, 0.85]})
  shell(scene, {w, d, h: 2.7, wall: 0xf0ebe2, windows: [{wall: 'S', pos: -0.6, width: 2.4, height: 1.5, sill: 0.8, view: sea ? 'sea' : 'garden'}, {wall: 'E', pos: 0.4, width: 1.2, height: 1.1, sill: 1.0, view: sea ? 'sea' : 'garden'}]})
  rug(scene, 0, -0.1, 2.8, 2.2, 0xd8cdb6)
  bed(scene, 0, -d / 2 + 1.25, 0, 1.8)
  nightstand(scene, -1.35, -d / 2 + 0.3)
  nightstand(scene, 1.35, -d / 2 + 0.3)
  art(scene, [0, 1.45, -d / 2 + 0.03], 0, 1.4, 0.8, [0x3f7f8c, 0xf3ece0, 0xe0a458, 0xc2543a])
  box(scene, [1.6, 2.1, 0.55], [-w / 2 + 0.3, 0, 1.1], 0xe9e5dc, {r: 0.5, rot: Math.PI / 2})
  armchair(scene, 1.6, 1.2, -2.3, 0x3f7f8c)
  plant(scene, -1.9, 1.7, 1.2)
  const pl = new THREE.PointLight(0xffe2b0, 10, 7, 1.6)
  pl.position.set(0, 2.2, 0.2)
  scene.add(pl)
  return {
    cams: {bed: {pos: [-0.6, 1.5, d / 2 - 0.35], target: [0.2, 0.7, -d / 2 + 0.4], fov: 74}},
    panos: {bedroom: {pos: [0, 1.5, 0.6]}},
  }
}

function condoLiving(scene) {
  const W = 8.6, D = 5.8, Hh = 2.7
  skyDome(scene, {sun: [-0.4, 0.6, 0.7]})
  lights(scene, {sunDir: [-0.2, 0.55, 0.9], sunInt: 2.3, area: 8, env: 0.7, hemi: [0xdff0ff, 0xd9c39c, 0.9]})
  const sh = shell(scene, {w: W, d: D, h: Hh, floor: 'tile', wall: 0xf4f0e8, windows: [{wall: 'S', pos: 0, width: 6.6, height: 2.35, sill: 0.15, view: 'sea'}]})
  void sh
  rug(scene, -1.5, 0.3, 3.6, 2.6, 0xc9bfa8)
  sofa(scene, -1.5, 1.45, Math.PI, 2.7, 0xe3ddd0)
  armchair(scene, -3.4, -0.2, Math.PI / 2 - 0.4, 0x2f6f7a)
  armchair(scene, 0.4, -0.2, -Math.PI / 2 + 0.4, 0x2f6f7a)
  coffeeTable(scene, -1.5, 0.15, 0, 1.2, 0.7)
  tvUnit(scene, -1.5, -D / 2 + 0.25, 0, 2.3)
  plant(scene, -3.9, 2.4, 1.4)
  art(scene, [-3.5, 1.35, -D / 2 + 0.03], 0, 1.1, 0.8, [0x2f6f7a, 0xf3ece0, 0xe0a458, 0xc2543a])
  diningTable(scene, 2.4, 0.2, Math.PI / 2, 1.9, 4)
  pendant(scene, 2.4, 2.2, 0.2)
  kitchen(scene, 3.1, -D / 2 + 0.31, 0, 2.4, false)
  const pl = new THREE.PointLight(0xffe2b0, 14, 9, 1.6)
  pl.position.set(0, 2.3, 0)
  scene.add(pl)
  return {
    cams: {
      living: {pos: [3.3, 1.45, 2.3], target: [-2.2, 1.0, -0.8], fov: 76},
      kitchen: {pos: [-0.5, 1.5, 2.3], target: [3.6, 1.0, -1.8], fov: 70},
    },
    panos: {living: {pos: [0.6, 1.55, 0.9]}},
  }
}

function balcony(scene) {
  // Eye level ~14 m above the beach: terrain sits far below the floor.
  const FL = -14
  skyDome(scene, {sun: [-0.5, 0.45, 0.7]})
  lights(scene, {sunDir: [-0.4, 0.6, 0.5], sunInt: 2.6, area: 20, env: 0.6})
  const B = group(scene, 0, 0)
  box(B, [7.2, 0.25, 3.0], [0, -0.25, 1.5], 0xcfc9bd, {r: 0.8})
  box(B, [7.2, 0.9, 0.05], [0, 0, 3.0], 0xbfe3ec, {t: true, o: 0.35, r: 0.05, cast: false})
  box(B, [7.2, 0.05, 0.08], [0, 0.9, 3.0], 0xcfd3d6, {m: 0.8, r: 0.3})
  box(B, [0.05, 0.9, 3.0], [-3.6, 0, 1.5], 0xbfe3ec, {t: true, o: 0.35, r: 0.05, cast: false})
  box(B, [0.05, 0.9, 3.0], [3.6, 0, 1.5], 0xbfe3ec, {t: true, o: 0.35, r: 0.05, cast: false})
  box(B, [7.2, 3.0, 0.3], [0, 0, 0], 0xf4f0e8, {r: 0.9})
  box(B, [7.2, 0.3, 3.4], [0, 2.7, 1.6], 0xe9e4d9, {r: 0.9})
  // furniture
  const t = group(B, 1.2, 1.4)
  cyl(t, [0.5, 0.5, 0.05], [0, 0.7, 0], 0xcaa87c, {r: 0.5})
  cyl(t, [0.04, 0.04, 0.7], [0, 0, 0], 0x2a2420)
  chair(B, 0.5, 1.2, -1.2, 0xe4dccb)
  chair(B, 1.9, 1.3, 1.9, 0xe4dccb)
  const lg = group(B, -2.0, 1.4, 0.2)
  box(lg, [0.7, 0.12, 1.9], [0, 0.22, 0], 0xf4f1ea, {r: 0.8})
  box(lg, [0.7, 0.12, 0.7], [0, 0.45, -0.85], 0xf4f1ea, {r: 0.8})
  plant(B, 3.1, 0.7, 1.5)
  // world below
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({color: 0xeadcb6, roughness: 1}))
  sand.rotation.x = -Math.PI / 2
  sand.position.set(0, FL, 40)
  sand.receiveShadow = true
  scene.add(sand)
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 800), new THREE.MeshStandardMaterial({color: 0x1fa6b8, roughness: 0.12, metalness: 0.25}))
  sea.rotation.x = -Math.PI / 2
  sea.position.set(0, FL + 0.2, 380)
  scene.add(sea)
  const shallow = new THREE.Mesh(new THREE.PlaneGeometry(1400, 40), new THREE.MeshStandardMaterial({color: 0x59d5cf, roughness: 0.1}))
  shallow.rotation.x = -Math.PI / 2
  shallow.position.set(0, FL + 0.25, 70)
  scene.add(shallow)
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(80, 22), new THREE.MeshStandardMaterial({color: 0x68a84a, roughness: 1}))
  lawn.rotation.x = -Math.PI / 2
  lawn.position.set(0, FL + 0.02, 14)
  lawn.receiveShadow = true
  scene.add(lawn)
  // pool below
  const deck = box(scene, [20, 0.05, 11], [4, FL, 15], 0xe0d8c8, {cast: false})
  void deck
  const water = new THREE.Mesh(new THREE.BoxGeometry(14, 0.06, 6), new THREE.MeshStandardMaterial({color: 0x34c6d6, roughness: 0.05, emissive: 0x0a6f86, emissiveIntensity: 0.6}))
  water.position.set(4, FL + 0.1, 15)
  scene.add(water)
  for (let i = 0; i < 9; i++) palm(scene, -22 + i * 8 + (i % 3), 6 + (i % 2) * 4, 12 + (i % 3) * 1.5, i).position.y = FL
  for (let i = 0; i < 8; i++) {
    const um = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.45, 10), mat(i % 2 ? 0xf1ece0 : 0xe2a94f, {r: 0.9}))
    um.position.set(-6 + i * 2.6, FL + 2.1, 24 + (i % 2))
    scene.add(um)
    cyl(scene, [0.03, 0.03, 2.1], [-6 + i * 2.6, FL, 24 + (i % 2)], 0x3a2a1c)
  }
  // neighbouring towers along the bay
  box(scene, [18, 40, 14], [-70, FL, 20], 0xe9e3d4, {r: 0.9})
  box(scene, [14, 28, 12], [80, FL, 30], 0xdcd4c2, {r: 0.9})
  return {
    cams: {
      view: {pos: [0.2, 1.6, 0.9], target: [1.5, -1.2, 40], fov: 66},
      pool: {pos: [-1.5, 1.5, 0.8], target: [4.5, -7.5, 18], fov: 56},
    },
    panos: {balcony: {pos: [0.4, 1.6, 1.3]}},
  }
}

function condoExterior(scene) {
  skyDome(scene, {sun: [0.5, 0.55, 0.65]})
  lights(scene, {sunDir: [0.5, 0.6, 0.6], sunInt: 2.9, area: 60, env: 0.55, shadow: 4096})
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({color: 0xeadcb6, roughness: 1}))
  sand.rotation.x = -Math.PI / 2
  sand.receiveShadow = true
  scene.add(sand)
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 700), new THREE.MeshStandardMaterial({color: 0x1fa6b8, roughness: 0.12, metalness: 0.25}))
  sea.rotation.x = -Math.PI / 2
  sea.position.set(0, 0.2, 420)
  scene.add(sea)
  const shallow = new THREE.Mesh(new THREE.PlaneGeometry(1400, 36), new THREE.MeshStandardMaterial({color: 0x59d5cf, roughness: 0.1}))
  shallow.rotation.x = -Math.PI / 2
  shallow.position.set(0, 0.25, 90)
  scene.add(shallow)
  // tower, facing the sea (+z); camera stands on the beach
  const T = group(scene, 0, -34)
  box(T, [26, 33, 14], [0, 0, 0], 0xf3efe6, {r: 0.85})
  for (let f = 0; f < 10; f++) {
    for (let c = 0; c < 6; c++) {
      const bx = -10.5 + c * 4.2
      box(T, [3.6, 0.28, 2.2], [bx, 3.3 * f + 3.1, 8.0], 0xe4ded0, {r: 0.8})
      box(T, [3.6, 1.0, 0.06], [bx, 3.3 * f + 3.4, 9.1], 0xbfe3ec, {t: true, o: 0.4, r: 0.05, cast: false})
      box(T, [3.2, 2.2, 0.08], [bx, 3.3 * f + 0.55, 7.04], 0x86a9bd, {r: 0.04, m: 0.85})
    }
  }
  box(T, [26.4, 1.2, 14.4], [0, 33, 0], 0x2f3236, {r: 0.6})
  box(T, [26, 4.2, 15], [0, 0, 0], 0xd8cfbc, {r: 0.9})
  // pool deck in front
  box(scene, [34, 0.1, 18], [0, 0, -12], 0xe0d8c8, {r: 0.8, cast: false})
  const water = new THREE.Mesh(new THREE.BoxGeometry(16, 0.1, 7), new THREE.MeshStandardMaterial({color: 0x34c6d6, roughness: 0.05, emissive: 0x0a6f86, emissiveIntensity: 0.6}))
  water.position.set(2, 0.12, -11)
  scene.add(water)
  for (let i = 0; i < 12; i++) palm(scene, -26 + i * 5 + (i % 3), -6 + (i % 2) * 5, 8 + (i % 3), i)
  for (let i = 0; i < 6; i++) {
    const um = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.45, 10), mat(i % 2 ? 0xf1ece0 : 0xe2a94f, {r: 0.9}))
    um.position.set(-9 + i * 3, 2.1, -18)
    scene.add(um)
    cyl(scene, [0.03, 0.03, 2.1], [-9 + i * 3, 0, -18], 0x3a2a1c)
  }
  return {cams: {tower: {pos: [34, 2.0, 38], target: [-2, 14, -34], fov: 58}, pool: {pos: [-14, 1.7, 8], target: [4, 1.2, -20], fov: 62}}, panos: {}}
}

function land(scene, time = 'day') {
  const dusk = time === 'dusk'
  skyDome(scene, dusk ? {top: 0x2d4a8a, mid: 0xe8946c, bottom: 0xf7cc95, sun: [-0.7, 0.1, 0.7], glow: 0xffa050} : {sun: [-0.3, 0.62, 0.7]})
  lights(scene, {sunDir: dusk ? [-0.8, 0.18, 0.55] : [-0.3, 0.62, 0.7], sunColor: dusk ? 0xffa468 : 0xfff0d8, sunInt: dusk ? 2.4 : 2.8, area: 50, env: 0.5, shadow: 4096})
  const gt = grassTex('#7fb257', '#6a9f48')
  gt.repeat.set(70, 26)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 330), new THREE.MeshStandardMaterial({map: gt, roughness: 1}))
  ground.rotation.x = -Math.PI / 2
  ground.position.z = -10
  ground.receiveShadow = true
  scene.add(ground)
  // the plot: slightly lighter, mown
  const pt = grassTex('#8cbf62', '#78ad52')
  pt.repeat.set(9, 10)
  const plot = new THREE.Mesh(new THREE.PlaneGeometry(20, 22.5), new THREE.MeshStandardMaterial({map: pt, roughness: 1}))
  plot.rotation.x = -Math.PI / 2
  plot.position.y = 0.02
  plot.receiveShadow = true
  scene.add(plot)
  // road (front, +z) with curb and sidewalk
  box(scene, [260, 0.06, 7.5], [0, 0, 19.5], 0x4a4d52, {r: 0.95, cast: false})
  box(scene, [260, 0.16, 1.8], [0, 0, 14.6], 0xd0cbc0, {r: 0.9, cast: false})
  for (let i = -12; i < 12; i++) box(scene, [2, 0.01, 0.16], [i * 5.2, 0.07, 19.5], 0xe9e4d2, {cast: false})
  // boundary stakes with string
  const corners = [[-10, -11.25], [10, -11.25], [10, 11.25], [-10, 11.25]]
  corners.forEach(([x, z], i) => {
    cyl(scene, [0.06, 0.06, 1.5], [x, 0, z], 0xf1ede2)
    cyl(scene, [0.065, 0.065, 0.35], [x, 1.15, z], 0xd1432e)
    const [nx, nz] = corners[(i + 1) % 4]
    const len = Math.hypot(nx - x, nz - z)
    const line = new THREE.Mesh(new THREE.BoxGeometry(len, 0.015, 0.015), mat(0xff9d2e, {cast: false}))
    line.position.set((x + nx) / 2, 0.5, (z + nz) / 2)
    line.rotation.y = -Math.atan2(nz - z, nx - x)
    scene.add(line)
  })
  // a "for sale" sign
  box(scene, [0.1, 2.2, 0.1], [-6.8, 0, 12.4], 0x4a3a2a)
  box(scene, [2.2, 1.2, 0.06], [-6.8, 1.6, 12.46], 0xf4f1ea, {r: 0.6})
  box(scene, [1.8, 0.3, 0.02], [-6.8, 2.05, 12.5], 0x3a2a00, {r: 0.6, cast: false})
  box(scene, [1.8, 0.2, 0.02], [-6.8, 1.7, 12.5], 0x0b6e66, {r: 0.6, cast: false})
  // vegetation
  const spots = [[-12, -5], [-13, 6], [12.5, -8], [13, 3], [-4, -15], [6, -16], [-16, -12], [16, 10], [-15, 12], [0, -20], [22, -4], [-24, 0]]
  spots.forEach(([x, z], i) => palm(scene, x, z, 7 + (i % 4), i))
  for (let i = 0; i < 14; i++) bush(scene, -24 + i * 3.7, -17 - (i % 3) * 2, 0.9 + (i % 3) * 0.3, i % 2 ? 0x3f8a3c : 0x4a9a45)
  // neighbours and the sea behind
  box(scene, [10, 6, 10], [-32, 0, 4], 0xe6dfd0, {r: 0.9})
  box(scene, [12, 8, 9], [34, 0, -2], 0xdcd4c2, {r: 0.9})
  box(scene, [3, 2.4, 22], [-12.6, 0, 0], 0xf1eee6)
  // beach and sea well behind the plot (the plot sits around z = 0)
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(1400, 26), new THREE.MeshStandardMaterial({color: 0xeadcb6, roughness: 1}))
  beach.rotation.x = -Math.PI / 2
  beach.position.set(0, 0.04, -168)
  scene.add(beach)
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 700), new THREE.MeshStandardMaterial({color: dusk ? 0x2e6f8f : 0x1fa6b8, roughness: 0.12, metalness: 0.25}))
  sea.rotation.x = -Math.PI / 2
  sea.position.set(0, 0.08, -530)
  scene.add(sea)
  return {
    cams: {
      overviewA: {pos: [18, 1.7, 17], target: [-2, 0.8, -4], fov: 62},
      overviewB: {pos: [-17, 1.7, 15], target: [3, 0.8, -4], fov: 62},
      road: {pos: [2, 1.6, 27], target: [0, 1.4, 0], fov: 56},
      elevated: {pos: [26, 17, 34], target: [0, 0, -4], fov: 50},
      sunset: {pos: [14, 1.6, 16], target: [-10, 3.2, -9], fov: 64, scene: 'dusk'},
      boundary: {pos: [8.5, 1.6, 9.5], target: [-8, 0.9, -9.5], fov: 58},
    },
    panos: {center: {pos: [0, 1.6, 0]}, street: {pos: [0, 1.6, 15.4]}},
  }
}

/* ------------------------------------------------------------------- registry */
const WORLDS = {
  houseExt: (s) => houseExterior(s),
  houseExtDusk: (s) => houseExterior(s, 'dusk'),
  greatRoom: (s) => greatRoom(s),
  houseBedroom: (s) => bedroom(s, {w: 4.6, d: 4.2}),
  condoLiving: (s) => condoLiving(s),
  condoBedroom: (s) => bedroom(s, {w: 4.2, d: 3.9, sea: true}),
  balcony: (s) => balcony(s),
  condoExt: (s) => condoExterior(s),
  land: (s) => land(s),
  landDusk: (s) => land(s, 'dusk'),
}

// name -> [world, camera or pano name]
export const SHOTS = {
  'casa-front': ['houseExt', 'front'],
  'casa-garden': ['houseExt', 'garden'],
  'casa-living': ['greatRoom', 'living'],
  'casa-kitchen': ['greatRoom', 'kitchen'],
  'casa-bedroom': ['houseBedroom', 'bed'],
  'casa-terrace': ['houseExt', 'terrace'],
  'condo-tower': ['condoExt', 'tower'],
  'condo-living': ['condoLiving', 'living'],
  'condo-kitchen': ['condoLiving', 'kitchen'],
  'condo-bedroom': ['condoBedroom', 'bed'],
  'condo-view': ['balcony', 'view'],
  'condo-pool': ['condoExt', 'pool'],
  'land-a': ['land', 'overviewA'],
  'land-b': ['land', 'overviewB'],
  'land-road': ['land', 'road'],
  'land-elevated': ['land', 'elevated'],
  'land-sunset': ['landDusk', 'sunset'],
  'land-boundary': ['land', 'boundary'],
}
export const PANOS = {
  'casa-living': ['greatRoom', 'living'],
  'casa-kitchen': ['greatRoom', 'kitchen'],
  'casa-garden': ['houseExt', 'garden'],
  'condo-living': ['condoLiving', 'living'],
  'condo-bedroom': ['condoBedroom', 'bedroom'],
  'condo-balcony': ['balcony', 'balcony'],
  'land-center': ['land', 'center'],
  'land-street': ['land', 'street'],
}

function build(worldName) {
  const scene = new THREE.Scene()
  const info = WORLDS[worldName](scene)
  return {scene, info}
}

window.listShots = () => Object.keys(SHOTS)
window.listPanos = () => Object.keys(PANOS)

window.renderShot = (name, w = 2400, h = 1600) => {
  const [world, camName] = SHOTS[name]
  const {scene, info} = build(world)
  const c = info.cams[camName]
  renderer.setPixelRatio(1)
  renderer.setSize(w, h, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  const cam = new THREE.PerspectiveCamera(c.fov, w / h, 0.05, 2000)
  cam.position.set(...c.pos)
  cam.lookAt(v(c.target))
  renderer.render(scene, cam)
  return canvas.toDataURL('image/jpeg', 0.9)
}

window.renderPano = (name, W = 4096) => {
  const [world, key] = PANOS[name]
  const {scene, info} = build(world)
  const p = info.panos[key].pos
  const size = 2048
  const rt = new THREE.WebGLCubeRenderTarget(size, {type: THREE.HalfFloatType, generateMipmaps: false})
  const cc = new THREE.CubeCamera(0.05, 2000, rt)
  cc.position.set(...p)
  scene.add(cc)
  renderer.toneMapping = THREE.NoToneMapping
  cc.update(renderer, scene)
  // equirect pass (+ ACES tone map and sRGB encode, which do not apply to render targets)
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: {tCube: {value: rt.texture}},
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform samplerCube tCube;
        vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
        void main(){ float lon = (vUv.x - 0.5) * 6.2831853; float lat = (vUv.y - 0.5) * 3.14159265;
          vec3 dir = vec3(sin(lon)*cos(lat), sin(lat), -cos(lon)*cos(lat));
          vec3 c = textureCube(tCube, dir).rgb * 1.05; c = aces(c); c = pow(c, vec3(1.0/2.2)); gl_FragColor = vec4(c, 1.0); }`,
      depthTest: false,
    }),
  )
  const s2 = new THREE.Scene()
  s2.add(quad)
  renderer.setPixelRatio(1)
  renderer.setSize(W, W / 2, false)
  renderer.render(s2, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1))
  const url = canvas.toDataURL('image/jpeg', 0.9)
  rt.dispose()
  return url
}

window.ready = true
