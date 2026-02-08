import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

// Load environment variables
config()

// Mock Nuxt runtime config and utilities
const mockRuntimeConfig = {
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY
}

global.useRuntimeConfig = () => mockRuntimeConfig as any

// Define styles (copied from shared/types/style.ts to avoid alias issues)
const styleTypes = [
    '3d-anime',
    'watercolor',
    'fluffy',
    'cyberpunk',
    'korean-style',
    'simple-illustration'
] as const

type StyleType = typeof styleTypes[number]

// --- Copied & Adapted Logic from server/utils/prompts.ts ---

function getPetAnalysisPrompt(): string {
    return `
You are an expert at analyzing pet images.
Please extract the following information from the uploaded pet photo:

1. Breed: Dog, Cat, or specific breed if identifiable.
2. Color/Pattern: Specific fur colors and patterns.
3. Accessories: Presence and description of collars, ribbons, clothes, etc.
4. Expression/Pose: Distinctive expression or pose.

Output the description in English, focusing on visual traits suitable for image generation prompts.
Example: "A Shiba Inu with brown and white fur. Wearing a red collar. Has a gentle expression and is tilting its head slightly."
`
}

function getImageGenerationPrompt(
    styleType: StyleType,
    petDescription: string
): string {
    const stylePrompts: Record<StyleType, string> = {
        '3d-anime': '3D Pixar-style animated character, cute, adorable, high detail, soft fur, expressive eyes, Disney style, render, 8k, masterpiece.',
        'watercolor': 'Soft watercolor painting, artistic splashes, pastel colors, white background, dreamy, wet-on-wet technique, high quality.',
        'fluffy': 'Cute hand-drawn illustration, fluffy texture, soft lines, pastel colors, warm and cozy vibes, storybook style, adorable.',
        'cyberpunk': 'Cyberpunk pet icon, neon lights, futuristic accessories, vibrant glowing colors, high contrast, sci-fi aesthetic, cool.',
        'korean-style': 'Modern Korean-style pet icon, flat design, vibrant soft colors, simple but cute, charms, stickers, app icon style.',
        'simple-illustration': 'Simple minimalist pet icon, clean lines, flat color, vector art, white background, modern, logo style.'
    }

    const stylePrompt = stylePrompts[styleType] || stylePrompts[styleTypes[styleTypes.length - 1]]
    return `${stylePrompt} Subject: ${petDescription}`
}

// --- Logic from server/utils/gemini.ts (Adapted) ---

function getGeminiClient() {
    if (!mockRuntimeConfig.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not set')
    }
    return new GoogleGenerativeAI(mockRuntimeConfig.geminiApiKey)
}

async function analyzePetImage(imagePath: string): Promise<string> {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const imageBuffer = fs.readFileSync(imagePath)
    const imageData = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg' // Assuming jpeg for sample.jpg
        }
    }

    const systemInstruction = getPetAnalysisPrompt()

    console.log('Analyzing image...')
    const result = await model.generateContent([systemInstruction, imageData])
    const response = await result.response
    return response.text()
}

async function generateImageWithImagen(
    sourceImagePath: string,
    prompt: string
): Promise<Buffer> {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-image',
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE']
        } as any
    })

    console.log('Generating image with prompt:', prompt)

    const imageBuffer = fs.readFileSync(sourceImagePath)
    const imageData = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg'
        }
    }

    try {
        const result = await model.generateContent([prompt, imageData])
        const response = await result.response

        const parts = response.candidates?.[0]?.content?.parts ?? []
        let imageBytes: string | undefined
        for (const part of parts) {
            if (part.inlineData?.data) {
                imageBytes = part.inlineData.data
                break
            }
        }

        if (!imageBytes) {
            throw new Error('Image generation failed: No image data returned.')
        }

        return Buffer.from(imageBytes, 'base64')
    } catch (error) {
        console.error('Image Generation Error:', error)
        throw error
    }
}

// --- Main Execution ---

async function main() {
    const sourceImage = path.resolve('public/images/sample.jpg')
    const outputDir = path.resolve('scripts/output')

    if (!fs.existsSync(sourceImage)) {
        console.error(`Source image not found at: ${sourceImage}`)
        process.exit(1)
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
    }

    try {
        // 1. Analyze
        const description = await analyzePetImage(sourceImage)
        console.log('\n--- Pet Analysis Result ---')
        console.log(description)
        console.log('---------------------------\n')

        // 2. Generate for each style
        for (const style of styleTypes) {
            console.log(`\nProcessing style: ${style}`)
            const prompt = getImageGenerationPrompt(style, description)

            try {
                const imageBuffer = await generateImageWithImagen(sourceImage, prompt)
                const outputPath = path.join(outputDir, `result_${style}.png`)
                fs.writeFileSync(outputPath, imageBuffer)
                console.log(`Saved: ${outputPath}`)
            } catch (e) {
                console.error(`Failed to generate for ${style}:`, e)
            }
        }

    } catch (error) {
        console.error('An error occurred:', error)
    }
}

main()
