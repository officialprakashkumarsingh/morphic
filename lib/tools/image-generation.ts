import { tool } from 'ai'
import { z } from 'zod'

export const generateImage = tool({
  description: `Generate an image using AI image generation models. This tool can create images from text descriptions using advanced AI models like nano-banana, imagen-3, imagen-3.1, and imagen-3.5.`,
  parameters: z.object({
    prompt: z.string().describe('The text description of the image to generate'),
    model: z
      .enum(['nano-banana', 'imagen-3', 'imagen-3.1', 'imagen-3.5'])
      .default('imagen-3')
      .describe('The image generation model to use'),
    size: z
      .enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'])
      .default('1024x1024')
      .describe('The size of the generated image'),
    n: z
      .number()
      .min(1)
      .max(4)
      .default(1)
      .describe('Number of images to generate')
  }),
  execute: async ({ prompt, model, size, n }) => {
    try {
      const response = await fetch(
        'https://longcat-openai-api.onrender.com/v1/images/generations',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer pikachu@#25D',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            prompt,
            size,
            n
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        success: true,
        images: data.data.map((item: any) => ({
          url: item.url,
          revised_prompt: item.revised_prompt || prompt
        })),
        model,
        prompt,
        size
      }
    } catch (error) {
      console.error('Image generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        model,
        prompt,
        size
      }
    }
  }
})

export const editImage = tool({
  description: `Edit an existing image using the nano-banana model. This tool can modify images based on text descriptions, add or remove objects, change styles, and more.`,
  parameters: z.object({
    prompt: z.string().describe('Description of how to edit the image'),
    image_url: z.string().describe('URL of the image to edit'),
    size: z
      .enum(['256x256', '512x512', '1024x1024'])
      .default('1024x1024')
      .describe('The size of the edited image'),
    n: z
      .number()
      .min(1)
      .max(4)
      .default(1)
      .describe('Number of edited images to generate')
  }),
  execute: async ({ prompt, image_url, size, n }) => {
    try {
      // For image editing, we need to download the image first and send it as form data
      const imageResponse = await fetch(image_url)
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image for editing')
      }
      
      const imageBlob = await imageResponse.blob()
      
      const formData = new FormData()
      formData.append('model', 'nano-banana')
      formData.append('prompt', prompt)
      formData.append('image', imageBlob, 'image.png')
      formData.append('size', size)
      formData.append('n', n.toString())

      const response = await fetch(
        'https://longcat-openai-api.onrender.com/v1/images/edits',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer pikachu@#25D'
          },
          body: formData
        }
      )

      if (!response.ok) {
        throw new Error(`Image editing failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        success: true,
        images: data.data.map((item: any) => ({
          url: item.url,
          revised_prompt: item.revised_prompt || prompt
        })),
        model: 'nano-banana',
        prompt,
        original_image: image_url,
        size
      }
    } catch (error) {
      console.error('Image editing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        model: 'nano-banana',
        prompt,
        original_image: image_url,
        size
      }
    }
  }
})