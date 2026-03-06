import Anthropic from '@anthropic-ai/sdk'

const CITY_VISUALS = {
  'New York': 'Manhattan skyline with brownstones, water towers on rooftops, steam rising from grates, yellow cabs below, fire escapes on red brick buildings',
  'Miami': 'pastel art deco buildings along Ocean Drive, swaying coconut palms, turquoise water, bright tropical light, people in summer clothes',
  'Los Angeles': 'wide sun-bleached boulevard lined with tall palms, Spanish-style stucco buildings, distant purple mountains, hazy golden light',
  'Chicago': 'dramatic modernist skyscrapers, elevated L-train tracks, glimpse of Lake Michigan, strong wind visible in flags and trees',
  'London': 'Victorian brick terraces, slate rooftops, chimney pots, red phone box, lush green plane trees, double-decker bus passing',
  'Paris': 'cream Haussmann facades with wrought-iron balconies, zinc mansard rooftops, sidewalk cafe with wicker chairs, cobblestone street',
  'Tokyo': 'dense layers of neon signs in Japanese characters, narrow alley with vending machines, mix of sleek towers and tiny traditional shops',
  'Dubai': 'gleaming glass supertall towers, desert haze, empty six-lane highway, Burj Khalifa silhouette, intense sunlight on white concrete',
  'Honolulu': 'Diamond Head crater in distance, turquoise Pacific, white sand, swaying palms, plumeria flowers, surfers in the water',
  'Seattle': 'Space Needle visible through evergreen trees, overcast silver sky, Puget Sound water, coffee shop on rainy street corner',
}

function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 17) return 'daytime'
  if (hour >= 17 && hour < 19) return 'dusk'
  if (hour >= 19 && hour < 22) return 'evening'
  return 'night'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { city, weather, temperature, hour } = req.body
    const timeOfDay = getTimeOfDay(hour)
    const cityVisual = CITY_VISUALS[city] || 'gentle rolling countryside with wildflowers, a winding path, old stone cottage with smoke from chimney'

    const anthropic = new Anthropic()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 250,
      messages: [{
        role: 'user',
        content: `Write a FLUX image generation prompt. Subject: outdoor cityscape of ${city} as seen looking OUT through a window. Do NOT include the window frame, curtains, or interior elements — only the outdoor scene.

Visual character of ${city}: ${cityVisual}

Current conditions:
- Weather: ${weather}
- Temperature: ${temperature}°C
- Time: ${timeOfDay}
${timeOfDay === 'dawn' ? '- Soft pink and coral light on the horizon, long shadows, quiet streets' : ''}
${timeOfDay === 'daytime' ? '- Bright natural sunlight, full color, active street life' : ''}
${timeOfDay === 'dusk' ? '- Rich golden hour light, warm orange tones, long dramatic shadows, silhouettes' : ''}
${timeOfDay === 'evening' ? '- Deep blue twilight sky, warm city lights coming on, neon reflections' : ''}
${timeOfDay === 'night' ? '- Dark sky, glowing streetlights, warm window lights in buildings, moody atmosphere' : ''}

Style: photorealistic, shot on 35mm film, natural depth of field, atmospheric perspective, rich detail. Like a photograph by Saul Leiter or Gregory Crewdson.

Return ONLY the prompt, under 120 words. Be specific and cinematic.`
      }]
    })

    const prompt = message.content[0].text
    res.status(200).json({ prompt, timeOfDay })
  } catch (error) {
    console.error('Claude API error:', error.message)
    res.status(500).json({ error: 'Failed to generate prompt' })
  }
}
