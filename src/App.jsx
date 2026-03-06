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
  const drops = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 0.5 + Math.random() * 0.5,
    opacity: 0.3 + Math.random() * 0.5,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {drops.map(d => (
        <div key={d.id} className="absolute w-[1px]" style={{
          left: `${d.left}%`, top: '-10%', height: '15%',
          background: 'linear-gradient(transparent, rgba(174,194,224,0.6))',
          animation: `rainFall ${d.duration}s ${d.delay}s linear infinite`,
          opacity: d.opacity,
        }} />
      ))}
      <style>{`
        @keyframes rainFall {
          0% { transform: translateY(0); }
          100% { transform: translateY(750%); }
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

function SunnyEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full" style={{
        background: 'radial-gradient(circle, rgba(255,255,200,0.3) 0%, transparent 70%)',
        animation: 'sunPulse 4s ease-in-out infinite',
      }} />
      {[0, 1, 2].map(i => (
        <div key={i} className="absolute w-[150%] h-16 opacity-5" style={{
          top: `${10 + i * 30}%`, left: '-25%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          animation: `cloudDrift ${30 + i * 10}s ${i * 5}s linear infinite`,
        }} />
      ))}
      <style>{`
        @keyframes sunPulse { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
        @keyframes cloudDrift { 0% { transform: translateX(-30%); } 100% { transform: translateX(30%); } }
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
      {weatherType === 'sunny' && <SunnyEffect />}
      {weatherType === 'cloudy' && <CloudyEffect />}
    </>
  )
}

// ─── City-specific animated overlays ───

function CityOverlay({ city }) {
  const overlayMap = {
    'New York': <NYCOverlay />,
    'London': <LondonOverlay />,
    'Paris': <ParisOverlay />,
    'Tokyo': <TokyoOverlay />,
    'Miami': <MiamiOverlay />,
  }
  return overlayMap[city] || <BirdsOverlay />
}

function NYCOverlay() {
  return (
    <div className="absolute bottom-[12%] left-0 w-full h-8 overflow-hidden pointer-events-none z-10">
      <svg className="absolute" style={{ animation: 'driveCab 12s linear infinite' }} width="60" height="24" viewBox="0 0 60 24">
        <rect x="5" y="4" width="50" height="14" rx="3" fill="#F5C518" />
        <rect x="12" y="6" width="10" height="8" rx="1" fill="#87CEEB" opacity="0.7" />
        <rect x="28" y="6" width="10" height="8" rx="1" fill="#87CEEB" opacity="0.7" />
        <circle cx="15" cy="20" r="3.5" fill="#333" /><circle cx="45" cy="20" r="3.5" fill="#333" />
      </svg>
      <style>{`@keyframes driveCab { 0% { left: -80px; } 100% { left: 110%; } }`}</style>
    </div>
  )
}

function LondonOverlay() {
  return (
    <div className="absolute bottom-[12%] left-0 w-full h-12 overflow-hidden pointer-events-none z-10">
      <svg className="absolute" style={{ animation: 'driveBus 18s linear infinite' }} width="80" height="40" viewBox="0 0 80 40">
        <rect x="2" y="2" width="76" height="30" rx="3" fill="#CC0000" />
        <rect x="6" y="5" width="12" height="10" rx="1" fill="#87CEEB" opacity="0.7" />
        <rect x="22" y="5" width="12" height="10" rx="1" fill="#87CEEB" opacity="0.7" />
        <rect x="38" y="5" width="12" height="10" rx="1" fill="#87CEEB" opacity="0.7" />
        <rect x="54" y="5" width="12" height="10" rx="1" fill="#87CEEB" opacity="0.7" />
        <rect x="2" y="18" width="76" height="14" rx="2" fill="#AA0000" />
        <circle cx="20" cy="36" r="4" fill="#333" /><circle cx="60" cy="36" r="4" fill="#333" />
      </svg>
      <style>{`@keyframes driveBus { 0% { left: 110%; } 100% { left: -100px; } }`}</style>
    </div>
  )
}

