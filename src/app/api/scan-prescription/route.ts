import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchMedicines } from '@/lib/data/medicines'

// Gemini 2.0 Flash: 1,500 free requests/day, no credit card required
// Get key at: https://aistudio.google.com/apikey
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface ExtractedMedicine {
  name: string
  confidence: 'high' | 'medium' | 'low'
}

interface MatchedMedicine {
  original: string
  confidence: 'high' | 'medium' | 'low'
  matched: { id: string; brand_name: string; salt_name: string; slug: string } | null
}

const PROMPT = `Extract all medicine names from this prescription image.

Rules:
- Return ONLY medicine names (brand or generic), nothing else
- Include dosage/strength if written (e.g., "Metformin 500mg")
- Handle handwritten text as best you can
- Return as JSON array only, no explanation:
[{ "name": "medicine name here", "confidence": "high" | "medium" | "low" }]`

export async function POST(req: NextRequest) {
  const { image } = await req.json()

  if (!image) {
    return NextResponse.json({ error: 'image required' }, { status: 400 })
  }

  const base64Data = image.includes(',') ? image.split(',')[1] : image
  const mimeType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: base64Data, mimeType } },
    ])

    const text = result.response.text()

    let medicines: ExtractedMedicine[] = []
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        medicines = JSON.parse(jsonMatch[0])
      }
    } catch {
      return NextResponse.json({ error: 'Could not parse prescription' }, { status: 422 })
    }

    const matched: MatchedMedicine[] = await Promise.all(
      medicines.map(async med => {
        const results = await searchMedicines(med.name)
        return {
          original: med.name,
          confidence: med.confidence,
          matched: results[0]
            ? {
                id: results[0].id,
                brand_name: results[0].brand_name,
                salt_name: results[0].salt_name,
                slug: results[0].slug,
              }
            : null,
        }
      })
    )

    return NextResponse.json({ medicines: matched })
  } catch (err) {
    console.error('Prescription scan error:', err)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
