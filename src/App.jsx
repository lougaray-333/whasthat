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
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 text-center"
      style={{
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '24px',
      }}>
      <h3 className="font-serif text-2xl font-light text-white drop-shadow-md tracking-wide">{city}</h3>
      <div className="flex items-center justify-center gap-3 mt-1">
        {temperature != null && (
          <span className="text-sm text-white/90 drop-shadow-sm font-sans font-light">
            {Math.round(temperature)}°C / {tempF}°F
          </span>
        )}
        <span className="text-white/40">|</span>
        {weatherDesc && <span className="text-sm text-white/80 drop-shadow-sm font-sans font-light capitalize">{weatherDesc}</span>}
        <span className="text-white/40">|</span>
        <span className="text-sm text-white/70 font-sans font-light">{getCityTime(timezone)}</span>
      </div>
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
      background: 'linear-gradient(135deg, #CBD5E0 0%, #E2E8F0 30%, #EDF2F7 60%, #CBD5E0 100%)',
      backgroundSize: '200% 200%',
      animation: 'loadingShift 3s ease-in-out infinite',
    }}>
      <div className="text-center">
        <p className="font-serif text-2xl text-gray-500/80 animate-pulse tracking-wider">Looking outside...</p>
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
        {loading && !sceneImage && !imageFailed ? (
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

      {/* City selector — floating pills */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex gap-1.5 px-4 py-2.5 rounded-full" style={{
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {CITIES.map(city => {
            const isActive = selectedCity === city.name || (!selectedCity && city.name === 'Auto')
            return (
              <button key={city.name} onClick={() => handleCitySelect(city)}
                className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all duration-300 whitespace-nowrap
                  ${isActive
                    ? 'bg-white/90 text-gray-900 shadow-lg'
                    : 'text-white/70 hover:bg-white/15 hover:text-white'
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