function ParisOverlay() {
  return (
    <div className="absolute bottom-[12%] left-0 w-full h-8 overflow-hidden pointer-events-none z-10">
      <svg className="absolute" style={{ animation: 'cyclist 14s linear infinite' }} width="40" height="30" viewBox="0 0 40 30">
        <circle cx="8" cy="24" r="5" fill="none" stroke="#555" strokeWidth="1.5" />
        <circle cx="32" cy="24" r="5" fill="none" stroke="#555" strokeWidth="1.5" />
        <line x1="8" y1="24" x2="20" y2="14" stroke="#555" strokeWidth="1.5" />
        <line x1="32" y1="24" x2="20" y2="14" stroke="#555" strokeWidth="1.5" />
        <line x1="20" y1="14" x2="20" y2="6" stroke="#555" strokeWidth="1.5" />
        <circle cx="20" cy="4" r="3" fill="#555" />
        <line x1="20" y1="8" x2="14" y2="18" stroke="#555" strokeWidth="1" />
        <line x1="20" y1="8" x2="26" y2="12" stroke="#555" strokeWidth="1" />
      </svg>
      <style>{`@keyframes cyclist { 0% { left: -60px; } 100% { left: 110%; } }`}</style>
    </div>
  )
}

function TokyoOverlay() {
  const [flicker, setFlicker] = useState(0.6)
  useEffect(() => {
    const iv = setInterval(() => setFlicker(0.3 + Math.random() * 0.5), 500)
    return () => clearInterval(iv)
  }, [])
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div className="absolute top-[10%] right-[10%] w-32 h-16 rounded" style={{
        background: `rgba(255, 0, 100, ${flicker * 0.08})`,
        boxShadow: `0 0 40px rgba(255, 0, 100, ${flicker * 0.12})`,
      }} />
      <div className="absolute top-[20%] left-[15%] w-24 h-10 rounded" style={{
        background: `rgba(0, 180, 255, ${flicker * 0.06})`,
        boxShadow: `0 0 30px rgba(0, 180, 255, ${flicker * 0.1})`,
      }} />
    </div>
  )
}

function MiamiOverlay() {
  return (
    <div className="absolute bottom-[12%] left-0 w-full h-10 overflow-hidden pointer-events-none z-10">
      <svg className="absolute" style={{ animation: 'walker 20s linear infinite' }} width="20" height="34" viewBox="0 0 20 34">
        <circle cx="10" cy="4" r="3.5" fill="#C68642" />
        <rect x="7" y="8" width="6" height="12" rx="2" fill="#FF6B6B" />
        <line x1="10" y1="20" x2="7" y2="32" stroke="#C68642" strokeWidth="2" />
        <line x1="10" y1="20" x2="13" y2="32" stroke="#C68642" strokeWidth="2" />
      </svg>
      <style>{`@keyframes walker { 0% { left: 110%; } 100% { left: -40px; } }`}</style>
    </div>
  )
}

function BirdsOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {[0, 1, 2].map(i => (
        <svg key={i} className="absolute" style={{
          top: `${8 + i * 12}%`,
          animation: `birdFly ${10 + i * 3}s ${i * 4}s linear infinite`,
        }} width="24" height="10" viewBox="0 0 24 10">
          <path d="M0 5 Q6 0 12 5 Q18 0 24 5" fill="none" stroke="rgba(50,50,50,0.5)" strokeWidth="1.5" />
        </svg>
      ))}
      <style>{`@keyframes birdFly { 0% { left: -40px; } 100% { left: 110%; } }`}</style>
    </div>
  )
}

// ─── Stars for night ───

