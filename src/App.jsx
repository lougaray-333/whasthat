import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'

const GlobeView = lazy(() => import('./Globe.jsx'))

const CITIES = [
  { name: 'Auto', label: 'My Location', lat: null, lon: null },
  { name: 'New York', label: 'NYC', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { name: 'Atlanta', label: 'Atlanta', lat: 33.749, lon: -84.388, tz: 'America/New_York' },
  { name: 'Miami', label: 'Miami', lat: 25.7617, lon: -80.1918, tz: 'America/New_York' },
  { name: 'Austin', label: 'Austin', lat: 30.2672, lon: -97.7431, tz: 'America/Chicago' },
  { name: 'San Francisco', label: 'SF', lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles' },
  { name: 'Seattle', label: 'Seattle', lat: 47.6062, lon: -122.3321, tz: 'America/Los_Angeles' },
  { name: 'London', label: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { name: 'Lisbon', label: 'Lisbon', lat: 38.7223, lon: -9.1393, tz: 'Europe/Lisbon' },
  { name: 'Ho Chi Minh City', label: 'Vietnam', lat: 10.8231, lon: 106.6297, tz: 'Asia/Ho_Chi_Minh' },
  { name: 'Barcelona', label: 'Spain', lat: 41.3874, lon: 2.1686, tz: 'Europe/Madrid' },
  { name: 'Tokyo', label: 'Tokyo', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
]

// Unsplash photo IDs for each city — curated street-level "window view" shots
const CITY_PHOTOS = {
  'New York': [
    'photo-1534430480872-3498386e7856', // NYC street
    'photo-1496442226666-8d4d0e62e6e9', // NYC brownstones
    'photo-1555109307-f7d9da25c244', // NYC residential
    'photo-1518235506717-e1ed3306a89b', // Times Square
  ],
  'Atlanta': [
    'photo-1575362337068-eb41af7cc7f5', // Atlanta skyline
    'photo-1570742292682-34551661efbb', // Atlanta midtown
    'photo-1548587558-281e0ef82982', // Atlanta downtown
  ],
  'Miami': [
    'photo-1535498730771-e735b998cd64', // Miami art deco
    'photo-1514214246283-d427a95c5d2f', // Miami palms
    'photo-1533106497176-45ae19e68ba2', // Miami beach
  ],
  'Austin': [
    'photo-1588993608743-ae498a57e99a', // Austin congress ave
    'photo-1570137555500-5a78ecce0abb', // Austin skyline
    'photo-1558618666-fcd25c85f82e', // Austin downtown
  ],
  'San Francisco': [
    'photo-1521747116042-5a810fda9664', // SF houses
    'photo-1501594907352-04cda38ebc29', // SF street
    'photo-1549346155-d3684e05e3be', // SF cable car
  ],
  'Seattle': [
    'photo-1502175353174-a7a70e73b362', // Seattle skyline
    'photo-1438401171849-74ac270044ee', // Pike Place Market area
    'photo-1542223616-9de9adb5e3c8', // Seattle rain
  ],
  'London': [
    'photo-1513635269975-59663e0ac1ad', // London street
    'photo-1520986606214-8b456906c813', // London terraces
    'photo-1486299267070-83823f5448dd', // London Big Ben
  ],
  'Lisbon': [
    'photo-1555881400-74d7acaacd8b', // Lisbon street
    'photo-1548707309-dcebeab9ea9b', // Lisbon tram
    'photo-1573455494060-c5595004fb6c', // Lisbon skyline
  ],
  'Ho Chi Minh City': [
    'photo-1583417319070-4a69db38a482', // Vietnam street
    'photo-1559592413-7cec4d0cae2b', // HCM city
    'photo-1557750255-c76072a7aee1', // Vietnam motorbikes
  ],
  'Barcelona': [
    'photo-1583422409516-2895a77efded', // La Rambla
    'photo-1539037116277-4db20889f2d7', // Barcelona Gothic quarter
    'photo-1562883676-8c7feb83f09b', // Barcelona street
  ],
  'Tokyo': [
    'photo-1540959733332-eab4deabeeaf', // Tokyo crossing
    'photo-1503899036084-c55cdd92da26', // Tokyo night
    'photo-1542051841857-5f90071e7989', // Tokyo neon
  ],
}

// City-specific animation types — hasWater means boats instead of cars near bottom
const CITY_ANIMATIONS = {
  'New York': { elements: ['people', 'cars', 'neon', 'hotdog-cart', 'taxi'], hasWater: false },
  'Atlanta': { elements: ['people', 'cars', 'cyclist', 'jogger'], hasWater: false },
  'Miami': { elements: ['people', 'palms', 'birds', 'surfer', 'boat'], hasWater: true },
  'Austin': { elements: ['people', 'music', 'cars', 'foodtruck', 'guitarist'], hasWater: false },
  'San Francisco': { elements: ['people', 'cablecar', 'cyclist', 'boat'], hasWater: true },
  'Seattle': { elements: ['people', 'cars', 'coffee-cup', 'cyclist'], hasWater: false },
  'London': { elements: ['people', 'bus', 'cyclist', 'boat'], hasWater: true },
  'Lisbon': { elements: ['people', 'tram', 'boat', 'guitarist'], hasWater: true },
  'Ho Chi Minh City': { elements: ['scooters', 'people', 'foodvendor', 'boat'], hasWater: true },
  'Barcelona': { elements: ['people', 'performers', 'cyclist', 'boat'], hasWater: true },
  'Tokyo': { elements: ['people', 'neon', 'trains', 'vending-machine'], hasWater: false },
}

function getUnsplashUrl(photoId) {
  return `https://images.unsplash.com/${photoId}?w=1920&h=1080&fit=crop&q=80`
}

const WMO_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Heavy freezing rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
}

function getWeatherType(code) {
  if ([0, 1].includes(code)) return 'sunny'
  if ([2, 3].includes(code)) return 'cloudy'
  if ([45, 48].includes(code)) return 'fog'
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'
  if ([95, 96, 99].includes(code)) return 'storm'
  return 'cloudy'
}

function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 17) return 'day'
  if (hour >= 17 && hour < 19) return 'dusk'
  if (hour >= 19 && hour < 22) return 'evening'
  return 'night'
}

function getCityHour(tz) {
  if (!tz) return new Date().getHours()
  try {
    const str = new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false })
    return parseInt(str, 10)
  } catch { return new Date().getHours() }
}

function getCityTime(tz) {
  if (!tz) return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  try {
    return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
  } catch { return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
}

// --- Weather Animation Components ---

function RainEffect() {
  const drops = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 0.4 + Math.random() * 0.4,
    opacity: 0.2 + Math.random() * 0.5,
    width: Math.random() > 0.7 ? 2 : 1,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {drops.map(d => (
        <div key={d.id} className="absolute" style={{
          left: `${d.left}%`, top: '-10%', height: '12%', width: d.width,
          background: 'linear-gradient(transparent, rgba(174,194,224,0.5))',
          animation: `rainFall ${d.duration}s ${d.delay}s linear infinite`,
          opacity: d.opacity,
        }} />
      ))}
      <style>{`
        @keyframes rainFall {
          0% { transform: translateY(0) translateX(-2px); }
          100% { transform: translateY(900%) translateX(4px); }
        }
      `}</style>
    </div>
  )
}

function SnowEffect() {
  const flakes = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 4,
    size: 2 + Math.random() * 4,
    opacity: 0.4 + Math.random() * 0.6,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {flakes.map(f => (
        <div key={f.id} className="absolute rounded-full bg-white" style={{
          left: `${f.left}%`, top: '-5%',
          width: f.size, height: f.size,
          animation: `snowFall ${f.duration}s ${f.delay}s linear infinite`,
          opacity: f.opacity,
        }} />
      ))}
      <style>{`
        @keyframes snowFall {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(25vh) translateX(10px); }
          50% { transform: translateY(50vh) translateX(-10px); }
          75% { transform: translateY(75vh) translateX(5px); }
          100% { transform: translateY(105vh) translateX(-5px); }
        }
      `}</style>
    </div>
  )
}

function FogEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {[0, 1, 2].map(i => (
        <div key={i} className="absolute w-[200%] h-1/3" style={{
          top: `${20 + i * 25}%`,
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,${0.15 + i * 0.05}), transparent, rgba(255,255,255,${0.1 + i * 0.05}), transparent)`,
          animation: `fogDrift ${15 + i * 5}s ${i * 3}s ease-in-out infinite alternate`,
        }} />
      ))}
      <style>{`
        @keyframes fogDrift {
          0% { transform: translateX(-25%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </div>
  )
}

function StormEffect() {
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setFlash(true)
        setTimeout(() => setFlash(false), 150)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [])
  return (
    <>
      <RainEffect />
      <div className="absolute inset-0 pointer-events-none z-10 bg-gray-900/30" />
      {flash && <div className="absolute inset-0 pointer-events-none z-20 bg-white/30 transition-opacity" />}
    </>
  )
}

function SunnyEffect({ timeOfDay }) {
  const isDusk = timeOfDay === 'dusk' || timeOfDay === 'dawn'
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full" style={{
        background: isDusk
          ? 'radial-gradient(circle, rgba(255,180,80,0.35) 0%, rgba(255,120,50,0.1) 40%, transparent 70%)'
          : 'radial-gradient(circle, rgba(255,255,200,0.25) 0%, transparent 70%)',
        animation: 'sunPulse 4s ease-in-out infinite',
      }} />
      <style>{`
        @keyframes sunPulse { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
      `}</style>
    </div>
  )
}

function CloudyEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="absolute h-24 rounded-full" style={{
          top: `${5 + i * 18}%`,
          width: `${40 + i * 10}%`,
          background: `radial-gradient(ellipse, rgba(200,200,210,${0.2 + i * 0.05}), transparent 70%)`,
          animation: `cloudMove ${25 + i * 8}s ${i * 3}s ease-in-out infinite alternate`,
        }} />
      ))}
      <style>{`
        @keyframes cloudMove { 0% { transform: translateX(-10%); } 100% { transform: translateX(10%); } }
      `}</style>
    </div>
  )
}

function TimeOverlay({ timeOfDay }) {
  const overlays = {
    dawn: 'bg-gradient-to-t from-orange-400/20 via-pink-300/15 to-transparent',
    dusk: 'bg-gradient-to-t from-orange-500/25 via-pink-400/15 to-purple-500/10',
    evening: 'bg-gradient-to-b from-indigo-900/30 to-blue-800/20',
    night: 'bg-gradient-to-b from-indigo-950/40 to-blue-900/30',
    day: '',
  }
  if (!overlays[timeOfDay]) return null
  return <div className={`absolute inset-0 pointer-events-none z-10 ${overlays[timeOfDay]}`} />
}

function WeatherEffects({ weatherType, timeOfDay }) {
  return (
    <>
      <TimeOverlay timeOfDay={timeOfDay} />
      {weatherType === 'rain' && <RainEffect />}
      {weatherType === 'snow' && <SnowEffect />}
      {weatherType === 'fog' && <FogEffect />}
      {weatherType === 'storm' && <StormEffect />}
      {weatherType === 'sunny' && <SunnyEffect timeOfDay={timeOfDay} />}
      {weatherType === 'cloudy' && <CloudyEffect />}
    </>
  )
}

// --- Stars for night ---

function StarsEffect({ timeOfDay }) {
  if (timeOfDay !== 'night' && timeOfDay !== 'evening') return null
  const stars = Array.from({ length: 40 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 50,
    size: 1 + Math.random() * 2, delay: Math.random() * 3,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {stars.map(s => (
        <div key={s.id} className="absolute rounded-full bg-white" style={{
          left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size,
          animation: `twinkle 3s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}
      <style>{`@keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
    </div>
  )
}

// --- City-specific Ambient Animations ---

// Cartoon-style 2D walking person with optional umbrella, hair, accessories
function WalkingPerson({ id, goingRight, yPosition, duration, delay, scale, color, hasUmbrella, shirtColor, hairColor }) {
  const shirt = shirtColor || color
  const hair = hairColor || '#2C2C2C'
  const skin = '#F5CBA7'
  const legSpeed = Math.max(0.3, duration * 0.06)
  return (
    <div className="absolute" style={{
      top: `${yPosition}%`,
      left: goingRight ? '-6%' : '106%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      transform: `scale(${scale})`,
      opacity: 0,
    }}>
      <svg width="36" height="64" viewBox="0 0 36 64" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.5))',
      }}>
        {/* Umbrella */}
        {hasUmbrella && (
          <g>
            <line x1="18" y1="-18" x2="18" y2="8" stroke="#555" strokeWidth="1.5" />
            <path d="M4,-18 Q18,-30 32,-18 Q25,-16 18,-18 Q11,-16 4,-18 Z" fill="#3498DB" stroke="#2980B9" strokeWidth="0.5" />
          </g>
        )}
        {/* Hair */}
        <ellipse cx="18" cy="5" rx="7" ry="7.5" fill={hair} />
        {/* Head */}
        <circle cx="18" cy="7" r="6" fill={skin} />
        {/* Eyes */}
        <circle cx="15.5" cy="6" r="1" fill="#333" />
        <circle cx="20.5" cy="6" r="1" fill="#333" />
        {/* Smile */}
        <path d="M15.5,9.5 Q18,12 20.5,9.5" fill="none" stroke="#333" strokeWidth="0.7" />
        {/* Torso / shirt */}
        <rect x="11" y="13" width="14" height="18" rx="4" fill={shirt} />
        {/* Collar */}
        <path d="M14,13 L18,16 L22,13" fill="none" stroke={shirt === '#ECF0F1' ? '#CCC' : 'rgba(0,0,0,0.15)'} strokeWidth="1" />
        {/* Arms swinging */}
        <g style={{ transformOrigin: '11px 15px', animation: `armSwing ${legSpeed}s ease-in-out infinite alternate` }}>
          <rect x="5" y="14" width="6" height="15" rx="3" fill={skin} />
        </g>
        <g style={{ transformOrigin: '25px 15px', animation: `armSwing ${legSpeed}s ease-in-out infinite alternate-reverse` }}>
          <rect x="25" y="14" width="6" height="15" rx="3" fill={skin} />
        </g>
        {/* Legs walking */}
        <g style={{ transformOrigin: '14px 31px', animation: `legSwing ${legSpeed}s ease-in-out infinite alternate` }}>
          <rect x="11" y="31" width="6" height="20" rx="3" fill="#34495E" />
          <rect x="10" y="49" width="8" height="4" rx="2" fill="#555" />
        </g>
        <g style={{ transformOrigin: '22px 31px', animation: `legSwing ${legSpeed}s ease-in-out infinite alternate-reverse` }}>
          <rect x="19" y="31" width="6" height="20" rx="3" fill="#34495E" />
          <rect x="18" y="49" width="8" height="4" rx="2" fill="#555" />
        </g>
      </svg>
    </div>
  )
}

function AnimatedCar({ id, goingRight, yPosition, duration, delay, carColor, scale }) {
  return (
    <div className="absolute" style={{
      top: `${yPosition}%`,
      left: goingRight ? '-12%' : '112%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      transform: `scale(${scale})`,
      opacity: 0,
    }}>
      <svg width="90" height="36" viewBox="0 0 90 36" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))',
      }}>
        <path d="M8,24 L8,18 Q8,15 12,15 L22,15 L30,6 Q31.5,4.5 34,4.5 L57,4.5 Q60,4.5 61.5,6 L72,15 L82,15 Q86,15 86,18 L86,24 Q86,27 84,27 L72,27 L72,24 Q72,20 66,20 Q60,20 60,24 L60,27 L33,27 L33,24 Q33,20 27,20 Q21,20 21,24 L21,27 L11,27 Q8,27 8,24 Z" fill={carColor} />
        <path d="M33,7.5 L30,14 L45,14 L45,7.5 Z" fill="rgba(150,200,255,0.6)" />
        <path d="M48,7.5 L48,14 L67,14 L60,7.5 Z" fill="rgba(150,200,255,0.6)" />
        <circle cx="27" cy="26" r="6" fill="#222" />
        <circle cx="27" cy="26" r="3" fill="#555" />
        <circle cx="66" cy="26" r="6" fill="#222" />
        <circle cx="66" cy="26" r="3" fill="#555" />
        <rect x="82" y="16.5" width="5" height="4.5" rx="1.5" fill="#FFE4A0" opacity="0.8" />
        <rect x="4.5" y="18" width="3" height="3" rx="0.75" fill="#FF4444" opacity="0.8" />
      </svg>
    </div>
  )
}

