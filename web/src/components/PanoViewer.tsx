'use client'

import {useCallback, useEffect, useId, useRef, useState} from 'react'
import type {Locale} from '@/i18n/config'
import {getDictionary, loc} from '@/i18n/dictionary'
import {assetUrl} from '@/sanity/image'
import type {TourData} from '@/sanity/types'

/**
 * 360° panorama viewer. Plain WebGL, no dependencies, loaded only when a visitor starts a tour.
 *  - Touch: drag to look, pinch to zoom.   - Mouse: drag, wheel to zoom.
 *  - Keyboard: arrows turn, +/- zoom, Home resets; room arrows are real buttons you can Tab to.
 *  - Renders only when something changes (no idle GPU or battery use).
 */

const RAD = Math.PI / 180
const FOV_MIN = 35
const FOV_MAX = 110
const FOV_DEFAULT = 75
const FOV_PORTRAIT = 100 // tall phone screens need a wider vertical angle to show enough of the room

type Mat = Float32Array
const perspective = (fovY: number, aspect: number, near: number, far: number): Mat => {
  const f = 1 / Math.tan(fovY / 2)
  const nf = 1 / (near - far)
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}
const mul = (a: Mat, b: Mat): Mat => {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
  return o
}
// Camera basis for a yaw/pitch (yaw 0 faces -Z, positive yaw turns right; matches the panorama generator).
function basis(yaw: number, pitch: number) {
  const cp = Math.cos(pitch)
  const f = [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]
  const r = [Math.cos(yaw), 0, Math.sin(yaw)]
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
  return {f, r, u}
}
const viewMatrix = ({f, r, u}: ReturnType<typeof basis>): Mat =>
  new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, 0, 0, 0, 1])

function sphere(lonSeg = 56, latSeg = 28) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= latSeg; j++) {
    const v = j / latSeg
    const lat = (0.5 - v) * Math.PI
    for (let i = 0; i <= lonSeg; i++) {
      const u = i / lonSeg
      const lon = (u - 0.5) * Math.PI * 2
      pos.push(10 * Math.sin(lon) * Math.cos(lat), 10 * Math.sin(lat), -10 * Math.cos(lon) * Math.cos(lat))
      uv.push(u, 1 - v)
    }
  }
  for (let j = 0; j < latSeg; j++)
    for (let i = 0; i < lonSeg; i++) {
      const a = j * (lonSeg + 1) + i
      const b = a + lonSeg + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  return {pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint16Array(idx)}
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image'))
    img.src = url
  })

type Props = {tour: TourData; locale: Locale; title: string; onClose: () => void; onBook: () => void; bookLabel: string}

