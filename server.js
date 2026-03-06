import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
app.use(cors())
app.use(express.json())

const anthropic = new Anthropic()

const CITY_VISUALS = {
  'New York': 'Astoria Queens residential street with brick row houses, iron railings, parked cars, utility poles, small front yards',
  'Atlanta': 'tree-lined Midtown Atlanta street with red brick buildings, Southern Victorian houses, dogwood trees',
  'Miami': 'pastel art deco buildings along Ocean Drive, swaying coconut palms, turquoise water, parked convertibles',
  'Austin': 'South Congress Avenue with eclectic storefronts, food trucks, live oak trees, vintage signs',
  'San Francisco': 'steep hill with colorful Victorian painted ladies, cable car tracks, distant bay view',
  'Seattle': 'Capitol Hill residential street with craftsman bungalows, evergreen trees, coffee shop on corner',
  'London': 'Victorian brick terraces with chimney pots, red phone box, plane trees, double-decker bus',
  'Lisbon': 'narrow cobblestone street with colorful tiled facades, yellow tram 28, laundry hanging',
  'Ho Chi Minh City': 'bustling narrow alley with motorbikes, French colonial windows, street food vendors',
  'Barcelona': 'Eixample district with Gaudi facades, plane tree boulevard, outdoor cafes, ornate balconies',
  'Tokyo': 'quiet residential side street in Shimokitazawa, small houses, vending machines, narrow road',
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