// NYC yellow taxi
function TaxiCab({ goingRight, yPosition, duration, delay, scale }) {
  return <AnimatedCar id="taxi" goingRight={goingRight} yPosition={yPosition} duration={duration} delay={delay} carColor="#F1C40F" scale={scale} />
}

// Neon sign cluster — spawns 5-8 signs at once
function NeonCluster({ baseX, baseY }) {
  const neonColors = ['#FF1493', '#00FFFF', '#FF4500', '#ADFF2F', '#FF69B4', '#7B68EE', '#FFD700', '#FF6347']
  const labels = ['BAR', 'OPEN', 'EAT', 'LIVE', '24H', 'CLUB', 'JAZZ', 'RAMEN', 'SUSHI', 'BEER', 'CAFE', 'HOTEL', 'KARAOKE']
  const count = 5 + Math.floor(Math.random() * 4)
  const signs = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: baseX + (Math.random() - 0.5) * 40,
    y: baseY + (Math.random() - 0.5) * 25,
    color: neonColors[Math.floor(Math.random() * neonColors.length)],
    label: labels[Math.floor(Math.random() * labels.length)],
    delay: Math.random() * 3,
    size: 0.7 + Math.random() * 0.6,
  }))
  return (
    <>
      {signs.map(s => (
        <div key={s.id} className="absolute" style={{
          left: `${Math.max(2, Math.min(90, s.x))}%`,
          top: `${Math.max(5, Math.min(55, s.y))}%`,
          transform: `scale(${s.size})`,
        }}>
          <div style={{
            padding: '3px 8px',
            border: `2px solid ${s.color}`,
            borderRadius: '4px',
            boxShadow: `0 0 10px ${s.color}, 0 0 25px ${s.color}50, 0 0 40px ${s.color}20`,
            animation: `neonFlicker ${2 + s.delay}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              color: s.color, fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px',
              textShadow: `0 0 8px ${s.color}, 0 0 16px ${s.color}`,
              fontFamily: 'monospace',
            }}>{s.label}</span>
          </div>
        </div>
      ))}
    </>
  )
}

function ScooterSilhouette({ id, goingRight, yPosition, duration, delay, scale }) {
  return (
    <div className="absolute" style={{
      top: `${yPosition}%`,
      left: goingRight ? '-8%' : '108%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      transform: `scale(${scale})`,
      opacity: 0,
    }}>
      <svg width="50" height="40" viewBox="0 0 50 40" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
      }}>
        <circle cx="10" cy="32" r="7" fill="#333" />
        <circle cx="10" cy="32" r="3.5" fill="#666" />
        <circle cx="40" cy="32" r="7" fill="#333" />
        <circle cx="40" cy="32" r="3.5" fill="#666" />
        <path d="M12,30 L20,16 L35,16 L38,30" fill="none" stroke="#444" strokeWidth="3" />
        <rect x="18" y="10" width="12" height="8" rx="2" fill="#E74C3C" />
        <circle cx="25" cy="6" r="4" fill="#DEB887" />
        <rect x="44" y="28" width="4" height="2" rx="1" fill="#FFE4A0" />
      </svg>
    </div>
  )
}

function BirdFlock({ delay }) {
  return (
    <div className="absolute" style={{
      top: `${10 + Math.random() * 20}%`,
      left: '-10%',
      animation: `walkAcrossRight ${20 + Math.random() * 10}s ${delay}s linear forwards`,
      opacity: 0,
    }}>
      <svg width="60" height="24" viewBox="0 0 60 24" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}>
        {[0, 15, 30, 8, 22, 40].map((bx, i) => (
          <path key={i} d={`M${bx},${10 + (i % 3) * 3} Q${bx + 4},${6 + (i % 3) * 3} ${bx + 8},${10 + (i % 3) * 3} Q${bx + 4},${8 + (i % 3) * 3} ${bx},${10 + (i % 3) * 3}`}
            fill="none" stroke="#333" strokeWidth="1.5"
            style={{ animation: `birdFlap 0.6s ${i * 0.1}s ease-in-out infinite alternate` }} />
        ))}
      </svg>
    </div>
  )
}

function MusicNotes({ x, delay }) {
  return (
    <div className="absolute" style={{
      left: `${x}%`, bottom: '25%',
      animation: `floatUp 4s ${delay}s ease-out infinite`,
      opacity: 0,
    }}>
      <svg width="20" height="24" viewBox="0 0 20 24">
        <text x="4" y="18" fontSize="18" fill="rgba(255,255,255,0.7)"
          style={{ textShadow: '0 0 8px rgba(255,200,50,0.5)' }}>&#9835;</text>
      </svg>
    </div>
  )
}

function PalmTreeSway({ x }) {
  return (
    <div className="absolute" style={{
      left: `${x}%`, bottom: '8%',
      transformOrigin: 'bottom center',
      animation: `palmSway 5s ${Math.random() * 2}s ease-in-out infinite alternate`,
    }}>
      <svg width="40" height="80" viewBox="0 0 40 80" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>
        <rect x="18" y="30" width="4" height="50" rx="2" fill="#5D4E37" />
        <ellipse cx="20" cy="20" rx="18" ry="22" fill="rgba(34,120,60,0.7)" />
        <path d="M20,5 Q5,15 2,30" fill="none" stroke="rgba(34,120,60,0.6)" strokeWidth="3" />
        <path d="M20,5 Q35,15 38,30" fill="none" stroke="rgba(34,120,60,0.6)" strokeWidth="3" />
        <path d="M20,8 Q10,20 4,35" fill="none" stroke="rgba(45,140,70,0.5)" strokeWidth="2" />
        <path d="M20,8 Q30,20 36,35" fill="none" stroke="rgba(45,140,70,0.5)" strokeWidth="2" />
      </svg>
    </div>
  )
}

function TramCar({ goingRight, duration, delay }) {
  return (
    <div className="absolute" style={{
      top: '72%',
      left: goingRight ? '-15%' : '115%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      opacity: 0,
    }}>
      <svg width="100" height="50" viewBox="0 0 100 50" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))',
      }}>
        <rect x="5" y="10" width="90" height="30" rx="5" fill="#E8C84A" />
        <rect x="10" y="14" width="18" height="16" rx="2" fill="rgba(150,200,255,0.5)" />
        <rect x="32" y="14" width="18" height="16" rx="2" fill="rgba(150,200,255,0.5)" />
        <rect x="54" y="14" width="18" height="16" rx="2" fill="rgba(150,200,255,0.5)" />
        <rect x="76" y="14" width="15" height="16" rx="2" fill="rgba(150,200,255,0.5)" />
        <rect x="0" y="40" width="100" height="4" rx="2" fill="#333" />
        <circle cx="20" cy="44" r="4" fill="#222" />
        <circle cx="80" cy="44" r="4" fill="#222" />
        <line x1="50" y1="0" x2="50" y2="10" stroke="#666" strokeWidth="2" />
      </svg>
    </div>
  )
}

function DoubleDecker({ goingRight, duration, delay }) {
  return (
    <div className="absolute" style={{
      top: '70%',
      left: goingRight ? '-15%' : '115%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      opacity: 0,
    }}>
      <svg width="100" height="55" viewBox="0 0 100 55" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))',
      }}>
        <rect x="5" y="22" width="90" height="24" rx="3" fill="#CC1100" />
        <rect x="5" y="4" width="90" height="20" rx="3" fill="#DD2211" />
        <rect x="10" y="7" width="14" height="12" rx="1" fill="rgba(150,200,255,0.5)" />
        <rect x="28" y="7" width="14" height="12" rx="1" fill="rgba(150,200,255,0.5)" />
        <rect x="46" y="7" width="14" height="12" rx="1" fill="rgba(150,200,255,0.5)" />
        <rect x="64" y="7" width="14" height="12" rx="1" fill="rgba(150,200,255,0.5)" />
        <rect x="10" y="27" width="14" height="12" rx="1" fill="rgba(150,200,255,0.5)" />
        <rect x="28" y="27" width="14" height="12" rx="1" fill="rgba(150,200,255,0.5)" />
        <rect x="46" y="27" width="14" height="12" rx="1" fill="rgba(150,200,255,0.5)" />
        <rect x="82" y="25" width="10" height="20" rx="2" fill="#AA0000" />
        <circle cx="18" cy="50" r="5" fill="#222" />
        <circle cx="18" cy="50" r="2.5" fill="#555" />
        <circle cx="78" cy="50" r="5" fill="#222" />
        <circle cx="78" cy="50" r="2.5" fill="#555" />
        <rect x="91" y="28" width="4" height="3" rx="1" fill="#FFE4A0" opacity="0.8" />
      </svg>
    </div>
  )
}

// Boat for waterfront cities
function Boat({ goingRight, yPosition, duration, delay, boatColor }) {
  return (
    <div className="absolute" style={{
      top: `${yPosition}%`,
      left: goingRight ? '-12%' : '112%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      opacity: 0,
    }}>
      <svg width="70" height="40" viewBox="0 0 70 40" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))',
        animation: `boatBob 2s ease-in-out infinite`,
      }}>
        <path d="M5,24 Q10,18 20,18 L50,18 Q60,18 65,24 L60,32 Q55,36 35,36 Q15,36 10,32 Z" fill={boatColor || '#F5F5DC'} />
        <rect x="32" y="4" width="3" height="16" rx="1" fill="#8B7355" />
        <path d="M35,4 Q50,10 35,18" fill="rgba(255,255,255,0.8)" stroke="#DDD" strokeWidth="0.5" />
        <path d="M15,22 L55,22" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
        <path d="M10,28 Q20,25 35,28 Q50,31 60,28" fill="none" stroke={boatColor || '#E8E0C8'} strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  )
}

// Cyclist
function Cyclist({ goingRight, yPosition, duration, delay, scale, color }) {
  return (
    <div className="absolute" style={{
      top: `${yPosition}%`,
      left: goingRight ? '-8%' : '108%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      transform: `scale(${scale})`,
      opacity: 0,
    }}>
      <svg width="50" height="44" viewBox="0 0 50 44" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
      }}>
        <circle cx="12" cy="34" r="8" fill="none" stroke="#333" strokeWidth="2" />
        <circle cx="38" cy="34" r="8" fill="none" stroke="#333" strokeWidth="2" />
        <path d="M12,34 L22,20 L35,20 L38,34" fill="none" stroke="#666" strokeWidth="2" />
        <path d="M22,20 L28,20" stroke="#666" strokeWidth="2" />
        <circle cx="26" cy="12" r="5" fill="#F5CBA7" />
        <rect x="22" y="17" width="8" height="10" rx="3" fill={color || '#3498DB'} />
        <g style={{ transformOrigin: '12px 34px', animation: `pedalSpin 0.5s linear infinite` }}>
          <line x1="12" y1="28" x2="12" y2="40" stroke="#555" strokeWidth="2" />
        </g>
      </svg>
    </div>
  )
}

// Hotdog cart (NYC)
function HotdogCart({ x }) {
  return (
    <div className="absolute" style={{
      left: `${x}%`, bottom: '12%',
      animation: `fadeInPlace 1s ease-out forwards`,
      opacity: 0,
    }}>
      <svg width="60" height="50" viewBox="0 0 60 50" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>
        <rect x="5" y="15" width="50" height="25" rx="3" fill="#C0392B" />
        <rect x="8" y="18" width="44" height="8" rx="2" fill="#E74C3C" />
        <text x="12" y="24.5" fontSize="6" fill="#FFD700" fontWeight="bold">HOT DOGS</text>
        <rect x="5" y="40" width="50" height="4" rx="1" fill="#888" />
        <circle cx="12" cy="47" r="4" fill="#333" />
        <circle cx="48" cy="47" r="4" fill="#333" />
        <rect x="20" y="8" width="20" height="8" rx="2" fill="#E8C84A" />
        <rect x="25" y="2" width="2" height="8" fill="#888" />
        <rect x="22" y="0" width="8" height="4" rx="1" fill="#FFF" stroke="#DDD" strokeWidth="0.5" />
      </svg>
    </div>
  )
}

// Food truck (Austin)
function FoodTruck({ goingRight, duration, delay }) {
  return (
    <div className="absolute" style={{
      top: '76%',
      left: goingRight ? '-15%' : '115%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      opacity: 0,
    }}>
      <svg width="100" height="50" viewBox="0 0 100 50" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))',
      }}>
        <rect x="10" y="8" width="70" height="30" rx="4" fill="#2ECC71" />
        <rect x="80" y="15" width="15" height="23" rx="3" fill="#27AE60" />
        <rect x="82" y="18" width="10" height="10" rx="1" fill="rgba(150,200,255,0.5)" />
        <text x="20" y="28" fontSize="8" fill="#FFF" fontWeight="bold">TACOS</text>
        <rect x="20" y="10" width="18" height="10" rx="1" fill="rgba(150,200,255,0.5)" />
        <circle cx="25" cy="44" r="5" fill="#222" />
        <circle cx="70" cy="44" r="5" fill="#222" />
        <circle cx="88" cy="44" r="5" fill="#222" />
      </svg>
    </div>
  )
}

// Guitarist sitting on sidewalk
function Guitarist({ x }) {
  return (
    <div className="absolute" style={{
      left: `${x}%`, bottom: '10%',
      animation: `fadeInPlace 1s ease-out forwards`,
      opacity: 0,
    }}>
      <svg width="36" height="48" viewBox="0 0 36 48" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
        <circle cx="18" cy="7" r="6" fill="#F5CBA7" />
        <ellipse cx="18" cy="4" rx="7" ry="5" fill="#2C2C2C" />
        <rect x="12" y="13" width="12" height="16" rx="3" fill="#E74C3C" />
        <rect x="8" y="29" width="8" height="12" rx="2" fill="#34495E" />
        <rect x="20" y="29" width="8" height="12" rx="2" fill="#34495E" />
        <ellipse cx="28" cy="30" rx="6" ry="10" fill="#8B4513" stroke="#6B3410" strokeWidth="0.5" style={{ animation: `guitarStrum 1s ease-in-out infinite alternate` }} />
        <line x1="28" y1="20" x2="28" y2="40" stroke="#6B3410" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

// Surfer walking with board (Miami)
function Surfer({ goingRight, yPosition, duration, delay, scale }) {
  return (
    <div className="absolute" style={{
      top: `${yPosition}%`,
      left: goingRight ? '-8%' : '108%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      transform: `scale(${scale})`,
      opacity: 0,
    }}>
      <svg width="50" height="60" viewBox="0 0 50 60" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
      }}>
        <circle cx="20" cy="7" r="6" fill="#D4A574" />
        <rect x="14" y="13" width="12" height="16" rx="3" fill="#00BCD4" />
        <g style={{ transformOrigin: '20px 31px', animation: `legSwing 0.5s ease-in-out infinite alternate` }}>
          <rect x="14" y="29" width="5" height="18" rx="2" fill="#D4A574" />
        </g>
        <g style={{ transformOrigin: '20px 31px', animation: `legSwing 0.5s ease-in-out infinite alternate-reverse` }}>
          <rect x="21" y="29" width="5" height="18" rx="2" fill="#D4A574" />
        </g>
        <rect x="32" y="0" width="4" height="55" rx="2" fill="#F39C12" transform="rotate(8 34 30)" />
      </svg>
    </div>
  )
}

// Food vendor (Vietnam)
function FoodVendor({ x }) {
  return (
    <div className="absolute" style={{
      left: `${x}%`, bottom: '10%',
      animation: `fadeInPlace 1s ease-out forwards`,
      opacity: 0,
    }}>
      <svg width="50" height="50" viewBox="0 0 50 50" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>
        <circle cx="25" cy="8" r="5" fill="#F5CBA7" />
        <ellipse cx="25" cy="3" rx="12" ry="5" fill="#8B7355" />
        <rect x="19" y="13" width="12" height="14" rx="3" fill="#E8C84A" />
        <rect x="17" y="27" width="7" height="15" rx="2" fill="#34495E" />
        <rect x="26" y="27" width="7" height="15" rx="2" fill="#34495E" />
        <rect x="5" y="18" width="40" height="3" rx="1" fill="#8B4513" />
        <circle cx="10" cy="22" r="4" fill="#FF6347" opacity="0.8" />
        <circle cx="20" cy="22" r="4" fill="#32CD32" opacity="0.8" />
        <circle cx="40" cy="22" r="4" fill="#FFD700" opacity="0.8" />
      </svg>
    </div>
  )
}

// Coffee cup floating (Seattle)
function CoffeeCup({ x, delay }) {
  return (
    <div className="absolute" style={{
      left: `${x}%`, bottom: '30%',
      animation: `floatUp 5s ${delay}s ease-out infinite`,
      opacity: 0,
    }}>
      <svg width="20" height="24" viewBox="0 0 20 24">
        <rect x="4" y="6" width="12" height="16" rx="2" fill="#6B4226" />
        <rect x="4" y="6" width="12" height="4" rx="1" fill="#8B5E3C" />
        <path d="M16,10 Q20,10 20,14 Q20,18 16,18" fill="none" stroke="#6B4226" strokeWidth="1.5" />
        <path d="M7,3 Q8,0 9,3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" style={{ animation: `steamWiggle 1.5s ease-in-out infinite` }} />
        <path d="M10,4 Q11,1 12,4" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" style={{ animation: `steamWiggle 1.5s 0.3s ease-in-out infinite` }} />
      </svg>
    </div>
  )
}

// Vending machine glow (Tokyo)
function VendingMachine({ x }) {
  const glowColor = ['#FF4444', '#4444FF', '#44FF44', '#FF44FF'][Math.floor(Math.random() * 4)]
  return (
    <div className="absolute" style={{
      left: `${x}%`, bottom: '8%',
      animation: `fadeInPlace 1s ease-out forwards`,
      opacity: 0,
    }}>
      <svg width="28" height="44" viewBox="0 0 28 44" style={{ filter: `drop-shadow(0 0 8px ${glowColor}40)` }}>
        <rect x="2" y="2" width="24" height="40" rx="2" fill="#2C3E50" />
        <rect x="4" y="4" width="20" height="18" rx="1" fill={glowColor} opacity="0.3" />
        <rect x="6" y="6" width="6" height="6" rx="1" fill={glowColor} opacity="0.6" />
        <rect x="14" y="6" width="6" height="6" rx="1" fill={glowColor} opacity="0.5" />
        <rect x="6" y="14" width="6" height="6" rx="1" fill={glowColor} opacity="0.4" />
        <rect x="14" y="14" width="6" height="6" rx="1" fill={glowColor} opacity="0.7" />
        <rect x="8" y="26" width="12" height="6" rx="1" fill="#111" />
        <rect x="10" y="34" width="3" height="3" rx="0.5" fill={glowColor} opacity="0.8" style={{ animation: `neonFlicker 3s ease-in-out infinite` }} />
      </svg>
    </div>
  )
}

// Street performer juggling (Barcelona)
function StreetPerformer({ x }) {
  return (
    <div className="absolute" style={{
      left: `${x}%`, bottom: '12%',
      animation: `fadeInPlace 1s ease-out forwards`,
      opacity: 0,
    }}>
      <svg width="40" height="60" viewBox="0 0 40 60" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
        <circle cx="20" cy="8" r="6" fill="#F5CBA7" />
        <rect x="14" y="14" width="12" height="18" rx="3" fill="#9B59B6" />
        <rect x="12" y="32" width="7" height="18" rx="2" fill="#2C3E50" />
        <rect x="21" y="32" width="7" height="18" rx="2" fill="#2C3E50" />
        {/* Juggling balls */}
        <circle cx="8" cy="4" r="3" fill="#E74C3C" style={{ animation: `juggle1 1s ease-in-out infinite` }} />
        <circle cx="20" cy="0" r="3" fill="#F39C12" style={{ animation: `juggle2 1s ease-in-out infinite` }} />
        <circle cx="32" cy="4" r="3" fill="#2ECC71" style={{ animation: `juggle3 1s ease-in-out infinite` }} />
      </svg>
    </div>
  )
}

// Jogger
function Jogger({ goingRight, yPosition, duration, delay, scale }) {
  return (
    <div className="absolute" style={{
      top: `${yPosition}%`,
      left: goingRight ? '-6%' : '106%',
      animation: `walkAcross${goingRight ? 'Right' : 'Left'} ${duration}s ${delay}s linear forwards`,
      transform: `scale(${scale})`,
      opacity: 0,
    }}>
      <svg width="36" height="56" viewBox="0 0 36 56" style={{
        transform: goingRight ? 'scaleX(1)' : 'scaleX(-1)',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
      }}>
        <circle cx="18" cy="7" r="6" fill="#F5CBA7" />
        <rect x="12" y="13" width="12" height="14" rx="3" fill="#E74C3C" />
        <g style={{ transformOrigin: '14px 27px', animation: `legSwing 0.25s ease-in-out infinite alternate` }}>
          <rect x="11" y="27" width="6" height="18" rx="2" fill="#2C3E50" />
          <rect x="10" y="43" width="8" height="4" rx="2" fill="#FFF" />
        </g>
        <g style={{ transformOrigin: '22px 27px', animation: `legSwing 0.25s ease-in-out infinite alternate-reverse` }}>
          <rect x="19" y="27" width="6" height="18" rx="2" fill="#2C3E50" />
          <rect x="18" y="43" width="8" height="4" rx="2" fill="#FFF" />
        </g>
        <g style={{ transformOrigin: '10px 15px', animation: `armSwing 0.25s ease-in-out infinite alternate` }}>
          <rect x="5" y="14" width="6" height="12" rx="3" fill="#F5CBA7" />
        </g>
        <g style={{ transformOrigin: '26px 15px', animation: `armSwing 0.25s ease-in-out infinite alternate-reverse` }}>
          <rect x="25" y="14" width="6" height="12" rx="3" fill="#F5CBA7" />
        </g>
      </svg>
    </div>
  )
}

function CityAnimations({ cityName, timeOfDay, weatherType }) {
  const [entities, setEntities] = useState([])
  const idRef = useRef(0)
  const config = CITY_ANIMATIONS[cityName] || CITY_ANIMATIONS['New York']
  const isNight = timeOfDay === 'night' || timeOfDay === 'evening'
  const isRainy = weatherType === 'rain' || weatherType === 'storm'

  const shirtColors = ['#2C3E50', '#E74C3C', '#3498DB', '#27AE60', '#8E44AD', '#F39C12', '#1ABC9C', '#ECF0F1', '#D35400', '#2980B9']
  const hairColors = ['#2C2C2C', '#4A3728', '#8B4513', '#DEB887', '#C0392B', '#1A1A2E', '#FFD700']

  useEffect(() => {
    setEntities([])
    idRef.current = 0

    const spawn = () => {
      const id = idRef.current++
      const elements = config.elements
      const element = elements[Math.floor(Math.random() * elements.length)]
      const goingRight = Math.random() > 0.5
      const delay = 0

      let entity = { id, element, goingRight, delay, spawnTime: Date.now() }

      switch (element) {
        case 'people':
        case 'performers':
          entity.yPosition = 75 + Math.random() * 15
          entity.duration = 12 + Math.random() * 10
          entity.scale = 0.7 + Math.random() * 0.5
          entity.shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)]
          entity.hairColor = hairColors[Math.floor(Math.random() * hairColors.length)]
          entity.color = entity.shirtColor
          entity.hasUmbrella = isRainy
          break
        case 'cars':
        case 'taxi':
          entity.yPosition = 80 + Math.random() * 10
          entity.duration = 6 + Math.random() * 5
          entity.scale = 0.8 + Math.random() * 0.4
          entity.carColor = element === 'taxi' ? '#F1C40F' : ['#2C3E50', '#E74C3C', '#3498DB', '#F39C12', '#1ABC9C', '#ECF0F1'][Math.floor(Math.random() * 6)]
          break
        case 'scooters':
          entity.yPosition = 78 + Math.random() * 12
          entity.duration = 5 + Math.random() * 4
          entity.scale = 0.8 + Math.random() * 0.3
          break
        case 'neon':
          entity.baseX = 15 + Math.random() * 50
          entity.baseY = 15 + Math.random() * 30
          break
        case 'birds':
          entity.delay = Math.random() * 3
          break
        case 'music':
          entity.x = 20 + Math.random() * 60
          entity.delay = Math.random() * 2
          break
        case 'palms':
          entity.x = Math.random() * 90
          break
        case 'tram':
        case 'cablecar':
          entity.duration = 15 + Math.random() * 5
          break
        case 'bus':
          entity.duration = 12 + Math.random() * 5
          break
        case 'trains':
          entity.duration = 5 + Math.random() * 3
          entity.yPosition = 82 + Math.random() * 8
          break
        case 'boat':
          entity.yPosition = 85 + Math.random() * 8
          entity.duration = 18 + Math.random() * 10
          entity.boatColor = ['#F5F5DC', '#8B4513', '#FFF', '#2980B9'][Math.floor(Math.random() * 4)]
          break
        case 'cyclist':
        case 'jogger':
          entity.yPosition = 78 + Math.random() * 12
          entity.duration = element === 'jogger' ? (8 + Math.random() * 5) : (10 + Math.random() * 6)
          entity.scale = 0.7 + Math.random() * 0.4
          entity.color = shirtColors[Math.floor(Math.random() * shirtColors.length)]
          break
        case 'surfer':
          entity.yPosition = 80 + Math.random() * 10
          entity.duration = 14 + Math.random() * 6
          entity.scale = 0.8 + Math.random() * 0.3
          break
        case 'hotdog-cart':
        case 'foodvendor':
        case 'vending-machine':
        case 'guitarist':
        case 'foodtruck':
        case 'coffee-cup':
          entity.x = 15 + Math.random() * 65
          entity.delay = Math.random() * 2
          break
        default:
          break
      }

      setEntities(prev => {
        const filtered = prev.filter(e => Date.now() - e.spawnTime < 30000)
        return [...filtered.slice(-15), entity]
      })
    }

    // Spawn first few quickly
    const initialTimer = setTimeout(() => {
      spawn()
      setTimeout(() => spawn(), 800)
      setTimeout(() => spawn(), 1600)
      setTimeout(() => spawn(), 2400)
    }, 500)

    // Then regularly
    const interval = setInterval(() => {
      spawn()
    }, 2500 + Math.random() * 2500)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [cityName, isRainy]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {entities.map(entity => {
        switch (entity.element) {
          case 'people':
            return <WalkingPerson key={entity.id} {...entity} />
          case 'performers':
            return <StreetPerformer key={entity.id} x={entity.x || 50} />
          case 'cars':
          case 'taxi':
            return <AnimatedCar key={entity.id} {...entity} />
          case 'scooters':
            return <ScooterSilhouette key={entity.id} {...entity} />
          case 'neon':
            return isNight || timeOfDay === 'dusk' ? (
              <NeonCluster key={entity.id} baseX={entity.baseX} baseY={entity.baseY} />
            ) : null
          case 'birds':
            return !isNight ? <BirdFlock key={entity.id} delay={entity.delay} /> : null
          case 'music':
            return <MusicNotes key={entity.id} x={entity.x} delay={entity.delay} />
          case 'palms':
            return <PalmTreeSway key={entity.id} x={entity.x} />
          case 'tram':
          case 'cablecar':
            return <TramCar key={entity.id} goingRight={entity.goingRight} duration={entity.duration} delay={0} />
          case 'bus':
            return <DoubleDecker key={entity.id} goingRight={entity.goingRight} duration={entity.duration} delay={0} />
          case 'trains':
            return <AnimatedCar key={entity.id} {...entity} carColor="#CCCCCC" scale={1.2} />
          case 'boat':
            return <Boat key={entity.id} goingRight={entity.goingRight} yPosition={entity.yPosition} duration={entity.duration} delay={0} boatColor={entity.boatColor} />
          case 'cyclist':
            return <Cyclist key={entity.id} {...entity} />
          case 'jogger':
            return <Jogger key={entity.id} {...entity} />
          case 'surfer':
            return <Surfer key={entity.id} {...entity} />
          case 'hotdog-cart':
            return <HotdogCart key={entity.id} x={entity.x} />
          case 'foodtruck':
            return <FoodTruck key={entity.id} goingRight={entity.goingRight} duration={12} delay={0} />
          case 'guitarist':
            return <Guitarist key={entity.id} x={entity.x} />
          case 'foodvendor':
            return <FoodVendor key={entity.id} x={entity.x} />
          case 'coffee-cup':
            return <CoffeeCup key={entity.id} x={entity.x} delay={entity.delay} />
          case 'vending-machine':
            return <VendingMachine key={entity.id} x={entity.x} />
          default:
            return null
        }
      })}
      <style>{`
        @keyframes walkAcrossRight {
          0% { left: -10%; opacity: 0; }
          3% { opacity: 0.85; }
          97% { opacity: 0.85; }
          100% { left: 110%; opacity: 0; }
        }
        @keyframes walkAcrossLeft {
          0% { left: 110%; opacity: 0; }
          3% { opacity: 0.85; }
          97% { opacity: 0.85; }
          100% { left: -10%; opacity: 0; }
        }
        @keyframes legSwing {
          0% { transform: rotate(-15deg); }
          100% { transform: rotate(15deg); }
        }
        @keyframes armSwing {
          0% { transform: rotate(-20deg); }
          100% { transform: rotate(20deg); }
        }
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; }
          5% { opacity: 0.3; }
          6% { opacity: 1; }
          30% { opacity: 0.95; }
          32% { opacity: 0.3; }
          33% { opacity: 1; }
          60% { opacity: 1; }
          62% { opacity: 0.5; }
          63% { opacity: 1; }
          80% { opacity: 0.9; }
          82% { opacity: 0.4; }
          83% { opacity: 1; }
        }
        @keyframes birdFlap {
          0% { transform: scaleY(1); }
          100% { transform: scaleY(0.6); }
        }
        @keyframes floatUp {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.7; }
          85% { opacity: 0.5; }
          100% { transform: translateY(-80px) rotate(15deg); opacity: 0; }
        }
        @keyframes palmSway {
          0% { transform: rotate(-3deg); }
          100% { transform: rotate(3deg); }
        }
        @keyframes boatBob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(1deg); }
          75% { transform: translateY(2px) rotate(-1deg); }
        }
        @keyframes fadeInPlace {
          0% { opacity: 0; transform: translateY(5px); }
          100% { opacity: 0.85; transform: translateY(0); }
        }
        @keyframes pedalSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes guitarStrum {
          0% { transform: rotate(-2deg); }
          100% { transform: rotate(2deg); }
        }
        @keyframes steamWiggle {
          0%, 100% { transform: translateX(0) translateY(0); opacity: 0.4; }
          50% { transform: translateX(2px) translateY(-3px); opacity: 0.7; }
        }
        @keyframes juggle1 {
          0% { transform: translate(0, 0); }
          25% { transform: translate(10px, -15px); }
          50% { transform: translate(20px, 0); }
          75% { transform: translate(10px, -15px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes juggle2 {
          0% { transform: translate(0, -15px); }
          25% { transform: translate(10px, 0); }
          50% { transform: translate(0, -15px); }
          75% { transform: translate(-10px, 0); }
          100% { transform: translate(0, -15px); }
        }
        @keyframes juggle3 {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-10px, -15px); }
          50% { transform: translate(-20px, 0); }
          75% { transform: translate(-10px, -15px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  )
}

// --- Photo-based fallback scene (replaces SVG buildings) ---

function PhotoFallback({ cityName, weatherType, timeOfDay }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'evening'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(null)
  const [currentLoaded, setCurrentLoaded] = useState(false)
  const [nextLoaded, setNextLoaded] = useState(false)
  const [fading, setFading] = useState(false)
  const photos = CITY_PHOTOS[cityName] || []

  // Reset on city change
  useEffect(() => {
    const idx = Math.floor(Math.random() * photos.length)
    setCurrentIndex(idx)
    setNextIndex(null)
    setCurrentLoaded(false)
    setNextLoaded(false)
    setFading(false)
  }, [cityName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rotate photos every 10 seconds
  useEffect(() => {
    if (photos.length <= 1) return
    const interval = setInterval(() => {
      setNextIndex(prev => {
        const next = (currentIndex + 1 + Math.floor(Math.random() * (photos.length - 1))) % photos.length
        return next
      })
      setNextLoaded(false)
    }, 10000)
    return () => clearInterval(interval)
  }, [currentIndex, photos.length])

  // When next photo loads, start crossfade
  useEffect(() => {
    if (nextLoaded && nextIndex !== null) {
      setFading(true)
      const timer = setTimeout(() => {
        setCurrentIndex(nextIndex)
        setCurrentLoaded(true)
        setNextIndex(null)
        setNextLoaded(false)
        setFading(false)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [nextLoaded, nextIndex])

  // Sky gradient as base (always rendered)
  const skyGradients = {
    'sunny-day': 'linear-gradient(180deg, #2E6CB5 0%, #4A90D9 25%, #87CEEB 55%, #B8E6F0 80%, #E8F4E8 100%)',
    'sunny-dawn': 'linear-gradient(180deg, #1A1A3E 0%, #4A2C6B 15%, #C06070 35%, #E8857A 50%, #F5C26B 70%, #FFE8A0 100%)',
    'sunny-dusk': 'linear-gradient(180deg, #1A1A3E 0%, #3A2060 15%, #8B3A50 35%, #C06050 50%, #F0A050 70%, #FFD080 100%)',
    'cloudy-day': 'linear-gradient(180deg, #6B7D8E 0%, #8899AA 25%, #AABBCC 55%, #C5D0D8 80%, #D8DFE5 100%)',
    'rain-day': 'linear-gradient(180deg, #2D3748 0%, #4A5568 25%, #718096 55%, #A0AEC0 80%, #B8C5D0 100%)',
    'snow-day': 'linear-gradient(180deg, #A0B0C0 0%, #CBD5E0 25%, #E2E8F0 55%, #F0F4F8 80%, #F7FAFC 100%)',
    'storm-day': 'linear-gradient(180deg, #0F1520 0%, #1A202C 25%, #2D3748 55%, #4A5568 80%, #5A6678 100%)',
    'fog-day': 'linear-gradient(180deg, #A8B8C8 0%, #CBD5E0 25%, #E2E8F0 55%, #EDF2F7 80%, #F5F8FA 100%)',
    'night': 'linear-gradient(180deg, #050A15 0%, #0F172A 20%, #1E293B 50%, #263548 75%, #334155 100%)',
    'evening': 'linear-gradient(180deg, #0A1628 0%, #1E3A5F 25%, #2D4A7A 50%, #3D5A8A 75%, #4A6FA5 100%)',
  }
  const key = isNight
    ? timeOfDay
    : `${weatherType}-${timeOfDay === 'dawn' || timeOfDay === 'dusk' ? timeOfDay : 'day'}`

  return (
    <div className="absolute inset-0">
      {/* Base gradient sky */}
      <div className="absolute inset-0" style={{
        background: skyGradients[key] || skyGradients['sunny-day'],
      }} />

      {/* Current city photo */}
      {photos[currentIndex] && (
        <img
          src={getUnsplashUrl(photos[currentIndex])}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: currentLoaded ? (fading ? 0 : 1) : 0 }}
          onLoad={() => setCurrentLoaded(true)}
          crossOrigin="anonymous"
        />
      )}
      {/* Next photo (crossfade in) */}
      {nextIndex !== null && photos[nextIndex] && (
        <img
          src={getUnsplashUrl(photos[nextIndex])}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1200"
          style={{ opacity: fading ? 1 : 0, transitionDuration: '1200ms' }}
          onLoad={() => setNextLoaded(true)}
          crossOrigin="anonymous"
        />
      )}

      {/* Time-of-day color grading overlay */}
      {isNight && (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(5,10,30,0.7) 0%, rgba(10,20,50,0.5) 50%, rgba(15,25,55,0.6) 100%)',
          mixBlendMode: 'multiply',
        }} />
      )}
      {timeOfDay === 'dawn' && (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(60,20,80,0.3) 0%, rgba(200,100,80,0.2) 50%, rgba(255,180,100,0.15) 100%)',
          mixBlendMode: 'overlay',
        }} />
      )}
      {timeOfDay === 'dusk' && (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(60,20,80,0.35) 0%, rgba(180,80,50,0.25) 50%, rgba(255,160,60,0.2) 100%)',
          mixBlendMode: 'overlay',
        }} />
      )}

      {/* Weather overlays on photo */}
      {(weatherType === 'rain' || weatherType === 'storm') && (
        <div className="absolute inset-0" style={{
          background: 'rgba(30,40,50,0.3)',
        }} />
      )}
      {weatherType === 'fog' && (
        <div className="absolute inset-0" style={{
          background: 'rgba(200,210,220,0.4)',
        }} />
      )}
    </div>
  )
}

