import React, { useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

// Convert lat/lon to 3D position on sphere
function latLonToVector3(lat, lon, radius = 1.01) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Earth sphere with custom shader for a nice look
function Earth() {
  const meshRef = useRef()
  const cloudsRef = useRef()

  // Create Earth texture procedurally with canvas
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    // Ocean base
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024)
    oceanGrad.addColorStop(0, '#1a3a5c')
    oceanGrad.addColorStop(0.3, '#1e4d7a')
    oceanGrad.addColorStop(0.5, '#1a5276')
    oceanGrad.addColorStop(0.7, '#1e4d7a')
    oceanGrad.addColorStop(1, '#1a3a5c')
    ctx.fillStyle = oceanGrad
    ctx.fillRect(0, 0, 2048, 1024)

    // Add subtle ocean texture
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 2048
      const y = Math.random() * 1024
      ctx.fillStyle = `rgba(30,80,130,${Math.random() * 0.15})`
      ctx.fillRect(x, y, 2 + Math.random() * 4, 1 + Math.random() * 2)
    }

    // Simplified continent shapes (rough approximations)
    const continents = [
      // North America
      { path: [[380,180],[420,160],[480,140],[540,150],[560,180],[580,220],[560,280],[540,320],[500,350],[480,380],[440,400],[400,380],[360,340],[340,280],[350,240],[360,200]], color: '#2d5a27' },
      // South America
      { path: [[480,400],[520,420],[540,460],[560,500],[560,560],[540,620],[520,680],[500,720],[480,740],[460,720],[440,680],[430,620],[420,560],[430,500],[450,440],[460,420]], color: '#3a6b33' },
      // Europe
      { path: [[920,160],[960,150],[1000,140],[1040,150],[1060,170],[1080,200],[1060,220],[1040,240],[1000,250],[960,240],[940,220],[920,200],[910,180]], color: '#4a7a42' },
      // Africa
      { path: [[940,260],[980,250],[1020,260],[1060,280],[1080,320],[1100,380],[1100,440],[1080,500],[1060,560],[1040,600],[1000,620],[960,600],[940,560],[920,500],[910,440],[920,380],[930,320]], color: '#5a8a4a' },
      // Asia
      { path: [[1100,100],[1200,80],[1300,90],[1400,100],[1500,120],[1560,160],[1580,200],[1560,240],[1520,280],[1480,300],[1400,320],[1300,300],[1200,280],[1140,260],[1100,220],[1080,180],[1090,140]], color: '#3d7035' },
      // Australia
      { path: [[1480,500],[1540,480],[1600,490],[1640,520],[1640,560],[1620,600],[1580,620],[1540,610],[1500,580],[1480,540]], color: '#8B6914' },
      // Greenland
      { path: [[560,80],[600,60],[640,60],[660,80],[660,120],[640,140],[600,140],[570,120]], color: '#e8e8e8' },
      // Antarctica (ice)
      { path: [[0,920],[400,940],[800,950],[1200,950],[1600,940],[2048,930],[2048,1024],[0,1024]], color: '#e0e8f0' },
    ]

    continents.forEach(c => {
      ctx.fillStyle = c.color
      ctx.beginPath()
      c.path.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.fill()

      // Add terrain texture
      ctx.save()
      ctx.clip()
      for (let i = 0; i < 500; i++) {
        const x = c.path[0][0] + (Math.random() - 0.3) * 400
        const y = c.path[0][1] + (Math.random() - 0.3) * 400
        const shade = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        ctx.fillStyle = shade
        ctx.fillRect(x, y, 2 + Math.random() * 6, 2 + Math.random() * 6)
      }
      ctx.restore()
    })

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(100,150,200,0.08)'
    ctx.lineWidth = 0.5
    for (let lat = 0; lat <= 1024; lat += 1024 / 18) {
      ctx.beginPath()
      ctx.moveTo(0, lat)
      ctx.lineTo(2048, lat)
      ctx.stroke()
    }
    for (let lon = 0; lon <= 2048; lon += 2048 / 36) {
      ctx.beginPath()
      ctx.moveTo(lon, 0)
      ctx.lineTo(lon, 1024)
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [])

  // Cloud texture
  const cloudTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 1024, 512)

    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 1024
      const y = Math.random() * 512
      const r = 20 + Math.random() * 60
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, `rgba(255,255,255,${0.1 + Math.random() * 0.15})`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [])

  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.008
    }
  })

  return (
    <group>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[1.15, 64, 64]} />
        <meshBasicMaterial
          color="#4a90d9"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.08, 64, 64]} />
        <meshBasicMaterial
          color="#87ceeb"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Clouds */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.02, 64, 64]} />
        <meshStandardMaterial
          map={cloudTexture}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// Location pin marker
