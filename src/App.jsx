import React, { useState, useEffect, useCallback, useRef } from 'react'

const CITIES = [
  { name: 'Auto', label: 'My Location', lat: null, lon: null },
  { name: 'New York', label: 'NYC', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { name: 'Miami', label: 'Miami', lat: 25.7617, lon: -80.1918, tz: 'America/New_York' },
  { name: 'Los Angeles', label: 'LA', lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles' },
  { name: 'Chicago', label: 'Chicago', lat: 41.8781, lon: -87.6298, tz: 'America/Chicago' },
  { name: 'London', label: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { name: 'Paris', label: 'Paris', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
  { name: 'Tokyo', label: 'Tokyo', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { name: 'Dubai', label: 'Dubai', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
  { name: 'Honolulu', label: 'Honolulu', lat: 21.3069, lon: -157.8583, tz: 'Pacific/Honolulu' },
  { name: 'Seattle', label: 'Seattle', lat: 47.6062, lon: -122.3321, tz: 'America/Los_Angeles' },
]

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

// ─── Weather Animation Components ───

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

// ─── Stars for night ───

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

// ─── Fallback gradient sky ───

function FallbackSky({ weatherType, timeOfDay }) {
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
  const isNight = timeOfDay === 'night' || timeOfDay === 'evening'
  const key = isNight
    ? timeOfDay
    : `${weatherType}-${timeOfDay === 'dawn' || timeOfDay === 'dusk' ? timeOfDay : 'day'}`

  return (
    <div className="absolute inset-0">
      {/* Sky gradient */}
      <div className="absolute inset-0" style={{
        background: skyGradients[key] || skyGradients['sunny-day'],
      }} />

      {/* Atmospheric haze at horizon */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] pointer-events-none" style={{
        background: isNight
          ? 'linear-gradient(to top, rgba(10,15,25,0.6) 0%, rgba(15,20,35,0.3) 40%, transparent 100%)'
          : weatherType === 'rain' || weatherType === 'storm'
            ? 'linear-gradient(to top, rgba(50,60,70,0.4) 0%, rgba(60,70,80,0.2) 40%, transparent 100%)'
            : 'linear-gradient(to top, rgba(80,90,105,0.25) 0%, rgba(100,110,125,0.1) 40%, transparent 100%)',
      }} />

      {/* Building silhouettes — organic layered skyline */}
      <svg className="absolute bottom-0 left-0 right-0 pointer-events-none" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" style={{ height: '45%', width: '100%' }}>
        <defs>
          <linearGradient id="farBldg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isNight ? '#1a2035' : '#6a7585'} stopOpacity="0.6" />
            <stop offset="100%" stopColor={isNight ? '#0d1520' : '#556070'} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="midBldg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isNight ? '#101828' : '#4a5565'} stopOpacity="0.7" />
            <stop offset="100%" stopColor={isNight ? '#080e18' : '#3a4555'} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="nearBldg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isNight ? '#0a1020' : '#354050'} stopOpacity="0.85" />
            <stop offset="100%" stopColor={isNight ? '#050810' : '#252e3a'} stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {/* Far layer — hazy distant skyline */}
        <path d="M0,280 L0,220 L40,220 L40,180 L55,180 L55,175 L70,175 L70,190 L100,190 L100,160 L110,158 L120,160 L120,140 L130,138 L140,140 L140,185 L170,185 L170,195 L200,195 L200,170 L215,168 L230,170 L230,150 L240,148 L250,150 L250,200 L280,200 L280,175 L310,175 L310,130 L318,125 L325,130 L325,165 L340,165 L340,185 L380,185 L380,155 L395,153 L410,155 L410,195 L440,195 L440,210 L470,210 L470,165 L480,160 L490,165 L490,185 L520,185 L520,145 L530,140 L540,145 L540,175 L570,175 L570,190 L600,190 L600,155 L615,150 L630,155 L630,180 L660,180 L660,200 L700,200 L700,170 L720,168 L740,170 L740,135 L748,130 L755,135 L755,180 L790,180 L790,195 L820,195 L820,160 L835,155 L850,160 L850,190 L880,190 L880,175 L910,175 L910,145 L920,140 L930,145 L930,185 L960,185 L960,200 L1000,200 L1000,170 L1015,168 L1030,170 L1030,195 L1060,195 L1060,180 L1090,180 L1090,155 L1100,150 L1110,155 L1110,190 L1140,190 L1140,210 L1170,210 L1170,195 L1200,195 L1200,280 Z" fill="url(#farBldg)" />
        {/* Mid layer */}
        <path d="M0,280 L0,240 L30,240 L30,225 L60,225 L60,200 L75,198 L90,200 L90,230 L120,230 L120,210 L145,210 L145,190 L155,185 L165,190 L165,220 L200,220 L200,235 L240,235 L240,205 L255,200 L270,205 L270,175 L278,170 L285,175 L285,215 L320,215 L320,230 L360,230 L360,210 L380,208 L400,210 L400,185 L408,180 L415,185 L415,225 L450,225 L450,240 L490,240 L490,215 L510,212 L530,215 L530,195 L538,190 L545,195 L545,230 L580,230 L580,245 L620,245 L620,220 L640,218 L660,220 L660,200 L670,195 L680,200 L680,235 L720,235 L720,210 L745,210 L745,185 L753,180 L760,185 L760,225 L800,225 L800,240 L840,240 L840,215 L860,212 L880,215 L880,230 L920,230 L920,205 L935,200 L950,205 L950,190 L958,185 L965,190 L965,225 L1000,225 L1000,240 L1040,240 L1040,215 L1060,212 L1080,215 L1080,235 L1120,235 L1120,220 L1150,220 L1150,200 L1160,195 L1170,200 L1170,235 L1200,235 L1200,280 Z" fill="url(#midBldg)" />
        {/* Near layer — closest buildings */}
        <path d="M0,280 L0,255 L50,255 L50,245 L80,245 L80,230 L95,228 L110,230 L110,250 L160,250 L160,240 L190,240 L190,225 L205,222 L220,225 L220,250 L270,250 L270,255 L320,255 L320,235 L340,232 L360,235 L360,250 L420,250 L420,240 L450,240 L450,228 L462,225 L475,228 L475,248 L530,248 L530,255 L580,255 L580,242 L600,240 L620,242 L620,255 L680,255 L680,245 L710,245 L710,232 L725,228 L740,232 L740,252 L800,252 L800,255 L850,255 L850,238 L870,235 L890,238 L890,252 L940,252 L940,245 L970,245 L970,230 L982,226 L995,230 L995,248 L1050,248 L1050,255 L1100,255 L1100,242 L1120,240 L1140,242 L1140,255 L1200,255 L1200,280 Z" fill="url(#nearBldg)" />
        {/* Window lights at night */}
        {isNight && (
          <g opacity="0.8">
            <rect x="135" y="195" width="3" height="4" fill="#FFE4A0" rx="0.5" />
            <rect x="155" y="188" width="3" height="4" fill="#FFD580" rx="0.5" />
            <rect x="282" y="178" width="3" height="4" fill="#FFE4A0" rx="0.5" />
            <rect x="318" y="133" width="2" height="3" fill="#FFD580" rx="0.5" />
            <rect x="408" y="183" width="3" height="4" fill="#FFE4A0" rx="0.5" />
            <rect x="485" y="168" width="2" height="3" fill="#FFD580" rx="0.5" />
            <rect x="535" y="148" width="2" height="3" fill="#FFE4A0" rx="0.5" />
            <rect x="615" y="158" width="3" height="4" fill="#FFD580" rx="0.5" />
            <rect x="748" y="138" width="2" height="3" fill="#FFE4A0" rx="0.5" />
            <rect x="835" y="158" width="3" height="4" fill="#FFD580" rx="0.5" />
            <rect x="920" y="148" width="2" height="3" fill="#FFE4A0" rx="0.5" />
            <rect x="960" y="188" width="3" height="4" fill="#FFD580" rx="0.5" />
            <rect x="1100" y="158" width="2" height="3" fill="#FFE4A0" rx="0.5" />
            <rect x="1160" y="198" width="3" height="4" fill="#FFD580" rx="0.5" />
            <rect x="255" y="208" width="3" height="4" fill="#FFE4A0" rx="0.5" />
            <rect x="530" y="198" width="3" height="4" fill="#FFD580" rx="0.5" />
            <rect x="670" y="203" width="3" height="4" fill="#FFE4A0" rx="0.5" />
            <rect x="890" y="218" width="3" height="4" fill="#FFD580" rx="0.5" />
            <rect x="462" y="228" width="3" height="4" fill="#FFE4A0" rx="0.5" />
            <rect x="725" y="233" width="3" height="4" fill="#FFD580" rx="0.5" />
            <rect x="982" y="232" width="3" height="4" fill="#FFE4A0" rx="0.5" />
          </g>
        )}
      </svg>

      {/* Subtle depth haze */}
      <div className="absolute bottom-0 left-0 right-0 h-[15%] pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(180,190,200,0.2) 0%, transparent 100%)',
      }} />
    </div>
  )
}

// ─── Info Card ───

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

// ─── Window Frame — organic arched design ───

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

      {/* Room ambient light — warm glow at night */}
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
          {/* Wood grain lines */}
          <div className="absolute inset-0 opacity-[0.08]" style={{
            background: 'repeating-linear-gradient(180deg, transparent, transparent 8px, rgba(0,0,0,0.15) 8px, transparent 9px)',
          }} />
        </div>

        {/* Glass area */}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'url(#archClip)' }}>
          {children}

          {/* Subtle glass reflection — curved highlight */}
          <div className="absolute inset-0 pointer-events-none z-20" style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.03) 100%)',
          }} />

          {/* Water droplets on glass (rain/storm) */}
        </div>

        {/* Thin center mullion — just a subtle vertical line */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[6px] z-20 pointer-events-none" style={{
          clipPath: 'url(#archClip)',
          background: 'linear-gradient(90deg, #4A3612, #7A5A2E, #4A3612)',
          boxShadow: '0 0 6px rgba(0,0,0,0.3)',
        }} />

        {/* Thin horizontal bar at 60% */}
        <div className="absolute left-0 right-0 top-[60%] h-[6px] z-20 pointer-events-none" style={{
          background: 'linear-gradient(180deg, #4A3612, #7A5A2E, #4A3612)',
          boxShadow: '0 0 6px rgba(0,0,0,0.3)',
        }} />

        {/* Deep window sill with perspective */}
        <div className="absolute -bottom-3 left-[-3%] right-[-3%] h-10 z-30" style={{
          background: 'linear-gradient(180deg, #7A5A2E 0%, #6B4C22 50%, #5C4318 100%)',
          borderRadius: '0 0 6px 6px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.1)',
        }}>
          <div className="absolute top-1 left-0 right-0 h-[1px] bg-white/5" />
        </div>

        {/* Sheer curtain — left, barely there */}
        <div className="absolute top-0 -left-2 w-16 h-full z-25 pointer-events-none" style={{
          clipPath: 'url(#archClip)',
        }}>
          <div className="w-full h-full" style={{
            background: 'linear-gradient(90deg, rgba(255,250,245,0.35) 0%, rgba(255,250,245,0.15) 50%, transparent 100%)',
            animation: 'sheerSway 8s ease-in-out infinite',
            transformOrigin: 'top left',
          }} />
        </div>

        {/* Sheer curtain — right */}
        <div className="absolute top-0 -right-2 w-16 h-full z-25 pointer-events-none" style={{
          clipPath: 'url(#archClip)',
        }}>
          <div className="w-full h-full" style={{
            background: 'linear-gradient(270deg, rgba(255,250,245,0.35) 0%, rgba(255,250,245,0.15) 50%, transparent 100%)',
            animation: 'sheerSway 8s 2s ease-in-out infinite',
            transformOrigin: 'top right',
          }} />
        </div>

        {/* Interior light spilling in at night */}
        {isNight && (
          <div className="absolute -bottom-3 left-[30%] right-[30%] h-10 z-25 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at bottom, rgba(255,200,100,0.25) 0%, transparent 100%)',
          }} />
        )}
      </div>

      <style>{`
        @keyframes sheerSway {
          0%, 100% { transform: skewX(0deg) translateX(0); }
          30% { transform: skewX(0.8deg) translateX(2px); }
          70% { transform: skewX(-0.3deg) translateX(-1px); }
        }
      `}</style>
    </div>
  )
}