// --- Info Card ---

function InfoCard({ city, temperature, weatherDesc, timezone }) {
  const tempF = temperature != null ? Math.round(temperature * 9 / 5 + 32) : null
  return (
    <div className="absolute z-30"
      style={{
        top: 'max(24px, 12%)',
        left: 'max(24px, 8%)',
        padding: '14px 20px',
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '14px',
        minWidth: '140px',
      }}>
      <h3 className="font-serif text-lg font-light text-white drop-shadow-md tracking-wide leading-tight">{city}</h3>
      {temperature != null && (
        <p className="text-xs text-white/90 drop-shadow-sm font-sans font-light mt-1.5">
          {Math.round(temperature)}°C / {tempF}°F
        </p>
      )}
      {weatherDesc && (
        <p className="text-xs text-white/70 drop-shadow-sm font-sans font-light mt-0.5 capitalize">{weatherDesc}</p>
      )}
      <p className="text-xs text-white/55 font-sans font-light mt-0.5">{getCityTime(timezone)}</p>
    </div>
  )
}

// --- Window Frame ---

function WindowFrame({ children, timeOfDay }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'evening'

  return (
    <div className="relative w-full h-full flex items-center justify-center"
      style={{
        background: isNight
          ? 'linear-gradient(135deg, #1a1510 0%, #2a2018 50%, #1a1510 100%)'
          : 'linear-gradient(135deg, #F5F0E8 0%, #E8E0D0 50%, #F0EBE3 100%)',
      }}>

      {/* Subtle wall texture */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'.8\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'.5\'/%3E%3C/svg%3E")',
      }} />

      {/* Room ambient light */}
      {isNight && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 80%, rgba(255,180,80,0.08) 0%, transparent 60%)',
        }} />
      )}

      {/* Window container */}
      <div className="relative" style={{ width: '85vw', height: '85vh', maxWidth: '1400px', maxHeight: '900px' }}>

        {/* SVG clip path for arched window shape */}
        <svg className="absolute" width="0" height="0">
          <defs>
            <clipPath id="archClip" clipPathUnits="objectBoundingBox">
              <path d="M 0 1 L 0 0.22 Q 0 0, 0.12 0 L 0.88 0 Q 1 0, 1 0.22 L 1 1 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* Outer frame with wood grain */}
        <div className="absolute" style={{
          inset: '-14px',
          clipPath: 'url(#archClip)',
          background: 'linear-gradient(180deg, #5C4318 0%, #7A5A2E 20%, #6B4C22 40%, #7A5A2E 60%, #5C4318 80%, #4A3612 100%)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)',
        }}>
          <div className="absolute inset-0 opacity-[0.08]" style={{
            background: 'repeating-linear-gradient(180deg, transparent, transparent 8px, rgba(0,0,0,0.15) 8px, transparent 9px)',
          }} />
        </div>

        {/* Glass area */}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'url(#archClip)' }}>
          {children}

          {/* Subtle glass reflection */}
          <div className="absolute inset-0 pointer-events-none z-20" style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.03) 100%)',
          }} />
        </div>

        {/* Center mullion */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[6px] z-20 pointer-events-none" style={{
          clipPath: 'url(#archClip)',
          background: 'linear-gradient(90deg, #4A3612, #7A5A2E, #4A3612)',
          boxShadow: '0 0 6px rgba(0,0,0,0.3)',
        }} />

        {/* Horizontal bar at 60% */}
        <div className="absolute left-0 right-0 top-[60%] h-[6px] z-20 pointer-events-none" style={{
          background: 'linear-gradient(180deg, #4A3612, #7A5A2E, #4A3612)',
          boxShadow: '0 0 6px rgba(0,0,0,0.3)',
        }} />

        {/* Window sill */}
        <div className="absolute -bottom-3 left-[-3%] right-[-3%] h-10 z-30" style={{
          background: 'linear-gradient(180deg, #7A5A2E 0%, #6B4C22 50%, #5C4318 100%)',
          borderRadius: '0 0 6px 6px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.1)',
        }}>
          <div className="absolute top-1 left-0 right-0 h-[1px] bg-white/5" />
        </div>

      </div>
    </div>
  )
}

