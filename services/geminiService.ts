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
  refImageSource: string,   // Can be URL or Base64
  additionalModelImages?: string[] // Extra face references for better consistency
): Promise<ZakraPayload> => {
  if (!apiKey) throw new Error("FALTA_CLAVE_API");

  console.log("Gemini Payload Gen using key length:", apiKey.length);
  const ai = new GoogleGenAI({ apiKey });
  // Using Gemini 3.0 Pro for payload/text generation
  const modelId = 'gemini-3-pro-preview';

  const cleanModel = await ensureBase64(modelImageSource);
  const cleanRef = await ensureBase64(refImageSource);

  // Prepare additional model images if provided
  const extraImages: string[] = [];
  if (additionalModelImages && additionalModelImages.length > 0) {
    for (const img of additionalModelImages) {
      extraImages.push(await ensureBase64(img));
    }
  }

  const totalModelImages = 1 + extraImages.length;
  const hasMultipleRefs = extraImages.length > 0;

  const modelImageRule = hasMultipleRefs
    ? `- IMAGES 1-${totalModelImages} (BASE MODEL): These are ALL the SAME PERSON photographed from different angles. Use ALL of them together to accurately extract the person's IDENTITY (face, eyes, skin tone, hair color/texture, facial structure). The more references you have, the more precise your description must be.`
    : `- IMAGE 1 (BASE MODEL): Extract ONLY the person's IDENTITY (face, eyes, skin tone, hair color/texture).`;

  const refImageRule = hasMultipleRefs
    ? `- IMAGE ${totalModelImages + 1} (REFERENCE): Extract EVERYTHING ELSE (pose, expression, clothing, background, lighting, accessories).`
    : `- IMAGE 2 (REFERENCE): Extract EVERYTHING ELSE (pose, expression, clothing, background, lighting, accessories).`;

  const prompt = `
You are an expert prompt engineer creating JSON payloads for AI image generation.

TASK: Analyze the provided images and create a detailed JSON payload that FUSES them.

RULES:
${modelImageRule}
${refImageRule}
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
    "description": "[Describe the person using ONLY the BASE MODEL images' facial features: eye color/shape, skin tone, nose, lips, jawline, age, ethnicity. Be specific like 'striking light green/hazel almond-shaped eyes, defined dark arched eyebrows, realistic skin texture with warm undertones']",
    "hair": "[Describe hair from BASE MODEL images: color, texture, length, style. Be specific like 'Extra long, sleek, straight dark chocolate brown hair (deep chestnut, warm tones) with a precise middle part']",
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
    // Build image parts: all model images first, then reference image last
    const imageParts: any[] = [
      { inlineData: { mimeType: 'image/jpeg', data: cleanModel } },
    ];
    for (const extra of extraImages) {
      imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: extra } });
    }
    imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanRef } });

    console.log(`Sending ${totalModelImages} model image(s) + 1 reference image to Gemini`);

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...imageParts
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
  userPlan?: string, // 'free', 'starter', 'creator', 'pro', 'studio'
  additionalModelImages?: string[], // Extra face references for better consistency
  customInstructions?: string // Optional user instructions to refine the output
): Promise<string> => {

  if (!apiKey) throw new Error("FALTA_CLAVE_API");

  // Validate resolution based on user plan
  const plan = userPlan || 'free';
  if ((plan === 'free' || plan === 'starter') && (imageSize === '2K' || imageSize === '4K')) {
    throw new Error("RESOLUTION_NOT_ALLOWED: Your plan only supports up to 1K resolution. Upgrade to Creator or higher for 2K/4K resolutions.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Using Nano Banana Pro (Gemini 3 Pro Image Preview) for image generation
  // Model: gemini-3-pro-image-preview
  const modelId = 'gemini-3-pro-image-preview';

  // Convert the JSON payload to a natural language prompt for image generation
  // Custom instructions are added as refinements without overriding core quality requirements
  const customSection = customInstructions?.trim()
    ? `\n\nADDITIONAL REFINEMENTS (apply subtly while maintaining photorealism):\n${customInstructions.trim()}`
    : '';

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

QUALITY: ${payload.technical_quality}${customSection}

CRITICAL: This must look like a real photograph, NOT CGI. Realistic skin with visible pores, natural lighting, authentic moment.
The person in this image MUST have the EXACT face and identity shown in the reference image provided.
  `.trim();

  console.log("Image Generation Prompt:", imagePrompt);

  // Prepare base model image for identity reference
  const baseModelBase64 = await ensureBase64(baseModelImageSource);

  // Prepare additional model images
  const extraImages: string[] = [];
  if (additionalModelImages && additionalModelImages.length > 0) {
    for (const img of additionalModelImages) {
      extraImages.push(await ensureBase64(img));
    }
  }

  try {
    // Build image config for resolution and aspect ratio
    const imageConfig: any = {};
    if (imageSize && imageSize !== 'AUTO') {
      imageConfig.imageSize = imageSize; // '1K', '2K', '4K'
    }
    if (aspectRatio && aspectRatio !== 'AUTO') {
      imageConfig.aspectRatio = aspectRatio; // '1:1', '4:3', '16:9', etc.
    }

    // Build image parts: primary model image + extras
    const modelImageParts: any[] = [
      { inlineData: { mimeType: 'image/jpeg', data: baseModelBase64 } },
    ];
    for (const extra of extraImages) {
      modelImageParts.push({ inlineData: { mimeType: 'image/jpeg', data: extra } });
    }

    console.log(`Generating with ${1 + extraImages.length} model reference image(s)`);

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: imagePrompt },
            ...modelImageParts
          ]
        }
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Must be uppercase per Gemini API docs
        // Use imageConfig to specify resolution and aspect ratio
        ...(Object.keys(imageConfig).length > 0 && { imageConfig })
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