// ─── Loading state ───

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

// ─── Frosted transition ───

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

// ─── Main App ───

export default function App() {
  const [selectedCity, setSelectedCity] = useState(null)
  const [location, setLocation] = useState(null)
  const [weather, setWeather] = useState(null)
  const [sceneImage, setSceneImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const abortRef = useRef(null)

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

      // Generate image with retry for model loading
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

  const loadScene = useCallback(async (cityData) => {
    setTransitioning(true)
    setLoading(true)

    await new Promise(r => setTimeout(r, 400))

    let loc = cityData
    if (!cityData || cityData.name === 'Auto') {
      loc = await detectLocation()
    } else {
      loc = { city: cityData.name, lat: cityData.lat, lon: cityData.lon, tz: cityData.tz }
    }

    setLocation(loc)

    const weatherData = await fetchWeather(loc.lat, loc.lon)
    setWeather(weatherData)
    setTransitioning(false)
    setLoading(false)
    setImageLoading(true)

    const image = await generateScene(loc.city, weatherData, loc.tz)
    if (image) {
      setSceneImage(image)
      setImageFailed(false)
    } else {
      setSceneImage(null)
      setImageFailed(true)
    }
    setImageLoading(false)
  }, [detectLocation, fetchWeather, generateScene])

  useEffect(() => {
    loadScene(null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCitySelect = (city) => {
    setSelectedCity(city.name)
    loadScene(city)
  }

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
              <FallbackSky weatherType={weatherType} timeOfDay={timeOfDay} />
            )}

            <WeatherEffects weatherType={weatherType} timeOfDay={timeOfDay} />
            <StarsEffect timeOfDay={timeOfDay} />

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

      {/* City selector — segmented tabs */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]">
        <div className="inline-flex rounded-lg overflow-hidden" style={{
          background: '#F0F0F0',
          border: '1px solid #D4D4D4',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          {CITIES.map((city, i) => {
            const isActive = selectedCity === city.name || (!selectedCity && city.name === 'Auto')
            return (
              <button key={city.name} onClick={() => handleCitySelect(city)}
                className="relative font-sans text-xs font-medium whitespace-nowrap transition-all duration-200"
                style={{
                  padding: '8px 14px',
                  background: isActive ? '#1A6CDB' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#333333',
                  borderRight: i < CITIES.length - 1 ? '1px solid #D4D4D4' : 'none',
                }}
              >
                {city.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