// --- Loading state ---

function LoadingView() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10" style={{
      background: 'linear-gradient(180deg, #4A6FA5 0%, #87AECC 40%, #C5D5E0 70%, #D8DFE5 100%)',
    }}>
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-white/30 border-t-white/80" style={{
          animation: 'spin 1s linear infinite',
        }} />
        <p className="font-serif text-xl text-white/80 tracking-wider drop-shadow-md">Looking outside...</p>
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function ImageLoadingIndicator() {
  return (
    <div className="absolute top-6 right-6 z-30 px-4 py-2 rounded-full" style={{
      background: 'rgba(0,0,0,0.3)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full border border-white/40 border-t-white/90" style={{
          animation: 'spin 1s linear infinite',
        }} />
        <span className="text-xs text-white/70 font-sans">Generating scene...</span>
      </div>
    </div>
  )
}

// --- Frosted transition ---

function FrostedTransition({ active }) {
  return (
    <div className={`absolute inset-0 z-30 pointer-events-none transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0'}`}
      style={{
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }} />
  )
}

// --- Back button for scene view ---

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-6 left-6 z-50 flex items-center gap-2 font-sans text-sm font-medium px-4 py-2.5 rounded-full transition-all duration-200"
      style={{
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.9)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Globe
    </button>
  )
}