function LocationPin({ position, city, isHovered, onHover, onClick }) {
  const meshRef = useRef()
  const [hoverLocal, setHoverLocal] = useState(false)
  const active = isHovered || hoverLocal

  useFrame((_, delta) => {
    if (meshRef.current) {
      const target = active ? 1.3 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), delta * 8)
    }
  })

  return (
    <group position={position.toArray()}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHoverLocal(true); onHover?.(city.name) }}
        onPointerOut={() => { setHoverLocal(false); onHover?.(null) }}
        onClick={(e) => { e.stopPropagation(); onClick?.(city) }}
      >
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial
          color={active ? '#FF6B35' : '#FF4444'}
          emissive={active ? '#FF6B35' : '#FF4444'}
          emissiveIntensity={active ? 0.8 : 0.4}
        />
      </mesh>

      {/* Pulse ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.03, 0.04, 32]} />
        <meshBasicMaterial
          color="#FF4444"
          transparent
          opacity={active ? 0.6 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Label */}
      {active && (
        <Html
          position={[0, 0.06, 0]}
          center
          distanceFactor={3}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            {city.label || city.name}
          </div>
        </Html>
      )}
    </group>
  )
}

// Stars background
function Stars() {
  const points = useMemo(() => {
    const positions = new Float32Array(3000)
    for (let i = 0; i < 3000; i++) {
      positions[i] = (Math.random() - 0.5) * 50
    }
    return positions
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={1000}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" sizeAttenuation transparent opacity={0.8} />
    </points>
  )
}

// Main globe scene
function GlobeScene({ cities, onSelectCity }) {
  const [hoveredCity, setHoveredCity] = useState(null)
  const controlsRef = useRef()

  const handleCityClick = useCallback((city) => {
    onSelectCity(city)
  }, [onSelectCity])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <directionalLight position={[-3, -1, -3]} intensity={0.3} color="#4a6fa5" />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#ffffff" />

      <Stars />
      <Earth />

      {cities.filter(c => c.lat != null).map(city => (
        <LocationPin
          key={city.name}
          position={latLonToVector3(city.lat, city.lon)}
          city={city}
          isHovered={hoveredCity === city.name}
          onHover={setHoveredCity}
          onClick={handleCityClick}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        enableZoom={true}
        enablePan={false}
        minDistance={1.5}
        maxDistance={4}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}

export default function GlobeView({ cities, onSelectCity }) {
  return (
    <div className="w-full h-full" style={{ background: 'radial-gradient(ellipse at center, #0a1628 0%, #050a15 100%)' }}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
      >
        <GlobeScene cities={cities} onSelectCity={onSelectCity} />
      </Canvas>

      {/* Title overlay */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
        <h1 className="font-serif text-3xl font-light text-white/90 tracking-wider drop-shadow-lg">
          What's That Outside?
        </h1>
        <p className="text-sm text-white/50 mt-2 font-sans font-light tracking-wide">
          Spin the globe. Tap a city.
        </p>
      </div>

      {/* Detect location button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={() => onSelectCity({ name: 'Auto', lat: null, lon: null })}
          className="font-sans text-sm font-medium px-6 py-3 rounded-full transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.85)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
        >
          Use My Location
        </button>
      </div>
    </div>
  )
}
