import { GoogleGenAI } from "@google/genai";
import { ZakraPayload, ModeloBase } from "../types";

// DEPRECATED: constructPayload replaced by generateUnifiedPayload
export const constructPayload = (
  modelo: ModeloBase,
  poseInput: string,
  clothingInput: string
): ZakraPayload => {
  return {} as ZakraPayload; // Placeholder
};

// Helper to ensure we have a clean base64 string
async function ensureBase64(input: string): Promise<string> {
  if (input.startsWith('http')) {
    const response = await fetch(input);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.replace(/^data:image\/\w+;base64,/, ''));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  // It's likely already base64, just clean it
  return input.replace(/^data:image\/\w+;base64,/, '');
}

export const generateUnifiedPayload = async (
  apiKey: string,
  modelImageSource: string, // Can be URL or Base64
  refImageSource: string    // Can be URL or Base64
): Promise<ZakraPayload> => {
  if (!apiKey) throw new Error("FALTA_CLAVE_API");

  console.log("Gemini Payload Gen using key length:", apiKey.length);
  const ai = new GoogleGenAI({ apiKey });
  // Using Gemini 3.0 Pro for payload/text generation
  const modelId = 'gemini-3-pro-preview';

  const cleanModel = await ensureBase64(modelImageSource);
  const cleanRef = await ensureBase64(refImageSource);

  const prompt = `
You are an expert prompt engineer creating JSON payloads for AI image generation.

TASK: Analyze TWO images and create a detailed JSON payload that FUSES them.

RULES:
- IMAGE 1 (BASE MODEL): Extract ONLY the person's IDENTITY (face, eyes, skin tone, hair color/texture).
- IMAGE 2 (REFERENCE): Extract EVERYTHING ELSE (pose, expression, clothing, background, lighting, accessories).
- The goal is to generate an image of the BASE MODEL person IN the REFERENCE scene.

CRITICAL QUALITY REQUIREMENT:
The final image MUST look like a real, candid photograph. NEVER describe anything that would make it look:
- CGI or computer-generated
- Plastic, waxy, or airbrushed skin
- Overly smooth or artificial
- Like a 3D render or video game

ALWAYS emphasize: realistic skin texture with visible pores, natural imperfections, authentic lighting, genuine spontaneous moment.

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):
{
  "prompt_type": "[Describe the type of photo based on REFERENCE, e.g., 'candid indoor smartphone selfie', 'professional studio portrait']",
  "main_composition": "[Describe the scene/action from REFERENCE in natural language]",
  "subject": {
    "description": "[Describe the person using ONLY IMAGE 1's facial features: eye color/shape, skin tone, nose, lips, jawline, age, ethnicity. Be specific like 'striking light green/hazel almond-shaped eyes, defined dark arched eyebrows, realistic skin texture with warm undertones']",
    "hair": "[Describe hair from IMAGE 1: color, texture, length, style. Be specific like 'Extra long, sleek, straight dark chocolate brown hair (deep chestnut, warm tones) with a precise middle part']",
    "clothing": "[Describe clothing from REFERENCE in detail]",
    "pose_and_expression": "[Describe exact pose and facial expression from REFERENCE, e.g., 'Looking up at the camera with a wide, playful smile showing teeth']",
    "accessories": "[Describe any accessories visible in REFERENCE]"
  },
  "environment": {
    "background": "[Describe background from REFERENCE in rich detail]"
  },
  "lighting_and_atmosphere": "[Describe lighting and mood from REFERENCE]",
  "technical_quality": "[ALWAYS include: 'Raw photograph quality, realistic skin texture with visible pores and natural imperfections, sharp focus, natural depth of field, authentic lighting, NO CGI, NO plastic skin, NO artificial smoothing']"
}

IMPORTANT: Write naturally and specifically, not generically. The result must look like a real photo, not AI-generated.
   `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: cleanModel } },
            { inlineData: { mimeType: 'image/jpeg', data: cleanRef } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const candidate = response.candidates?.[0];

    // Check for Safety Block
    if (candidate?.finishReason === 'SAFETY') {
      console.error("PAYLOAD_GEN_BLOCKED: SAFETY");
      throw new Error("CONTENIDO_BLOQUEADO_SEGURIDAD");
    }

    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) throw new Error("NO_JSON_GENERATED");

    return JSON.parse(text) as ZakraPayload;

  } catch (error: any) {
    console.error("PAYLOAD_GEN_ERROR:", error);

    // Handle Quota/Token Errors (429)
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('Quota exceeded')) {
      throw new Error("QUOTA_API_AGOTADA");
    }

    // Re-throw specific errors
    if (error.message === "CONTENIDO_BLOQUEADO_SEGURIDAD") throw error;

    throw new Error("FALLO_ANALISIS_MULTIMODAL");
  }
};