// --- Scene view (the window looking out) ---

function SceneView({ cityData, onBack }) {
  const [location, setLocation] = useState(null)
  const [weather, setWeather] = useState(null)
  const [sceneImage, setSceneImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const detectLocation = useCallback(async () => {
    try {
      const res = await fetch('https://ipapi.co/json/')
      const data = await res.json()
      if (data.city && data.latitude) {
        return { city: data.city, lat: data.latitude, lon: data.longitude, tz: data.timezone }
      }
    } catch (e) { console.warn('IP geolocation failed:', e) }
    return { city: 'New York', lat: 40.7128, lon: -74.006, tz: 'America/New_York' }
  }, [])

  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      )
      const data = await res.json()
      const cw = data.current_weather
      return {
        temperature: cw.temperature,
        weatherCode: cw.weathercode,
        windSpeed: cw.windspeed,
        description: WMO_CODES[cw.weathercode] || 'Clear sky',
      }
    } catch (e) {
      console.warn('Weather fetch failed:', e)
      return { temperature: 20, weatherCode: 0, windSpeed: 5, description: 'Clear sky' }
    }
  }, [])

  const generateScene = useCallback(async (city, weatherData, tz) => {
    const hour = getCityHour(tz)
    try {
      const promptRes = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city, weather: weatherData.description,
          temperature: weatherData.temperature, hour,
        }),
      })
      if (!promptRes.ok) throw new Error('Prompt generation failed')
      const { prompt } = await promptRes.json()

      let image = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })
        const imgData = await imgRes.json()
        if (imgRes.ok) {
          image = imgData.image
          break
        }
        if (imgData.retry && attempt < 2) {
          await new Promise(r => setTimeout(r, 5000))
          continue
        }
        throw new Error('Image generation failed')
      }
      return image
    } catch (e) {
      console.warn('Scene generation failed:', e)
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setTransitioning(true)
      setLoading(true)

      await new Promise(r => setTimeout(r, 300))

      let loc
      if (!cityData || cityData.name === 'Auto') {
        loc = await detectLocation()
      } else {
        loc = { city: cityData.name, lat: cityData.lat, lon: cityData.lon, tz: cityData.tz }
      }

      if (cancelled) return
      setLocation(loc)

      const weatherData = await fetchWeather(loc.lat, loc.lon)
      if (cancelled) return
      setWeather(weatherData)
      setTransitioning(false)
      setLoading(false)
      setImageLoading(true)

      const image = await generateScene(loc.city, weatherData, loc.tz)
      if (cancelled) return
      if (image) {
        setSceneImage(image)
      }
      setImageLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [cityData]) // eslint-disable-line react-hooks/exhaustive-deps

  const weatherType = weather ? getWeatherType(weather.weatherCode) : 'sunny'
  const timeOfDay = location ? getTimeOfDay(getCityHour(location.tz)) : 'day'

  return (
    <div className="w-screen h-screen overflow-hidden select-none">
      <WindowFrame timeOfDay={timeOfDay}>
        {loading && !weather ? (
          <LoadingView />
        ) : (
          <>
            {sceneImage ? (
              <div className="absolute inset-0 transition-opacity duration-1000"
                style={{ opacity: transitioning ? 0 : 1 }}>
                <img src={sceneImage} alt="Scene" className="w-full h-full object-cover" />
              </div>
            ) : (
              <PhotoFallback
                cityName={location?.city || 'New York'}
                weatherType={weatherType}
                timeOfDay={timeOfDay}
              />
            )}

            <WeatherEffects weatherType={weatherType} timeOfDay={timeOfDay} />
            <StarsEffect timeOfDay={timeOfDay} />
            <CityAnimations cityName={location?.city || 'New York'} timeOfDay={timeOfDay} weatherType={weatherType} />

            {imageLoading && <ImageLoadingIndicator />}

            {location && weather && (
              <InfoCard
                city={location.city}
                temperature={weather.temperature}
                weatherDesc={weather.description}
                timezone={location.tz}
              />
            )}
          </>
        )}

        <FrostedTransition active={transitioning} />
      </WindowFrame>

      <BackButton onClick={onBack} />
    </div>
  )
}

// --- Main App ---

export default function App() {
  const [view, setView] = useState('globe') // 'globe' or 'scene'
  const [selectedCity, setSelectedCity] = useState(null)

  const handleCitySelect = useCallback((city) => {
    setSelectedCity(city)
    setView('scene')
  }, [])

  const handleBack = useCallback(() => {
    setView('globe')
    setSelectedCity(null)
  }, [])

  if (view === 'scene' && selectedCity) {
    return <SceneView cityData={selectedCity} onBack={handleBack} />
  }

  return (
    <div className="w-screen h-screen overflow-hidden select-none">
      <Suspense fallback={
        <div className="w-screen h-screen flex items-center justify-center" style={{
          background: 'radial-gradient(ellipse at center, #0a1628 0%, #050a15 100%)',
        }}>
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-white/30 border-t-white/80" style={{
              animation: 'spin 1s linear infinite',
            }} />
            <p className="font-serif text-xl text-white/60 tracking-wider">Loading globe...</p>
          </div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      }>
        <GlobeView cities={CITIES} onSelectCity={handleCitySelect} />
      </Suspense>
    </div>
  )
}