function StarsEffect({ timeOfDay }) {
  if (timeOfDay !== 'night' && timeOfDay !== 'evening') return null
  const stars = Array.from({ length: 30 }, (_, i) => ({
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
    'sunny-day': 'linear-gradient(180deg, #4A90D9 0%, #87CEEB 50%, #B8E6F0 100%)',
    'sunny-dawn': 'linear-gradient(180deg, #2C3E6B 0%, #E8857A 40%, #F5C26B 100%)',
    'sunny-dusk': 'linear-gradient(180deg, #2C3E6B 0%, #C06050 40%, #F0A050 100%)',
    'cloudy-day': 'linear-gradient(180deg, #8899AA 0%, #AABBCC 50%, #C5D0D8 100%)',
    'rain-day': 'linear-gradient(180deg, #4A5568 0%, #718096 50%, #A0AEC0 100%)',
    'snow-day': 'linear-gradient(180deg, #CBD5E0 0%, #E2E8F0 50%, #F7FAFC 100%)',
    'storm-day': 'linear-gradient(180deg, #1A202C 0%, #2D3748 50%, #4A5568 100%)',
    'fog-day': 'linear-gradient(180deg, #CBD5E0 0%, #E2E8F0 50%, #EDF2F7 100%)',
    'night': 'linear-gradient(180deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
    'evening': 'linear-gradient(180deg, #1E3A5F 0%, #2D4A7A 50%, #4A6FA5 100%)',
  }
  const key = (timeOfDay === 'night' || timeOfDay === 'evening')
    ? timeOfDay
    : `${weatherType}-${timeOfDay === 'dawn' || timeOfDay === 'dusk' ? timeOfDay : 'day'}`
  return (
    <div className="absolute inset-0" style={{
      background: skyGradients[key] || skyGradients['sunny-day'],
    }} />
  )
}

// ─── Info Card ───

function InfoCard({ city, temperature, weatherDesc, timezone }) {
  const tempF = temperature != null ? Math.round(temperature * 9 / 5 + 32) : null
  return (
    <div className="absolute top-4 left-4 z-30 px-4 py-3 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.25)',
      }}>
      <h3 className="font-serif text-lg font-semibold text-white drop-shadow-md">{city}</h3>
      {temperature != null && (
        <p className="text-sm text-white/90 drop-shadow-sm font-sans">
          {Math.round(temperature)}°C / {tempF}°F
        </p>
      )}
      {weatherDesc && <p className="text-xs text-white/80 drop-shadow-sm font-sans capitalize">{weatherDesc}</p>}
      <p className="text-xs text-white/70 mt-1 font-sans">{getCityTime(timezone)}</p>
    </div>
  )
}

// ─── Window Frame ───

