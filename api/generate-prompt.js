const CITY_VISUALS = {
  'New York': 'Astoria Queens residential street with brick row houses, iron railings, parked cars along the curb, utility poles with wires, small front yards, fire hydrants, brownstone stoops',
  'Atlanta': 'tree-lined Midtown Atlanta street with red brick buildings, Southern Victorian houses, Peachtree street view, dogwood trees, wide sidewalks',
  'Miami': 'pastel art deco buildings along Ocean Drive, swaying coconut palms, turquoise water glimpse, bright tropical light, parked convertibles',
  'Austin': 'South Congress Avenue view with eclectic storefronts, food truck lots, live oak trees, vintage signs, pickup trucks parked along street',
  'San Francisco': 'steep hill with colorful Victorian painted ladies, cable car tracks, distant bay view, parked cars on incline, eucalyptus trees',
  'Seattle': 'Capitol Hill residential street with craftsman bungalows, evergreen trees, coffee shop on corner, overcast silver sky, Puget Sound glimpse',
  'London': 'Victorian brick terraces with chimney pots, red phone box, black wrought iron railings, plane trees, double-decker bus passing on wet road',
  'Lisbon': 'narrow cobblestone street with colorful tiled facades (azulejos), wrought iron balconies, yellow tram 28 passing, laundry hanging between buildings, terracotta rooftops',
  'Ho Chi Minh City': 'bustling narrow alley with motorbikes parked everywhere, hanging electrical wires, French colonial shuttered windows, street food vendors with plastic stools, tropical plants on balconies',
  'Barcelona': 'Eixample district with Gaudi-influenced facades, plane tree-lined boulevard, outdoor cafe terraces, Vespa scooters parked, ornate balconies with hanging plants',
  'Tokyo': 'quiet residential side street in Shimokitazawa, mix of small houses and apartment buildings, vending machines glowing, utility poles, narrow road with a bicycle parked',
}

const TIME_MOODS = {
  dawn: 'soft pink and coral light on the horizon, long shadows, quiet empty streets, early morning mist, a few early commuters',
  daytime: 'bright natural sunlight, full vivid colors, active street life, sharp shadows, people walking, cars passing occasionally',
  dusk: 'rich golden hour light, warm orange and amber tones, long dramatic shadows, silhouettes against sky, streetlights just turning on',
  evening: 'deep blue twilight sky, warm glowing city lights, neon reflections on wet pavement, cozy window lights in buildings',
  night: 'dark sky, glowing warm streetlights, illuminated windows in buildings, moody atmospheric haze, quiet street with occasional headlights',
}

const WEATHER_MOODS = {
  'Clear sky': 'crystal clear sky, sharp light, high contrast',
  'Mainly clear': 'mostly clear sky with a few wispy clouds, bright light',
  'Partly cloudy': 'dramatic cumulus clouds, patches of blue sky, dappled light',
  'Overcast': 'heavy grey cloud cover, soft diffused light, muted colors',
  'Foggy': 'thick atmospheric fog, mysterious visibility, soft halos around lights',
  'Light drizzle': 'fine misty rain, wet glistening surfaces, slight fog',
  'Moderate rain': 'steady rain, puddles reflecting city lights, wet streets, rain streaks visible',
  'Heavy rain': 'torrential downpour, sheets of rain, splashing puddles, dramatic atmosphere',
  'Slight snow': 'gentle snowflakes drifting down, thin white dusting on surfaces',
  'Moderate snow': 'steady snowfall, accumulating white snow on rooftops and streets',
  'Heavy snow': 'heavy blizzard conditions, thick swirling snow, low visibility',
  'Thunderstorm': 'dark dramatic storm clouds, flashes of lightning, intense atmosphere',
}

function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 17) return 'daytime'
  if (hour >= 17 && hour < 19) return 'dusk'
  if (hour >= 19 && hour < 22) return 'evening'
  return 'night'
}

function buildPromptFromTemplate(city, weather, temperature, hour) {
  const timeOfDay = getTimeOfDay(hour)
  const cityVisual = CITY_VISUALS[city] || 'quiet residential street with parked cars, trees, low-rise buildings, neighborhood feel'
  const timeMood = TIME_MOODS[timeOfDay] || TIME_MOODS.daytime
  const weatherMood = WEATHER_MOODS[weather] || 'pleasant atmospheric conditions'

  return `Photorealistic street-level view looking out through an apartment window in ${city}. You see: ${cityVisual}. The street has occasional cars parked or slowly passing by. ${timeMood}. Weather: ${weatherMood}. Temperature feels like ${temperature} degrees celsius. Shot on 35mm film, natural depth of field, atmospheric perspective, rich cinematic detail. Style of Saul Leiter or Gregory Crewdson street photography. Residential neighborhood feel, intimate window perspective.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { city, weather, temperature, hour } = req.body
    const timeOfDay = getTimeOfDay(hour)

    let prompt
    try {
      const anthropicKey = process.env.ANTHROPIC_API_KEY
      if (!anthropicKey) throw new Error('No ANTHROPIC_API_KEY')

      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const anthropic = new Anthropic()
      const cityVisual = CITY_VISUALS[city] || 'quiet residential street with parked cars, trees, low-rise buildings, neighborhood feel'

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 250,
        messages: [{
          role: 'user',
          content: `Write a FLUX image generation prompt. Subject: a photorealistic street-level view of ${city} as seen looking OUT through an apartment window. The perspective should feel like you're sitting inside looking at the street below — residential, intimate, real.

Visual character of ${city}: ${cityVisual}

Include details like: parked cars along the street, maybe a car slowly driving by, pedestrians, street elements (fire hydrants, mailboxes, trash cans, utility poles). Make it feel lived-in and real, like a photograph someone took from their apartment window.

Current conditions:
- Weather: ${weather}
- Temperature: ${temperature}°C
- Time: ${timeOfDay}
${timeOfDay === 'dawn' ? '- Soft pink and coral light, quiet streets, early morning mist' : ''}
${timeOfDay === 'daytime' ? '- Bright natural sunlight, full color, people walking, occasional car passing' : ''}
${timeOfDay === 'dusk' ? '- Rich golden hour light, warm orange tones, streetlights coming on' : ''}
${timeOfDay === 'evening' ? '- Deep blue twilight, warm city lights, cozy window glows in buildings' : ''}
${timeOfDay === 'night' ? '- Dark sky, streetlights glowing, warm window lights, quiet street, occasional headlights' : ''}

Style: photorealistic, shot on 35mm film, natural depth of field, atmospheric. Like a photograph by Saul Leiter — intimate, street-level, through-the-window feel.

Return ONLY the prompt, under 120 words. Be specific and cinematic.`
        }]
      })
      prompt = message.content[0].text
    } catch (claudeErr) {
      console.warn('Claude API unavailable, using template prompt:', claudeErr.message)
      prompt = buildPromptFromTemplate(city, weather, temperature, hour)
    }

    res.status(200).json({ prompt, timeOfDay })
  } catch (error) {
    console.error('Prompt generation error:', error.message)
    res.status(500).json({ error: 'Failed to generate prompt' })
  }
}