export default function PanoViewer({tour, locale, title, onClose, onBook, bookLabel}: Props) {
  const t = getDictionary(locale)
  const helpId = useId()
  const scenes = tour.scenes
  const startId = scenes.find((s) => s.id === tour.start)?.id ?? scenes[0].id
  const [currentId, setCurrentId] = useState(startId)
  const current = scenes.find((s) => s.id === currentId) ?? scenes[0]
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<'gl' | 'image' | null>(null)
  const [hint, setHint] = useState(true)
  const [flash, setFlash] = useState(0)

  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const hotspotRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const gl = useRef<{draw: () => void; setTexture: (img: HTMLImageElement) => void; ok: boolean} | null>(null)
  const view = useRef({yaw: 0, pitch: 0, fov: FOV_DEFAULT, vy: 0, vp: 0})
  const dirty = useRef(true)
  const linksRef = useRef(current.links)
  useEffect(() => {
    linksRef.current = current.links
    dirty.current = true // reposition the arrows for the new room
  }, [current.links])

  const invalidate = useCallback(() => { dirty.current = true }, [])
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ---- WebGL setup, render loop and input: once ---- */
  useEffect(() => {
    const cv = canvas.current
    const st = stage.current
    if (!cv || !st) return
    const ctx = cv.getContext('webgl', {antialias: false, alpha: false, powerPreference: 'low-power'}) as WebGLRenderingContext | null
    if (!ctx) { setFailed('gl'); return }
    const g = ctx
    const prog = g.createProgram()
    const compile = (type: number, src: string) => { const s = g.createShader(type)!; g.shaderSource(s, src); g.compileShader(s); g.attachShader(prog, s) }
    compile(g.VERTEX_SHADER, 'attribute vec3 p; attribute vec2 t; uniform mat4 m; varying vec2 v; void main(){ v = t; gl_Position = m * vec4(p, 1.0); }')
    compile(g.FRAGMENT_SHADER, 'precision mediump float; varying vec2 v; uniform sampler2D s; void main(){ gl_FragColor = texture2D(s, v); }')
    g.linkProgram(prog)
    g.useProgram(prog)
    const geo = sphere()
    const buf = (data: BufferSource, target: number) => { const b = g.createBuffer(); g.bindBuffer(target, b); g.bufferData(target, data, g.STATIC_DRAW); return b }
    buf(geo.pos, g.ARRAY_BUFFER)
    const lp = g.getAttribLocation(prog, 'p'); g.enableVertexAttribArray(lp); g.vertexAttribPointer(lp, 3, g.FLOAT, false, 0, 0)
    buf(geo.uv, g.ARRAY_BUFFER)
    const lt = g.getAttribLocation(prog, 't'); g.enableVertexAttribArray(lt); g.vertexAttribPointer(lt, 2, g.FLOAT, false, 0, 0)
    buf(geo.idx, g.ELEMENT_ARRAY_BUFFER)
    const um = g.getUniformLocation(prog, 'm')
    g.disable(g.DEPTH_TEST)
    g.disable(g.CULL_FACE)
    const tex = g.createTexture()
    g.bindTexture(g.TEXTURE_2D, tex)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE)
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true)

    let hasTexture = false
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(st.clientWidth * dpr))
      const h = Math.max(1, Math.round(st.clientHeight * dpr))
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
    }
    const draw = () => {
      size()
      const {yaw, pitch, fov} = view.current
      const aspect = cv.width / cv.height
      const b = basis(yaw, pitch)
      g.viewport(0, 0, cv.width, cv.height)
      if (hasTexture) {
        g.uniformMatrix4fv(um, false, mul(perspective(fov * RAD, aspect, 0.1, 100), viewMatrix(b)))
        g.drawElements(g.TRIANGLES, geo.idx.length, g.UNSIGNED_SHORT, 0)
      }
      // place the room arrows over the picture
      const tanY = Math.tan((fov * RAD) / 2)
      const w = st.clientWidth, h = st.clientHeight
      for (const l of linksRef.current) {
        const el = hotspotRefs.current[l.to]
        if (!el) continue
        const lp2 = (l.pitch ?? -6) * RAD, ly = l.yaw * RAD
        const d = [Math.sin(ly) * Math.cos(lp2), Math.sin(lp2), -Math.cos(ly) * Math.cos(lp2)]
        const z = d[0] * b.f[0] + d[1] * b.f[1] + d[2] * b.f[2]
        const x = d[0] * b.r[0] + d[1] * b.r[1] + d[2] * b.r[2]
        const y = d[0] * b.u[0] + d[1] * b.u[1] + d[2] * b.u[2]
        if (z <= 0.05) { el.style.visibility = 'hidden'; continue }
        const nx = x / (z * tanY * (w / h)), ny = y / (z * tanY)
        const hidden = Math.abs(nx) > 1.08 || Math.abs(ny) > 1.08
        el.style.visibility = hidden ? 'hidden' : 'visible'
        el.style.transform = `translate(${((nx * 0.5 + 0.5) * w).toFixed(1)}px, ${((0.5 - ny * 0.5) * h).toFixed(1)}px) translate(-50%, -50%)`
      }
    }
    gl.current = {
      ok: true,
      draw,
      setTexture: (img) => {
        g.bindTexture(g.TEXTURE_2D, tex)
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, img)
        hasTexture = true
        dirty.current = true
      },
    }

    let raf = 0
    const tick = () => {
      const v = view.current
      // inertia after a drag
      if (Math.abs(v.vy) > 1e-5 || Math.abs(v.vp) > 1e-5) {
        v.yaw += v.vy; v.pitch = Math.max(-85 * RAD, Math.min(85 * RAD, v.pitch + v.vp)); v.vy *= 0.92; v.vp *= 0.92; dirty.current = true
      }
      if (dirty.current) { dirty.current = false; draw() }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    /* pointer input: one finger/mouse drags, two fingers pinch */
    const pts = new Map<number, {x: number; y: number}>()
    let last = {x: 0, y: 0, t: 0}
    let pinch = 0
    const perPixel = () => (view.current.fov * RAD) / st.clientHeight
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      st.setPointerCapture(e.pointerId)
      pts.set(e.pointerId, {x: e.clientX, y: e.clientY})
      view.current.vy = view.current.vp = 0
      last = {x: e.clientX, y: e.clientY, t: performance.now()}
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y) }
      setHint(false)
    }
    const onMove = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return
      pts.set(e.pointerId, {x: e.clientX, y: e.clientY})
      const v = view.current
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch) v.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, v.fov * (pinch / d)))
        pinch = d
      } else {
        const dx = e.clientX - last.x, dy = e.clientY - last.y
        const k = perPixel()
        v.yaw -= dx * k
        v.pitch = Math.max(-85 * RAD, Math.min(85 * RAD, v.pitch + dy * k))
        // velocity per frame, from a sensible time slice and capped so a flick never spins away
        const dt = Math.max(10, performance.now() - last.t)
        const cap = 0.1
        v.vy = reduceMotion() ? 0 : Math.max(-cap, Math.min(cap, (-dx * k * 16) / dt))
        v.vp = reduceMotion() ? 0 : Math.max(-cap, Math.min(cap, (dy * k * 16) / dt))
        last = {x: e.clientX, y: e.clientY, t: performance.now()}
      }
      dirty.current = true
    }
    const onUp = (e: PointerEvent) => { pts.delete(e.pointerId); pinch = 0; if (performance.now() - last.t > 80) view.current.vy = view.current.vp = 0 }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = view.current
      v.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, v.fov * (1 + Math.sign(e.deltaY) * 0.06)))
      dirty.current = true
    }
    st.addEventListener('pointerdown', onDown)
    st.addEventListener('pointermove', onMove)
    st.addEventListener('pointerup', onUp)
    st.addEventListener('pointercancel', onUp)
    st.addEventListener('wheel', onWheel, {passive: false})
    const ro = new ResizeObserver(() => { dirty.current = true })
    ro.observe(st)
    const onLost = (e: Event) => { e.preventDefault(); setFailed('gl') }
    cv.addEventListener('webglcontextlost', onLost)

    return () => {
      cancelAnimationFrame(raf)
      st.removeEventListener('pointerdown', onDown)
      st.removeEventListener('pointermove', onMove)
      st.removeEventListener('pointerup', onUp)
      st.removeEventListener('pointercancel', onUp)
      st.removeEventListener('wheel', onWheel)
      cv.removeEventListener('webglcontextlost', onLost)
      ro.disconnect()
      g.deleteTexture(tex)
      g.getExtension('WEBGL_lose_context')?.loseContext()
      gl.current = null
    }
  }, [])

  /* ---- load the current room: a small preview first, then the sharp one ---- */
  useEffect(() => {
    let cancelled = false
    const v = view.current
    v.yaw = (current.initialYaw ?? 0) * RAD
    v.pitch = 0
    v.fov = (stage.current?.clientWidth ?? 1) / (stage.current?.clientHeight ?? 1) < 0.8 ? FOV_PORTRAIT : FOV_DEFAULT
    v.vy = v.vp = 0
    const base = assetUrl(current.image)
    const wide = Math.min(4096, window.innerWidth < 720 ? 2560 : 4096)
    ;(async () => {
      try {
        const small = await loadImage(`${base}?w=1024&q=70&auto=format`)
        if (cancelled) return
        gl.current?.setTexture(small)
        setLoading(false)
        setFlash((n) => n + 1)
        const big = await loadImage(`${base}?w=${wide}&q=80&auto=format`)
        if (cancelled) return
        gl.current?.setTexture(big)
        // warm the rooms this one links to
        for (const l of current.links) {
          const next = scenes.find((s) => s.id === l.to)
          if (next) void loadImage(`${assetUrl(next.image)}?w=1024&q=70&auto=format`).catch(() => {})
        }
      } catch {
        if (!cancelled) { setFailed('image'); setLoading(false) }
      }
    })()
    invalidate()
    return () => { cancelled = true }
  }, [current, scenes, invalidate])

  /* ---- keyboard on the viewer itself (the room arrows are ordinary buttons) ---- */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    const v = view.current
    v.vy = v.vp = 0
    const step = (e.shiftKey ? 15 : 6) * RAD
    if (e.key === 'ArrowLeft') v.yaw -= step
    else if (e.key === 'ArrowRight') v.yaw += step
    else if (e.key === 'ArrowUp') v.pitch = Math.min(85 * RAD, v.pitch + step)
    else if (e.key === 'ArrowDown') v.pitch = Math.max(-85 * RAD, v.pitch - step)
    else if (e.key === '+' || e.key === '=') v.fov = Math.max(FOV_MIN, v.fov - 6)
    else if (e.key === '-' || e.key === '_') v.fov = Math.min(FOV_MAX, v.fov + 6)
    else if (e.key === 'Home') { v.yaw = (current.initialYaw ?? 0) * RAD; v.pitch = 0; v.fov = (stage.current?.clientWidth ?? 1) / (stage.current?.clientHeight ?? 1) < 0.8 ? FOV_PORTRAIT : FOV_DEFAULT }
    else return
    e.preventDefault()
    setHint(false)
    invalidate()
  }
  // Rooms change from the arrows, the room chips and nowhere else, so loading starts here.
  const goTo = (id: string) => {
    setLoading(true)
    setFailed((f) => (f === 'gl' ? f : null))
    setCurrentId(id)
  }
  const zoom = (d: number) => { view.current.vy = view.current.vp = 0; view.current.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, view.current.fov + d)); invalidate() }

  return (
    <div className="tour">
      <div className="tour-bar">
        <div className="tour-title">
          <span className="tour-kicker">{t.tour}</span>
          <strong>{title}</strong>
        </div>
        <button type="button" className="tour-close" onClick={onClose}>{t.tourClose}</button>
      </div>

      <div
        ref={stage}
        className="tour-stage"
        tabIndex={0}
        role="group"
        aria-roledescription="360° panorama"
        aria-label={t.tourNow(loc(current.title, locale))}
        aria-describedby={helpId}
        onKeyDown={onKeyDown}
      >
        <canvas ref={canvas} aria-hidden="true" />
        {flash > 0 && <div key={flash} className="tour-flash" aria-hidden="true" />}
        {current.links.map((l) => {
          const target = scenes.find((s) => s.id === l.to)
          const name = loc(l.label, locale) || loc(target?.title, locale)
          return (
            <button
              key={`${current.id}-${l.to}`}
              ref={(el) => { hotspotRefs.current[l.to] = el }}
              type="button"
              className="tour-hotspot"
              aria-label={t.tourGo(name)}
              onClick={() => goTo(l.to)}
            >
              <span className="tour-arrow" aria-hidden="true">↑</span>
              <span className="tour-hot-label">{name}</span>
            </button>
          )
        })}
        {loading && <div className="tour-status" role="status">{t.tourLoading}</div>}
        {failed === 'gl' && <div className="tour-status" role="alert">{t.tourNoGl}</div>}
        {failed === 'image' && <div className="tour-status" role="alert">{t.tourNoGl}</div>}
        {hint && !loading && !failed && <div className="tour-hint" aria-hidden="true">{t.tourDrag}</div>}
        <div className="tour-zoom">
          <button type="button" aria-label={t.tourZoomIn} onClick={() => zoom(-8)}>+</button>
          <button type="button" aria-label={t.tourZoomOut} onClick={() => zoom(8)}>−</button>
        </div>
        <span id={helpId} className="sr-only">{t.tourHelp}</span>
        <span className="sr-only" role="status" aria-live="polite">{t.tourNow(loc(current.title, locale))}</span>
      </div>

      <div className="tour-foot">
        <nav className="tour-rooms" aria-label={t.tourRoomList}>
          {scenes.map((s) => (
            <button key={s.id} type="button" className="tour-room" aria-current={s.id === current.id ? 'true' : undefined} onClick={() => goTo(s.id)}>
              {loc(s.title, locale)}
            </button>
          ))}
        </nav>
        <div className="tour-actions">
          {tour.externalUrl && <a className="tour-ext" href={tour.externalUrl} target="_blank" rel="noopener noreferrer">{t.tourExternal} ↗</a>}
          <button type="button" className="tour-book" onClick={onBook}>{bookLabel}</button>
        </div>
      </div>
    </div>
  )
}
