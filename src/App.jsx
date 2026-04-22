import React, { useEffect, useRef, useState, useCallback } from 'react'

// ─── Config ────────────────────────────────────────────────────────────────
const NAMESPACE_CONFIGS = [
  { name: 'default',       color: '#00d4ff', glowColor: '#00d4ff44', size: 54, orbitRadius: 200, speed: 0.00018 },
  { name: 'kube-system',   color: '#ff6b35', glowColor: '#ff6b3544', size: 46, orbitRadius: 320, speed: 0.00012 },
  { name: 'monitoring',    color: '#a855f7', glowColor: '#a855f744', size: 40, orbitRadius: 440, speed: 0.00009 },
  { name: 'ingress-nginx', color: '#22d3ee', glowColor: '#22d3ee44', size: 36, orbitRadius: 550, speed: 0.00007 },
  //{ name: 'production',    color: '#f59e0b', glowColor: '#f59e0b44', size: 50, orbitRadius: 660, speed: 0.00006 },
  //{ name: 'Tashkent',    color: '#f59e0b', glowColor: '#f59e0b44', size: 50, orbitRadius: 660, speed: 0.00006 },
]

const POD_STATES = ['Running', 'Running', 'Running', 'Pending', 'CrashLoopBackOff']

const INITIAL_PODS = {
  'default':       4,
  'kube-system':   6,
  'monitoring':    3,
  'ingress-nginx': 2,
  //'production':    5,
  //'Tashkent': 8,
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function randomBetween(a, b) { return a + Math.random() * (b - a) }
function lerp(a, b, t) { return a + (b - a) * t }

function createPods(count, nsConfig) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${nsConfig.name}-pod-${i}-${Date.now()}`,
    orbitAngle: (i / count) * Math.PI * 2 + randomBetween(0, 0.3),
    orbitRadius: nsConfig.size + 22 + randomBetween(0, 18),
    orbitSpeed: randomBetween(0.0006, 0.0014) * (Math.random() > 0.5 ? 1 : -1),
    size: randomBetween(4, 7),
    state: POD_STATES[Math.floor(Math.random() * POD_STATES.length)],
    born: Date.now(),
    dying: false,
    opacity: 0,
  }))
}

// ─── StarField Canvas ────────────────────────────────────────────────────────
function StarField() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: randomBetween(0.3, 1.6),
      alpha: randomBetween(0.2, 1),
      twinkleSpeed: randomBetween(0.003, 0.012),
      twinkleDir: 1,
    }))
    let raf
    function draw(t) {
      ctx.clearRect(0, 0, w, h)
      stars.forEach(s => {
        s.alpha += s.twinkleSpeed * s.twinkleDir
        if (s.alpha > 1 || s.alpha < 0.1) s.twinkleDir *= -1
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw(0)
    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />
}

// ─── Nebula Canvas ────────────────────────────────────────────────────────
function Nebula() {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{
        position:'absolute', width:'700px', height:'700px',
        borderRadius:'50%', left:'5%', top:'10%',
        background:'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
        filter:'blur(40px)',
      }}/>
      <div style={{
        position:'absolute', width:'500px', height:'500px',
        borderRadius:'50%', right:'10%', bottom:'15%',
        background:'radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)',
        filter:'blur(30px)',
      }}/>
      <div style={{
        position:'absolute', width:'400px', height:'400px',
        borderRadius:'50%', left:'40%', bottom:'5%',
        background:'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
        filter:'blur(25px)',
      }}/>
    </div>
  )
}

// ─── Main Galaxy Canvas ──────────────────────────────────────────────────
function GalaxyCanvas({ namespaces, selected, onSelectNs }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ namespaces, selected })
  const animRef = useRef(null)
  const anglesRef = useRef(Object.fromEntries(NAMESPACE_CONFIGS.map((n, i) => [n.name, (i / NAMESPACE_CONFIGS.length) * Math.PI * 2])))
  const lastTRef = useRef(null)

  useEffect(() => { stateRef.current = { namespaces, selected } }, [namespaces, selected])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w, h, cx, cy

    function resize() {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
      cx = w / 2; cy = h / 2
    }
    resize()
    window.addEventListener('resize', resize)

    function drawGlow(x, y, radius, color, alpha = 1) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
      g.addColorStop(0, color.replace('44', Math.floor(alpha * 180).toString(16).padStart(2,'0')))
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    function drawOrbitRing(x, y, r, color) {
      ctx.save()
      ctx.strokeStyle = color + '22'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 8])
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    function drawPlanet(x, y, nsConf, isSelected, angle) {
      const { color, glowColor, size, name } = nsConf

      // Outer glow
      drawGlow(x, y, size * 2.5, glowColor, isSelected ? 1 : 0.6)

      // Planet body
      const grad = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size)
      grad.addColorStop(0, color + 'ff')
      grad.addColorStop(0.6, color + 'aa')
      grad.addColorStop(1, color + '33')
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Ring for selected
      if (isSelected) {
        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.shadowColor = color
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(x, y, size + 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // Namespace label
      ctx.save()
      ctx.font = `bold 11px 'Orbitron', monospace`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.shadowColor = color
      ctx.shadowBlur = 10
      ctx.fillText(name, x, y + size + 16)
      ctx.restore()
    }

    function drawPod(x, y, pod, nsColor) {
      const { size, state, opacity } = pod
      const color = state === 'Running' ? nsColor
        : state === 'Pending' ? '#f59e0b'
        : '#ef4444'

      ctx.save()
      ctx.globalAlpha = opacity
      ctx.shadowColor = color
      ctx.shadowBlur = state === 'Running' ? 8 : 4

      if (state === 'CrashLoopBackOff') {
        // X marker
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x - size, y - size); ctx.lineTo(x + size, y + size)
        ctx.moveTo(x + size, y - size); ctx.lineTo(x - size, y + size)
        ctx.stroke()
      } else {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    function draw(t) {
      if (!lastTRef.current) lastTRef.current = t
      const dt = t - lastTRef.current
      lastTRef.current = t

      ctx.clearRect(0, 0, w, h)

      const { namespaces: ns, selected: sel } = stateRef.current

      // Sun (K8s Control Plane)
      drawGlow(cx, cy, 90, '#ffffff44', 0.8)
      const sunGrad = ctx.createRadialGradient(cx - 10, cy - 10, 0, cx, cy, 30)
      sunGrad.addColorStop(0, '#fffde7')
      sunGrad.addColorStop(0.5, '#ffd54f')
      sunGrad.addColorStop(1, '#ff8f00')
      ctx.beginPath()
      ctx.arc(cx, cy, 30, 0, Math.PI * 2)
      ctx.fillStyle = sunGrad
      ctx.fill()

      ctx.save()
      ctx.font = `bold 10px 'Orbitron', monospace`
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.shadowColor = '#ffd54f'
      ctx.shadowBlur = 12
      ctx.fillText('Control', cx, cy - 4)
      ctx.fillText('Plane', cx, cy + 9)
      ctx.restore()

      NAMESPACE_CONFIGS.forEach(nsConf => {
        const nsData = ns[nsConf.name]
        if (!nsData) return

        // Advance orbit
        anglesRef.current[nsConf.name] = (anglesRef.current[nsConf.name] || 0) + nsConf.speed * dt
        const angle = anglesRef.current[nsConf.name]

        const px = cx + Math.cos(angle) * nsConf.orbitRadius
        const py = cy + Math.sin(angle) * nsConf.orbitRadius

        // Orbit ring
        drawOrbitRing(cx, cy, nsConf.orbitRadius, nsConf.color)

        // Pods orbiting the planet
        nsData.pods.forEach(pod => {
          pod.orbitAngle += pod.orbitSpeed * dt
          pod.opacity = lerp(pod.opacity, pod.dying ? 0 : 1, 0.04)
          const podX = px + Math.cos(pod.orbitAngle) * pod.orbitRadius
          const podY = py + Math.sin(pod.orbitAngle) * pod.orbitRadius
          drawPod(podX, podY, pod, nsConf.color)
        })

        const isSelected = sel === nsConf.name
        drawPlanet(px, py, nsConf, isSelected, angle)
      })

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize) }
  }, [])

  function handleClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const cx = canvas.width / 2
    const cy = canvas.height / 2

    for (const nsConf of NAMESPACE_CONFIGS) {
      const angle = anglesRef.current[nsConf.name] || 0
      const px = cx + Math.cos(angle) * nsConf.orbitRadius
      const py = cy + Math.sin(angle) * nsConf.orbitRadius
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2)
      if (dist < nsConf.size + 10) {
        onSelectNs(nsConf.name)
        return
      }
    }
    onSelectNs(null)
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ width:'100%', height:'100%', cursor:'crosshair', display:'block' }}
    />
  )
}

// ─── Info Panel ──────────────────────────────────────────────────────────────
function InfoPanel({ nsName, nsData, nsConf, onScale, onDelete }) {
  if (!nsName || !nsData) return null
  const pods = nsData.pods
  const running = pods.filter(p => p.state === 'Running' && !p.dying).length
  const pending = pods.filter(p => p.state === 'Pending' && !p.dying).length
  const crashed = pods.filter(p => p.state === 'CrashLoopBackOff' && !p.dying).length
  const alive = pods.filter(p => !p.dying).length

  return (
    <div style={{
      position:'absolute', top:20, right:20,
      width:280,
      background:'rgba(5,8,20,0.88)',
      border:`1px solid ${nsConf.color}44`,
      borderRadius:12,
      padding:'20px 22px',
      backdropFilter:'blur(16px)',
      boxShadow:`0 0 40px ${nsConf.color}22`,
      fontFamily:"'Share Tech Mono', monospace",
      color:'#cdd6f4',
      zIndex:10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div style={{ width:12, height:12, borderRadius:'50%', background:nsConf.color, boxShadow:`0 0 8px ${nsConf.color}` }}/>
        <span style={{ fontFamily:"'Orbitron'", fontSize:13, color:nsConf.color, fontWeight:700 }}>{nsName}</span>
      </div>

      <div style={{ fontSize:11, color:'#6c7086', marginBottom:4 }}>NAMESPACE STATUS</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
        {[
          { label:'Running', val:running, color:'#a6e3a1' },
          { label:'Pending', val:pending, color:'#f9e2af' },
          { label:'Crashed', val:crashed, color:'#f38ba8' },
        ].map(s => (
          <div key={s.label} style={{ textAlign:'center', padding:'8px 4px', background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
            <div style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:"'Orbitron'" }}>{s.val}</div>
            <div style={{ fontSize:9, color:'#6c7086', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:11, color:'#6c7086', marginBottom:8 }}>POD LIST</div>
      <div style={{ maxHeight:130, overflowY:'auto', marginBottom:16 }}>
        {pods.filter(p => !p.dying).map(pod => (
          <div key={pod.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid #ffffff08' }}>
            <span style={{ fontSize:10, color:'#cdd6f4', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pod.id.split('-').slice(-3).join('-')}</span>
            <span style={{
              fontSize:9, padding:'2px 6px', borderRadius:4,
              background: pod.state === 'Running' ? '#a6e3a122' : pod.state === 'Pending' ? '#f9e2af22' : '#f38ba822',
              color: pod.state === 'Running' ? '#a6e3a1' : pod.state === 'Pending' ? '#f9e2af' : '#f38ba8',
            }}>{pod.state}</span>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onScale(nsName, 1)} style={btnStyle(nsConf.color)}>＋ Scale Up</button>
        <button onClick={() => onScale(nsName, -1)} disabled={alive <= 1} style={btnStyle('#f38ba8', alive <= 1)}>− Scale Down</button>
      </div>
      <button onClick={() => onDelete(nsName)} style={{ ...btnStyle('#ff4444'), width:'100%', marginTop:8 }}>
        💥 Kill Random Pod
      </button>
    </div>
  )
}

function btnStyle(color, disabled = false) {
  return {
    flex:1, padding:'8px 10px',
    background: disabled ? 'rgba(255,255,255,0.03)' : `${color}18`,
    border:`1px solid ${disabled ? '#333' : color + '66'}`,
    borderRadius:8,
    color: disabled ? '#444' : color,
    fontFamily:"'Orbitron', monospace",
    fontSize:10,
    fontWeight:700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition:'all 0.2s',
  }
}

// ─── HUD / Legend ────────────────────────────────────────────────────────────
function HUD({ namespaces }) {
  const totalPods = Object.values(namespaces).reduce((sum, ns) => sum + ns.pods.filter(p => !p.dying).length, 0)
  const running = Object.values(namespaces).reduce((sum, ns) => sum + ns.pods.filter(p => p.state === 'Running' && !p.dying).length, 0)

  return (
    <div style={{
      position:'absolute', top:20, left:20,
      fontFamily:"'Share Tech Mono', monospace",
      color:'#cdd6f4',
      zIndex:10,
      display:'flex',
      flexDirection:'column',
      gap:8,
    }}>
      <div style={{ fontFamily:"'Orbitron'", fontSize:20, fontWeight:900, color:'#00d4ff', textShadow:'0 0 20px #00d4ff88', letterSpacing:2 }}>
        ⎈ CLUSTER GALAXY
      </div>
      <div style={{ fontSize:11, color:'#6c7086' }}>K8s Universe — click a planet to inspect</div>

      <div style={{ display:'flex', gap:12, marginTop:8 }}>
        <Stat label="TOTAL PODS" val={totalPods} color="#00d4ff" />
        <Stat label="RUNNING" val={running} color="#a6e3a1" />
        <Stat label="NAMESPACES" val={NAMESPACE_CONFIGS.length} color="#a855f7" />
      </div>

      <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ fontSize:10, color:'#6c7086', marginBottom:2 }}>LEGEND</div>
        {[
          { color:'#a6e3a1', label:'Running pod' },
          { color:'#f9e2af', label:'Pending pod' },
          { color:'#f38ba8', label:'CrashLoopBackOff' },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:8, fontSize:10 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:l.color }}/>
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, val, color }) {
  return (
    <div style={{ textAlign:'center', padding:'8px 12px', background:'rgba(255,255,255,0.03)', border:`1px solid ${color}33`, borderRadius:8 }}>
      <div style={{ fontSize:20, fontWeight:700, color, fontFamily:"'Orbitron'" }}>{val}</div>
      <div style={{ fontSize:9, color:'#6c7086', marginTop:2 }}>{label}</div>
    </div>
  )
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ msg, color }) {
  return msg ? (
    <div style={{
      position:'fixed', bottom:30, left:'50%', transform:'translateX(-50%)',
      background:'rgba(5,8,20,0.95)', border:`1px solid ${color}88`,
      borderRadius:8, padding:'10px 20px',
      fontFamily:"'Share Tech Mono'", fontSize:13, color,
      boxShadow:`0 0 20px ${color}44`,
      zIndex:100, whiteSpace:'nowrap',
      animation:'fadeInUp 0.3s ease',
    }}>{msg}</div>
  ) : null
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [namespaces, setNamespaces] = useState(() => {
    const ns = {}
    NAMESPACE_CONFIGS.forEach(c => {
      ns[c.name] = { pods: createPods(INITIAL_PODS[c.name], c) }
    })
    return ns
  })
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState({ msg:'', color:'#00d4ff' })

  const showToast = useCallback((msg, color = '#00d4ff') => {
    setToast({ msg, color })
    setTimeout(() => setToast({ msg:'', color }), 2500)
  }, [])

  const handleScale = useCallback((nsName, delta) => {
    const nsConf = NAMESPACE_CONFIGS.find(n => n.name === nsName)
    setNamespaces(prev => {
      const ns = { ...prev }
      const alive = ns[nsName].pods.filter(p => !p.dying)
      if (delta > 0) {
        const newPod = createPods(1, nsConf)[0]
        ns[nsName] = { pods: [...ns[nsName].pods, newPod] }
        showToast(`🚀 Spawned pod in ${nsName}`, nsConf.color)
      } else {
        if (alive.length <= 1) return prev
        const last = [...alive].pop()
        last.dying = true
        ns[nsName] = { pods: [...ns[nsName].pods] }
        showToast(`💀 Terminating pod in ${nsName}`, '#f38ba8')
        setTimeout(() => {
          setNamespaces(p => {
            const updated = { ...p }
            updated[nsName] = { pods: updated[nsName].pods.filter(pod => pod.id !== last.id) }
            return updated
          })
        }, 1200)
      }
      return ns
    })
  }, [showToast])

  const handleKill = useCallback((nsName) => {
    const nsConf = NAMESPACE_CONFIGS.find(n => n.name === nsName)
    setNamespaces(prev => {
      const alive = prev[nsName].pods.filter(p => !p.dying && p.state === 'Running')
      if (!alive.length) return prev
      const victim = alive[Math.floor(Math.random() * alive.length)]
      victim.state = 'CrashLoopBackOff'
      showToast(`💥 Pod crashed in ${nsName}!`, '#f38ba8')
      setTimeout(() => {
        victim.state = 'Running'
      }, 4000)
      return { ...prev, [nsName]: { pods: [...prev[nsName].pods] } }
    })
  }, [showToast])

  const selectedNsConf = NAMESPACE_CONFIGS.find(n => n.name === selected)

  return (
    <div style={{ width:'100vw', height:'100vh', background:'#020510', overflow:'hidden', position:'relative' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ffffff22; border-radius: 2px; }
        @keyframes fadeInUp {
          from { opacity:0; transform: translateX(-50%) translateY(10px); }
          to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <Nebula />
      <StarField />

      <div style={{ position:'absolute', inset:0, zIndex:1 }}>
        <GalaxyCanvas namespaces={namespaces} selected={selected} onSelectNs={setSelected} />
      </div>

      <HUD namespaces={namespaces} />

      {selected && (
        <InfoPanel
          nsName={selected}
          nsData={namespaces[selected]}
          nsConf={selectedNsConf}
          onScale={handleScale}
          onDelete={handleKill}
        />
      )}

      <Toast msg={toast.msg} color={toast.color} />

      <div style={{
        position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)',
        fontFamily:"'Share Tech Mono'", fontSize:10, color:'#ffffff22',
        zIndex:10, textAlign:'center',
      }}>
        CLUSTER GALAXY v1.0 · Built for K8s  · Click planets to inspect namespaces
      </div>
    </div>
  )
}
