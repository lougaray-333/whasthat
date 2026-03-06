import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useLoader, extend } from '@react-three/fiber'
import { OrbitControls, Html, useTexture, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// NASA Blue Marble & related textures hosted on CDN
const EARTH_TEXTURES = {
  day: 'https://unpkg.com/three-globe@2.41.12/example/img/earth-blue-marble.jpg',
  night: 'https://unpkg.com/three-globe@2.41.12/example/img/earth-night.jpg',
  bump: 'https://unpkg.com/three-globe@2.41.12/example/img/earth-topology.png',
  clouds: 'https://unpkg.com/three-globe@2.41.12/example/img/earth-clouds.png',
  water: 'https://unpkg.com/three-globe@2.41.12/example/img/earth-water.png',
}

// Convert lat/lon to 3D position on sphere
function latLonToVector3(lat, lon, radius = 1.012) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Atmosphere shader for realistic glow
const AtmosphereMaterial = shaderMaterial(
  { color: new THREE.Color('#4da6ff') },
  // vertex
  `varying vec3 vNormal;
   varying vec3 vPosition;
   void main() {
     vNormal = normalize(normalMatrix * normal);
     vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,
  // fragment
  `uniform vec3 color;
   varying vec3 vNormal;
   varying vec3 vPosition;
   void main() {
     vec3 viewDir = normalize(-vPosition);
     float intensity = pow(0.65 - dot(vNormal, viewDir), 3.0);
     gl_FragColor = vec4(color, intensity * 0.8);
   }`
)

extend({ AtmosphereMaterial })

// Earth with NASA textures
function Earth() {
  const meshRef = useRef()
  const cloudsRef = useRef()
  const [texturesLoaded, setTexturesLoaded] = useState(false)

  // Load textures
  const dayMap = useLoader(THREE.TextureLoader, EARTH_TEXTURES.day)
  const nightMap = useLoader(THREE.TextureLoader, EARTH_TEXTURES.night)
  const bumpMap = useLoader(THREE.TextureLoader, EARTH_TEXTURES.bump)
  const cloudsMap = useLoader(THREE.TextureLoader, EARTH_TEXTURES.clouds)
  const waterMap = useLoader(THREE.TextureLoader, EARTH_TEXTURES.water)

  useEffect(() => {
    if (dayMap && nightMap && bumpMap) {
      // Improve texture quality
      ;[dayMap, nightMap, bumpMap, cloudsMap, waterMap].forEach(t => {
        if (t) {
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 8
        }
      })
      setTexturesLoaded(true)
    }
  }, [dayMap, nightMap, bumpMap, cloudsMap, waterMap])

  // Custom shader for day/night blending based on light direction
  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayMap },
        nightTexture: { value: nightMap },
        bumpTexture: { value: bumpMap },
        waterTexture: { value: waterMap },
        sunDirection: { value: new THREE.Vector3(5, 3, 5).normalize() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D waterTexture;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          float sunDot = dot(normal, sunDirection);

          // Smooth transition between day and night
          float dayFactor = smoothstep(-0.15, 0.25, sunDot);

          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          float water = texture2D(waterTexture, vUv).r;

          // Day side: standard lighting with specular on water
          float diffuse = max(0.0, sunDot);
          vec3 dayLit = dayColor.rgb * (0.15 + 0.85 * diffuse);

          // Add subtle specular highlight on water
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 halfDir = normalize(sunDirection + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * water * 0.5;
          dayLit += vec3(spec);

          // Night side: city lights glow
          vec3 nightLit = nightColor.rgb * 1.5;

          // Blend
          vec3 finalColor = mix(nightLit, dayLit, dayFactor);

          // Atmosphere rim lighting
          float rim = 1.0 - max(dot(normal, viewDir), 0.0);
          float rimFactor = pow(rim, 4.0) * 0.3;
          finalColor += vec3(0.3, 0.5, 1.0) * rimFactor * dayFactor;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    })
  }, [dayMap, nightMap, bumpMap, waterMap])

  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.006
    }
  })

  return (
    <group>
      {/* Outer atmosphere glow */}
      <mesh scale={[1.18, 1.18, 1.18]}>
        <sphereGeometry args={[1, 64, 64]} />
        <atmosphereMaterial
          color="#4da6ff"
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner atmosphere rim */}
      <mesh scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[1, 64, 64]} />
        <atmosphereMaterial
          color="#88ccff"
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Earth surface */}
      <mesh ref={meshRef} material={earthMaterial}>
        <sphereGeometry args={[1, 128, 128]} />
      </mesh>

      {/* Cloud layer */}
      {cloudsMap && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[1.008, 64, 64]} />
          <meshStandardMaterial
            map={cloudsMap}
            transparent
            opacity={0.25}
            depthWrite={false}
            alphaMap={cloudsMap}
          />
        </mesh>
      )}
    </group>
  )
}

// Location pin with animated pulse
function LocationPin({ position, city, isHovered, onHover, onClick }) {
  const groupRef = useRef()
  const pulseRef = useRef()
  const [hoverLocal, setHoverLocal] = useState(false)
  const active = isHovered || hoverLocal

  // Orient pin to point outward from globe center
  const lookAtCenter = useMemo(() => {
    const dir = position.clone().normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion()
    const matrix = new THREE.Matrix4()
    matrix.lookAt(new THREE.Vector3(0, 0, 0), dir, up)
    quaternion.setFromRotationMatrix(matrix)
    return quaternion
  }, [position])

  useFrame((state, delta) => {
    if (pulseRef.current) {
      const t = state.clock.elapsedTime
      const scale = 1 + Math.sin(t * 3) * 0.3
      pulseRef.current.scale.set(scale, scale, scale)
      pulseRef.current.material.opacity = 0.4 - Math.sin(t * 3) * 0.2
    }
  })

  return (
    <group position={position.toArray()}>
      {/* Pin dot */}
      <mesh
        ref={groupRef}
        onPointerOver={(e) => { e.stopPropagation(); setHoverLocal(true); onHover?.(city.name) }}
        onPointerOut={() => { setHoverLocal(false); onHover?.(null) }}
        onClick={(e) => { e.stopPropagation(); onClick?.(city) }}
      >
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshBasicMaterial
          color={active ? '#FF6B35' : '#FF3333'}
        />
      </mesh>

      {/* Animated pulse ring */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.028, 16, 16]} />
        <meshBasicMaterial
          color="#FF4444"
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Vertical pin line */}
      {active && (
        <mesh position={position.clone().normalize().multiplyScalar(0.03).toArray()}>
          <cylinderGeometry args={[0.002, 0.002, 0.04, 8]} />
          <meshBasicMaterial color="#FF6B35" />
        </mesh>
      )}

      {/* Label */}
      {active && (
        <Html
          position={position.clone().normalize().multiplyScalar(0.08).toArray()}
          center
          distanceFactor={2.5}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            letterSpacing: '0.02em',
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
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(6000)
    for (let i = 0; i < 6000; i += 3) {
      const r = 30 + Math.random() * 30
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i] = r * Math.sin(phi) * Math.cos(theta)
      arr[i + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i + 2] = r * Math.cos(phi)
    }
    return arr
  }, [])

  const sizes = useMemo(() => {
    const arr = new Float32Array(2000)
    for (let i = 0; i < 2000; i++) {
      arr[i] = 0.03 + Math.random() * 0.08
    }
    return arr
  }, [])

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={2000} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#ffffff"
        sizeAttenuation
        transparent
        opacity={0.9}
      />
    </points>
  )
}

// Loading fallback inside canvas
function GlobeLoading() {
  return (
    <Html center>
      <div style={{
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 32, height: 32, margin: '0 auto 12px',
          border: '2px solid rgba(255,255,255,0.2)',
          borderTopColor: 'rgba(255,255,255,0.8)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        Loading Earth...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Html>
  )
}

// Main globe scene
function GlobeScene({ cities, onSelectCity }) {
  const [hoveredCity, setHoveredCity] = useState(null)

  const handleCityClick = useCallback((city) => {
    onSelectCity(city)
  }, [onSelectCity])

  return (
    <>
      {/* Lighting to match sun position */}
      <ambientLight intensity={0.08} />
      <directionalLight position={[5, 3, 5]} intensity={2.0} color="#fffaf0" />
      <directionalLight position={[-5, -2, -5]} intensity={0.15} color="#334466" />
      <hemisphereLight args={['#446688', '#000000', 0.2]} />

      <Stars />

      <React.Suspense fallback={<GlobeLoading />}>
        <Earth />
      </React.Suspense>

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
        enableZoom={true}
        enablePan={false}
        minDistance={1.4}
        maxDistance={4}
        rotateSpeed={0.4}
        zoomSpeed={0.6}
        autoRotate
        autoRotateSpeed={0.25}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  )
}

export default function GlobeView({ cities, onSelectCity }) {
  return (
    <div className="w-full h-full" style={{ background: 'radial-gradient(ellipse at center, #080e1a 0%, #020408 100%)' }}>
      <Canvas
        camera={{ position: [0, 0.5, 2.5], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <GlobeScene cities={cities} onSelectCity={onSelectCity} />
      </Canvas>

      {/* Title overlay */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
        <h1 className="font-serif text-3xl font-light text-white/90 tracking-wider drop-shadow-lg">
          What's That Outside?
        </h1>
        <p className="text-sm text-white/40 mt-2 font-sans font-light tracking-wide">
          Spin the globe. Tap a city.
        </p>
      </div>

      {/* Detect location button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={() => onSelectCity({ name: 'Auto', lat: null, lon: null })}
          className="font-sans text-sm font-medium px-6 py-3 rounded-full transition-all duration-200 hover:scale-105"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.85)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          Use My Location
        </button>
      </div>
    </div>
  )
}
