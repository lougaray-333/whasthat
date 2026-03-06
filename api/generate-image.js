export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { prompt } = req.body
    const hfToken = process.env.HF_TOKEN

    if (!hfToken) {
      return res.status(500).json({ error: 'HF_TOKEN not configured' })
    }

    const response = await fetch(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hfToken}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width: 1024,
            height: 768,
            num_inference_steps: 4,
          }
        })
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('HF API error:', response.status, text)

      // If model is loading, tell the client to retry
      if (response.status === 503) {
        return res.status(503).json({ error: 'Model loading, try again in a moment', retry: true })
      }

      throw new Error(`HF API returned ${response.status}: ${text}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const base64 = buffer.toString('base64')
    res.status(200).json({ image: `data:image/png;base64,${base64}` })
  } catch (error) {
    console.error('Image generation error:', error.message)
    res.status(500).json({ error: 'Failed to generate image' })
  }
}