function WindowFrame({ children, timeOfDay }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'evening'
  return (
    <div className="relative w-full h-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #F5F0E8 0%, #E8E0D0 50%, #F0EBE3 100%)' }}>
      {/* Subtle wall texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0z\' fill=\'none\'/%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23000\' stroke-width=\'.5\'/%3E%3C/svg%3E")',
      }} />

      {/* Dark vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)',
      }} />

      {/* Bay window structure */}
      <div className="relative" style={{ width: '90vw', height: '88vh', maxWidth: '1600px' }}>
        {/* Outer wooden frame */}
        <div className="absolute inset-0 rounded-t-3xl" style={{
          background: 'linear-gradient(135deg, #8B6914 0%, #A0782C 25%, #6B4F10 50%, #8B6914 75%, #A0782C 100%)',
          padding: '12px',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {/* Inner frame shadow */}
          <div className="absolute inset-3 rounded-t-2xl" style={{
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
          }} />
          {/* Glass area */}
          <div className="relative w-full h-full rounded-t-2xl overflow-hidden" style={{
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.15)',
          }}>
            {children}

            {/* Window dividers - bay window style (3 panels) */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Vertical dividers */}
              <div className="absolute top-0 bottom-0 left-[33.3%] w-3" style={{
                background: 'linear-gradient(90deg, #6B4F10, #A0782C, #6B4F10)',
                boxShadow: '0 0 8px rgba(0,0,0,0.3)',
              }} />
              <div className="absolute top-0 bottom-0 left-[66.6%] w-3" style={{
                background: 'linear-gradient(90deg, #6B4F10, #A0782C, #6B4F10)',
                boxShadow: '0 0 8px rgba(0,0,0,0.3)',
              }} />
              {/* Horizontal divider */}
              <div className="absolute left-0 right-0 top-[55%] h-3" style={{
                background: 'linear-gradient(180deg, #6B4F10, #A0782C, #6B4F10)',
                boxShadow: '0 0 8px rgba(0,0,0,0.3)',
              }} />
            </div>

            {/* Glass reflection */}
            <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.06]" style={{
              background: 'linear-gradient(135deg, white 0%, transparent 40%, transparent 60%, white 100%)',
            }} />
          </div>
        </div>

        {/* Window sill */}
        <div className="absolute -bottom-1 left-[-2%] right-[-2%] h-14 z-30" style={{
          background: 'linear-gradient(180deg, #A0782C 0%, #8B6914 40%, #6B4F10 100%)',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.15)',
        }}>
          {/* Sill details */}
          <div className="absolute top-2 left-0 right-0 h-[1px] bg-white/10" />
          <div className="absolute top-4 left-0 right-0 h-[1px] bg-black/10" />

          {/* Coffee mug */}
          <div className="absolute bottom-2 left-[20%] z-10">
            <svg width="28" height="28" viewBox="0 0 28 28">
              <rect x="4" y="6" width="16" height="16" rx="2" fill="#D4A574" />
              <rect x="6" y="8" width="12" height="4" rx="1" fill="#6B3E1F" />
              <path d="M20 10 Q26 10 26 16 Q26 22 20 22" fill="none" stroke="#D4A574" strokeWidth="2.5" />
              <ellipse cx="12" cy="7" rx="7" ry="1.5" fill="#C49A6C" />
            </svg>
          </div>

          {/* Succulent plant */}
          <div className="absolute bottom-2 right-[22%] z-10">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <rect x="10" y="20" width="12" height="10" rx="1" fill="#C67B4E" />
              <rect x="9" y="18" width="14" height="4" rx="1" fill="#D4956B" />
              <ellipse cx="16" cy="18" rx="5" ry="3" fill="#5B8C5A" />
              <ellipse cx="12" cy="16" rx="3" ry="4" fill="#6B9E6A" />
              <ellipse cx="20" cy="16" rx="3" ry="4" fill="#6B9E6A" />
              <ellipse cx="16" cy="14" rx="3" ry="5" fill="#7BB07A" />
            </svg>
          </div>
        </div>

        {/* Left curtain */}
        <div className="absolute top-0 -left-4 w-20 h-full z-25 pointer-events-none" style={{
          animation: 'curtainSway 6s ease-in-out infinite',
          transformOrigin: 'top center',
        }}>
          <div className="w-full h-full rounded-tl-xl" style={{
            background: 'linear-gradient(90deg, #8B4513 0%, #A0522D 30%, #8B4513 60%, #6B3410 100%)',
            opacity: 0.85,
            boxShadow: '4px 0 12px rgba(0,0,0,0.2)',
          }}>
            <div className="absolute inset-0" style={{
              background: 'repeating-linear-gradient(180deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 21px)',
            }} />
          </div>
        </div>

        {/* Right curtain */}
        <div className="absolute top-0 -right-4 w-20 h-full z-25 pointer-events-none" style={{
          animation: 'curtainSway 6s 1s ease-in-out infinite',
          transformOrigin: 'top center',
        }}>
          <div className="w-full h-full rounded-tr-xl" style={{
            background: 'linear-gradient(270deg, #8B4513 0%, #A0522D 30%, #8B4513 60%, #6B3410 100%)',
            opacity: 0.85,
            boxShadow: '-4px 0 12px rgba(0,0,0,0.2)',
          }}>
            <div className="absolute inset-0" style={{
              background: 'repeating-linear-gradient(180deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 21px)',
            }} />
          </div>
        </div>

        {/* Interior lamp glow on sill at night */}
        {isNight && (
          <div className="absolute -bottom-1 left-[15%] w-32 h-16 z-25 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at bottom, rgba(255,200,100,0.4) 0%, transparent 70%)',
            animation: 'lampGlow 4s ease-in-out infinite',
          }} />
        )}
      </div>

      <style>{`
        @keyframes curtainSway {
          0%, 100% { transform: skewX(0deg); }
          50% { transform: skewX(0.5deg); }
        }
        @keyframes lampGlow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Loading state ───

function LoadingView() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10" style={{
      background: 'linear-gradient(135deg, #CBD5E0 0%, #E2E8F0 30%, #EDF2F7 60%, #CBD5E0 100%)',
      backgroundSize: '200% 200%',
      animation: 'loadingShift 3s ease-in-out infinite',
    }}>
      <div className="text-center">
        <p className="font-serif text-2xl text-gray-500/80 animate-pulse">Looking outside...</p>
      </div>
      <style>{`
        @keyframes loadingShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
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
  const [transitioning, setTransitioning] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const abortRef = useRef(null)

  // Detect location via IP
  const detectLocation = useCallback(async () => {
    try {
      const res = await fetch('http://ip-api.com/json/')
      const data = await res.json()
      if (data.status === 'success') {
        return { city: data.city, lat: data.lat, lon: data.lon, tz: data.timezone }
      }
    } catch (e) { console.warn('IP geolocation failed:', e) }
    // Fallback to NYC
    return { city: 'New York', lat: 40.7128, lon: -74.006, tz: 'America/New_York' }
  }, [])

  // Fetch weather
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

  // Generate scene image
  const generateScene = useCallback(async (city, weatherData, tz) => {
    const hour = getCityHour(tz)
    try {
      // Step 1: Get image prompt from Claude
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

      // Step 2: Generate image
      const imgRes = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!imgRes.ok) throw new Error('Image generation failed')
      const { image } = await imgRes.json()
      return image
    } catch (e) {
      console.warn('Scene generation failed:', e)
      return null
    }
  }, [])

  // Load scene for a city
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

    const image = await generateScene(loc.city, weatherData, loc.tz)
    if (image) {
      setSceneImage(image)
      setImageFailed(false)
    } else {
      setSceneImage(null)
      setImageFailed(true)
    }
    setLoading(false)
  }, [detectLocation, fetchWeather, generateScene])

  // Initial load
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
        {/* Scene background */}
        {loading && !sceneImage && !imageFailed ? (
          <LoadingView />
        ) : (
          <>
            {/* AI-generated or fallback background */}
            {sceneImage ? (
              <div className="absolute inset-0 transition-opacity duration-1000"
                style={{ opacity: transitioning ? 0 : 1 }}>
                <img src={sceneImage} alt="Scene" className="w-full h-full object-cover" />
              </div>
            ) : (
              <FallbackSky weatherType={weatherType} timeOfDay={timeOfDay} />
            )}

            {/* Weather effects */}
            <WeatherEffects weatherType={weatherType} timeOfDay={timeOfDay} />
            <StarsEffect timeOfDay={timeOfDay} />

            {/* City overlay animations */}
            {location && <CityOverlay city={location.city} />}

            {/* Info card */}
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

        {/* Frosted transition */}
        <FrostedTransition active={transitioning} />
      </WindowFrame>

      {/* City toggle bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-3 pt-1">
        <div className="flex gap-1 px-3 py-2 rounded-full" style={{
          background: 'linear-gradient(180deg, #8B6914 0%, #6B4F10 100%)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.15)',
        }}>
          {CITIES.map(city => {
            const isActive = selectedCity === city.name || (!selectedCity && city.name === 'Auto')
            return (
              <button key={city.name} onClick={() => handleCitySelect(city)}
                className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all duration-200 whitespace-nowrap
                  ${isActive
                    ? 'bg-amber-400/90 text-amber-950 shadow-md'
                    : 'text-amber-100/80 hover:bg-amber-800/40 hover:text-amber-100'
                  }`}
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
