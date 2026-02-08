import { createInterface } from 'node:readline'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

// Load environment variables
config()

// Mock Nuxt runtime config and utilities
const mockRuntimeConfig = {
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY
};

(global as any).useRuntimeConfig = () => mockRuntimeConfig as any

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

const MODEL_OPTIONS = [
    { name: 'Gemini 2.5 Flash Image', id: 'gemini-2.5-flash-image' },
    { name: 'Gemini 3 Pro Image', id: 'gemini-3-pro-image-preview' }, // Assuming potential ID, likely to fail if not available
    { name: 'Imagen 4', id: 'imagen-4.0-generate-001' } // Assuming potential ID per user request
] as const


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
        'simple-illustration': 'Simple minimalist pet icon, clean lines, flat color, vector art, white background, modern, logo style, kawaii, cute chibi style, round sparkling eyes.'
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
    prompt: string,
    modelName: string
): Promise<Buffer> {
    if (!mockRuntimeConfig.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not set')
    }

    // --- Imagen Models: Use REST API (predict) ---
    if (modelName.includes('imagen')) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${mockRuntimeConfig.geminiApiKey}`

        const requestBody = {
            instances: [
                {
                    prompt: prompt
                }
            ],
            parameters: {
                sampleCount: 1
            }
        }

        console.log(`Generating image with model: ${modelName} via REST API (predict)`)
        console.log('Prompt:', prompt)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Imagen API Error: ${response.status} ${response.statusText} - ${errorText}`)
        }

        const data = await response.json() as any
        const base64Image = data.predictions?.[0]?.bytesBase64Encoded

        if (!base64Image) {
            if (data.predictions?.[0]?.mimeType && data.predictions?.[0]?.bytesBase64Encoded) {
                return Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64')
            }
            console.error('API Response for debugging:', JSON.stringify(data, null, 2))
            throw new Error('No image returned from Imagen API')
        }

        return Buffer.from(base64Image, 'base64')
    }

    // --- Gemini Models: Use SDK (generateContent) ---
    console.log(`Generating image with model: ${modelName} via SDK (generateContent)`)
    console.log('Prompt:', prompt)

    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            // Note: Some models support responseModalities configuration
            // responseModalities: ['TEXT', 'IMAGE'] 
        } as any
    })

    const imageBuffer = fs.readFileSync(sourceImagePath)
    const imageData = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg'
        }
    }

    try {
        // Attempt to call generateContent with prompt & (optionally) image
        // WARNING: Image input to generateContent for image GENERATION depends on model support (e.g. Image-to-Image editing)
        // If the model does not support multimodal input for generation, this might fail or produce text describing the image.
        const result = await model.generateContent([prompt, imageData])
        const response = await result.response

        // Extract image parts
        const parts = response.candidates?.[0]?.content?.parts ?? []
        let imageBytes: string | undefined
        // Check for inlineData (image generation typically returns this)
        for (const part of parts) {
            if (part.inlineData?.data) {
                imageBytes = part.inlineData.data
                break
            }
        }

        if (!imageBytes) {
            // Check if response contains just text (e.g. refusal or description)
            const textPart = response.text()
            if (textPart) {
                console.warn('Model returned text instead of image:', textPart)
                throw new Error(`Model returned text: "${textPart.substring(0, 100)}..."`)
            }
            throw new Error('Image generation failed: No image data returned.')
        }

        return Buffer.from(imageBytes, 'base64')
    } catch (error) {
        console.error('Image Generation Error:', error)
        throw error
    }
}

// ... existing imports ...

// --- Helper for User Input ---

function askQuestion(query: string): Promise<string> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    })

    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close()
            resolve(answer)
        })
    })
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
        // 0. Select Model
        console.log('\n--- Select Model ---')
        MODEL_OPTIONS.forEach((model, index) => {
            console.log(`${index + 1}. ${model.name}`)
        })
        const modelAnswer = await askQuestion('\nSelect a model (enter number, default 1): ')
        const modelIndex = parseInt(modelAnswer, 10) - 1
        const selectedModel = (modelIndex >= 0 && modelIndex < MODEL_OPTIONS.length)
            ? MODEL_OPTIONS[modelIndex]
            : MODEL_OPTIONS[0]

        console.log(`\nSelected Model: ${selectedModel.name} (${selectedModel.id})`)

        // 1. Select Style
        console.log('\n--- Select Style ---')
        styleTypes.forEach((style, index) => {
            console.log(`${index + 1}. ${style}`)
        })
        console.log('a. All styles')

        const answer = await askQuestion('\nSelect a style (enter number or "a"): ')

        let selectedStyles: StyleType[] = []

        if (answer.toLowerCase() === 'a') {
            selectedStyles = [...styleTypes]
        } else {
            const index = parseInt(answer, 10) - 1
            if (index >= 0 && index < styleTypes.length) {
                selectedStyles = [styleTypes[index]]
            } else {
                console.log('Invalid selection, defaulting to ALL styles.')
                selectedStyles = [...styleTypes]
            }
        }

        console.log(`\nSelected styles: ${selectedStyles.join(', ')}\n`)

        // 1. Analyze
        const description = await analyzePetImage(sourceImage)
        console.log('\n--- Pet Analysis Result ---')
        console.log(description)
        console.log('---------------------------\n')

        // 2. Generate for each style
        for (const style of selectedStyles) {
            console.log(`\nProcessing style: ${style}`)
            const prompt = getImageGenerationPrompt(style, description)

            try {
                const imageBuffer = await generateImageWithImagen(sourceImage, prompt, selectedModel.id)
                const outputPath = path.join(outputDir, `result_${selectedModel.id}_${style}.png`)
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