export const generateIndustrialImage = async (
  apiKey: string,
  payload: ZakraPayload,
  baseModelImageSource: string, // Pass base model image for identity reference
  imageSize?: string, // '1K', '2K', '4K' or undefined for AUTO
  aspectRatio?: string, // '1:1', '4:3', '16:9', etc.
  userPlan?: string // 'free', 'basic', 'pro', 'premium'
): Promise<string> => {

  if (!apiKey) throw new Error("FALTA_CLAVE_API");

  // Validate resolution based on user plan
  const plan = userPlan || 'free';
  if ((plan === 'free' || plan === 'basic') && (imageSize === '2K' || imageSize === '4K')) {
    throw new Error("RESOLUTION_NOT_ALLOWED: Your plan only supports up to 1K resolution. Upgrade to Pro or Premium for higher resolutions.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Using Nano Banana Pro (Gemini 3 Pro Image Preview) for image generation
  // Model: gemini-3-pro-image-preview
  const modelId = 'gemini-3-pro-image-preview';

  // Convert the JSON payload to a natural language prompt for image generation
  const imagePrompt = `
Generate a photorealistic image with these EXACT specifications:

SUBJECT: ${payload.subject.description}
HAIR: ${payload.subject.hair}
CLOTHING: ${payload.subject.clothing}
POSE & EXPRESSION: ${payload.subject.pose_and_expression}
${payload.subject.accessories ? `ACCESSORIES: ${payload.subject.accessories}` : ''}

SCENE: ${payload.main_composition}
BACKGROUND: ${payload.environment.background}
LIGHTING: ${payload.lighting_and_atmosphere}

QUALITY: ${payload.technical_quality}

CRITICAL: This must look like a real photograph, NOT CGI. Realistic skin with visible pores, natural lighting, authentic moment.
The person in this image MUST have the EXACT face and identity shown in the reference image provided.
  `.trim();

  console.log("Image Generation Prompt:", imagePrompt);

  // Prepare base model image for identity reference
  const baseModelBase64 = await ensureBase64(baseModelImageSource);

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: imagePrompt },
            // Include base model image for identity reference
            { inlineData: { mimeType: 'image/jpeg', data: baseModelBase64 } }
          ]
        }
      ],
      config: {
        responseModalities: ['Text', 'Image'],
        // Add resolution and aspect ratio if specified
        ...(imageSize && { imageSize }),
        ...(aspectRatio && { aspectRatio })
      }
    });

    // Check for image in response
    // Check for image in response
    const candidates = response.candidates;
    const candidate = candidates?.[0];

    // Check for Safety Block
    if (candidate?.finishReason === 'SAFETY') {
      console.error("IMAGE_GEN_BLOCKED: SAFETY");
      throw new Error("CONTENIDO_BLOQUEADO_SEGURIDAD");
    }

    if (candidate) {
      const parts = candidate.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log("IMAGE DATA RECEIVED!");
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("NO_IMAGE_DATA_RECEIVED");

  } catch (error: any) {
    console.error("ZAKRA_GEN_ERROR:", error);

    // Handle Quota/Token Errors (429)
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('Quota exceeded')) {
      throw new Error("QUOTA_API_AGOTADA");
    }

    // Re-throw specific errors
    if (error.message === "CONTENIDO_BLOQUEADO_SEGURIDAD") throw error;

    throw new Error(error.message || "FALLO_GENERACION");
  }
};