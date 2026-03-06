import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
app.use(cors())
app.use(express.json())

const anthropic = new Anthropic()

const CITY_VISUALS = {
  'New York': 'dense skyline, brownstone apartments, yellow cabs, fire escapes, busy sidewalks, Central Park glimpses',
  'Miami': 'pastel art deco buildings, palm trees, people in summer clothes, ocean hints, South Beach vibes',
  'Los Angeles': 'wide boulevards, palm trees, Spanish-style architecture, mountains in distance, laid-back feel',
  'Chicago': 'bold architecture, L-train elevated tracks, Lake Michigan in distance, windy feel',
  'London': 'Victorian row houses, red double-decker buses, grey skies typical, lush green parks',
  'Paris': 'Haussmann buildings, sidewalk cafes, iron balconies, Eiffel Tower possibly visible in distance',
  'Tokyo': 'dense neon signage, mix of traditional temples and ultra-modern towers, vending machines, bustling crowds',
  'Dubai': 'glass skyscrapers, desert haze, luxury cars, wide empty roads, Burj Khalifa silhouette',
  'Honolulu': 'lush tropical greenery, turquoise ocean, volcanic mountains, bright colorful flowers',
  'Seattle': 'evergreen trees, overcast skies, Pike Place Market feel, water and hills, Space Needle'
}

function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 17) return 'daytime'
  if (hour >= 17 && hour < 19) return 'dusk'
  if (hour >= 19 && hour < 22) return 'evening'
  return 'night'
}

app.post('/api/generate-prompt', async (req, res) => {
  try {
    const { city, weather, temperature, hour } = req.body
    const timeOfDay = getTimeOfDay(hour)
    const cityVisual = CITY_VISUALS[city] || 'beautiful rolling countryside, trees, a quiet road, charming village in the distance'

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Generate a concise image generation prompt for a photorealistic landscape scene viewed through a window. The scene should depict:

City: ${city} (visual character: ${cityVisual})
Weather: ${weather}
Temperature: ${temperature}°C
Time of day: ${timeOfDay}
${timeOfDay === 'dawn' ? 'Warm pink/orange low light on horizon' : ''}
${timeOfDay === 'daytime' ? 'Bright natural sunlight' : ''}
${timeOfDay === 'dusk' ? 'Golden hour warm tones, sun setting' : ''}
${timeOfDay === 'evening' ? 'Deep blue sky, city lights beginning to glow' : ''}
${timeOfDay === 'night' ? 'Dark sky with stars, city lights glowing warmly' : ''}

Return ONLY the image prompt, no explanation. Make it vivid and detailed but under 200 words. Focus on the outdoor scene as viewed through a window - do not include the window frame itself. The style should be photorealistic with rich atmospheric detail.`
      }]
    })

    const prompt = message.content[0].text
    res.json({ prompt, timeOfDay })
  } catch (error) {
    console.error('Claude API error:', error.message)
    res.status(500).json({ error: 'Failed to generate prompt' })
  }
})

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body
    const hfToken = process.env.HF_TOKEN

    const response = await fetch(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(hfToken ? { 'Authorization': `Bearer ${hfToken}` } : {})
        },
        body: JSON.stringify({ inputs: prompt })
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('HF API error:', response.status, text)
      throw new Error(`HF API returned ${response.status}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const base64 = buffer.toString('base64')
    res.json({ image: `data:image/png;base64,${base64}` })
  } catch (error) {
    console.error('Image generation error:', error.message)
    res.status(500).json({ error: 'Failed to generate image' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