// ============================================
// POSE VARIATION - Generate same scene with different pose
// For Creator, Pro, Studio plans only
// ============================================

export const generatePoseVariation = async (
  apiKey: string,
  originalPayload: ZakraPayload,
  previouslyGeneratedImage: string, // The image we want to change the pose of
  newPoseDescription: string, // "auto" for AI-chosen pose, or custom description
  baseModelImageSource: string,
  imageSize?: string,
  aspectRatio?: string,
  additionalModelImages?: string[]
): Promise<string> => {

  if (!apiKey) throw new Error("FALTA_CLAVE_API");

  const ai = new GoogleGenAI({ apiKey });
  const modelId = 'gemini-3-pro-image-preview';

  // Prepare all images
  const baseModelBase64 = await ensureBase64(baseModelImageSource);
  const generatedImageBase64 = await ensureBase64(previouslyGeneratedImage);

  const extraModelImages: string[] = [];
  if (additionalModelImages && additionalModelImages.length > 0) {
    for (const img of additionalModelImages) {
      extraModelImages.push(await ensureBase64(img));
    }
  }

  // Determine the new pose
  const isAutoPose = newPoseDescription === 'auto' || !newPoseDescription;
  const poseInstruction = isAutoPose
    ? "a natural, slightly different pose and expression (as if taken moments later in the same photoshoot)"
    : newPoseDescription;

  // Build the pose variation prompt - emphasizes keeping EVERYTHING the same except pose
  const imagePrompt = `
POSE VARIATION REQUEST - Generate the SAME photo with a DIFFERENT POSE.

REFERENCE IMAGE (provided): This is the original generated image. You MUST maintain:
- EXACT same background, setting, and environment
- EXACT same lighting, shadows, and atmosphere
- EXACT same clothing and accessories
- EXACT same person (face, hair, skin tone) - use the model reference images
- EXACT same camera angle and framing
- EXACT same overall mood and style

ONLY CHANGE: The person's pose and expression to: ${poseInstruction}

ORIGINAL SCENE DETAILS (for reference):
- Scene: ${originalPayload.main_composition}
- Background: ${originalPayload.environment.background}
- Lighting: ${originalPayload.lighting_and_atmosphere}
- Clothing: ${originalPayload.subject.clothing}
${originalPayload.subject.accessories ? `- Accessories: ${originalPayload.subject.accessories}` : ''}

SUBJECT IDENTITY (from model reference images):
- Face: ${originalPayload.subject.description}
- Hair: ${originalPayload.subject.hair}

CRITICAL REQUIREMENTS:
1. This must look like the NEXT FRAME in the same photoshoot - same everything except the pose
2. Maintain photorealistic quality: ${originalPayload.technical_quality}
3. The result must be indistinguishable from a real photograph
4. NO changes to background, lighting, clothing, or environment - ONLY the pose/expression changes
  `.trim();

  console.log("Pose Variation Prompt:", imagePrompt);

  try {
    const imageConfig: any = {};
    if (imageSize && imageSize !== 'AUTO') {
      imageConfig.imageSize = imageSize;
    }
    if (aspectRatio && aspectRatio !== 'AUTO') {
      imageConfig.aspectRatio = aspectRatio;
    }

    // Build image parts: model references + the generated image we're varying
    const imageParts: any[] = [
      // First: model reference images for face consistency
      { inlineData: { mimeType: 'image/jpeg', data: baseModelBase64 } },
    ];
    for (const extra of extraModelImages) {
      imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: extra } });
    }
    // Last: the generated image we want to vary (for scene/background consistency)
    imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: generatedImageBase64 } });

    console.log(`Pose variation: ${1 + extraModelImages.length} model refs + 1 generated image reference`);

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: imagePrompt },
            ...imageParts
          ]
        }
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        ...(Object.keys(imageConfig).length > 0 && { imageConfig })
      }
    });

    const candidate = response.candidates?.[0];

    if (candidate?.finishReason === 'SAFETY') {
      console.error("POSE_VAR_BLOCKED: SAFETY");
      throw new Error("CONTENIDO_BLOQUEADO_SEGURIDAD");
    }

    if (candidate) {
      const parts = candidate.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log("POSE VARIATION IMAGE RECEIVED!");
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("NO_IMAGE_DATA_RECEIVED");

  } catch (error: any) {
    console.error("POSE_VAR_ERROR:", error);

    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('Quota exceeded')) {
      throw new Error("QUOTA_API_AGOTADA");
    }

    if (error.message === "CONTENIDO_BLOQUEADO_SEGURIDAD") throw error;

    throw new Error(error.message || "FALLO_VARIACION_POSE");
  }
};