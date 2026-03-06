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
You are an expert visual analysis specialist and prompt engineer with 15+ years of experience in photography, digital art, and AI image generation. You excel at deconstructing every visual element and translating them into precise technical specifications.

TASK: Analyze the provided images and create a comprehensive JSON payload that FUSES them.

RULES:
${modelImageRule}
${refImageRule}
- The goal is to generate an image of the BASE MODEL person IN the REFERENCE scene.

CRITICAL IDENTITY PRESERVATION RULES:
1. FACE ACCESSORIES FROM MODEL: If the BASE MODEL is wearing ANY face accessories (face mask, surgical mask, bandana covering mouth, glasses, sunglasses, eye patch, headband, etc.), these MUST be included in the output. The model's face accessories are PART OF THEIR IDENTITY for this generation.
2. NO TATTOOS FROM REFERENCE: The REFERENCE image may have tattoos, but these must NEVER appear on the BASE MODEL person. The BASE MODEL's skin should remain exactly as shown in their reference images (clean skin unless the BASE MODEL specifically has tattoos).
3. NO BODY MODIFICATIONS FROM REFERENCE: Piercings, scars, birthmarks, or any body modifications visible on the REFERENCE person must NOT transfer to the BASE MODEL.
4. BODY TYPE FROM MODEL: The BASE MODEL's body type, skin tone, and physical characteristics must be preserved exactly.

CRITICAL QUALITY REQUIREMENT:
The final image MUST look like a real, candid photograph taken with an iPhone or high-end smartphone. NEVER describe anything that would make it look:
- CGI or computer-generated
- Plastic, waxy, or airbrushed skin
- Overly smooth or artificial
- Like a 3D render or video game
- "AI smooth" or overly perfect (real photos have natural variation)

ALWAYS emphasize: realistic skin texture with visible pores, natural imperfections, authentic lighting, genuine spontaneous moment.

ANALYSIS RULES:
- Hair: Measure exact length using body reference points. Identify specific cut style by name. Note texture AND quality. Capture natural imperfections (flyaways, frizz, uneven sections). AVOID describing hair as "perfect" - real hair has variation.
- Hands: Describe EACH hand separately with exact position. Note if visible or hidden. Document finger positions and tension level. Assess naturalness.
- Facial expression: Capture exact mouth position, quantify smile intensity, note eye expression, assess genuine vs posed quality.
- Background: Catalog EVERY visible object with position. For plants identify species. Analyze wall material (painted drywall vs concrete vs brick). Document floor type, spatial depth layers.
- Lighting: Distinguish dramatic directional vs flat even. Assess shadow edge quality (harsh vs soft), density, placement. Note if ambient fill is present. This is CRITICAL for recreation.
- Color: Extract dominant colors with hex values. Identify temperature (warm/cool), saturation level, and contrast.

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN, NO BACKTICKS):
{
  "prompt_type": "[Type of photo from REFERENCE: 'candid indoor smartphone selfie', 'professional studio portrait', 'outdoor natural light portrait', etc.]",
  "main_composition": "[Describe scene/action from REFERENCE. Include: rule applied (rule of thirds/center/symmetry), focal points, visual hierarchy, how eye moves through image]",
  "subject": {
    "description": "[FROM BASE MODEL ONLY: eye color/shape, skin tone with undertones, nose shape, lip shape, jawline, age estimate, ethnicity. Be hyper-specific: 'striking light green/hazel almond-shaped eyes, defined dark arched eyebrows, warm olive skin with visible pores and natural texture']",
    "hair": "[FROM BASE MODEL: color with undertones, texture, length, style. e.g., 'Extra long sleek straight dark chocolate brown hair (deep chestnut, warm tones) with precise middle part']",
    "face_accessories": "[FROM BASE MODEL: face mask/surgical mask/bandana/glasses/sunglasses/eye patch or 'none'. CRITICAL: If model wears a mask, describe it exactly: color, type, coverage]",
    "clothing": "[FROM REFERENCE: detailed clothing description including fabric type, fit, color, condition]",
    "pose_and_expression": "[FROM REFERENCE: exact body pose AND facial expression combined]",
    "body_accessories": "[FROM REFERENCE: jewelry, watches, bags, hats (non-face), or 'none']",
    "skin_notes": "[FROM BASE MODEL: note if skin is clean/clear, any visible tattoos ON THE MODEL, birthmarks. IMPORTANT: Do NOT include tattoos from REFERENCE - only from BASE MODEL]",
    "hair_detailed": {
      "length": "[Exact length using body reference: pixie/short/chin-length/shoulder-length/mid-back/long/very long]",
      "cut": "[Specific style name: blunt bob/layered/shaggy/undercut/fade/tapered/disconnected]",
      "texture": "[Natural pattern: straight/wavy (loose waves/s-waves)/curly (tight curls)/coily]",
      "texture_quality": "[Strand quality: smooth/coarse/fine/thick/thin]",
      "natural_imperfections": "[Observable variation: flyaways/frizz/uneven sections/growth patterns/cowlicks - be honest, real hair is not perfect]",
      "styling": "[Current state: sleek/tousled/wet look/blow-dried/natural/messy. Include: degree of styling, product visibility, movement quality]",
      "part": "[Exact location: center/side/deep side/no part/zigzag]",
      "volume": "[Root lift and fullness: flat/moderate volume/voluminous]",
      "details": "[Specific features: bangs type, face-framing layers, buzzed sections, faded areas, length variations]"
    },
    "facial_expression": {
      "mouth": "[Exact position: closed smile/open smile/slight smile/neutral/serious/pursed]",
      "smile_intensity": "[Degree: no smile/subtle/moderate/broad/wide]",
      "eyes": "[Expression: direct gaze/looking away/squinting/wide/relaxed/intense]",
      "eyebrows": "[Position: raised/neutral/furrowed/relaxed]",
      "overall_emotion": "[Tone: happy/content/serious/playful/confident/approachable/warm]",
      "authenticity": "[Quality: genuine/posed/candid/formal/natural]"
    },
    "hands_and_gestures": {
      "left_hand": "[Exact position: touching face/holding object/resting/in pocket/behind back/not visible]",
      "right_hand": "[Exact position: touching face/holding object/resting/in pocket/behind back/not visible]",
      "finger_positions": "[Specific: relaxed/gripping/spread/interlaced/curled/pointing]",
      "hand_tension": "[Observable: relaxed/tense/natural/posed/rigid]",
      "interaction": "[What hands are doing: holding phone/touching hair/on hip/crossed/clasped/gesturing]",
      "naturalness": "[Assessment: organic casual gesture/deliberately posed/caught mid-motion/static formal]"
    },
    "body_positioning": {
      "posture": "[Exact: standing/sitting/leaning/lying]",
      "angle": "[Relative to camera: facing camera/45 degree turn/profile/back to camera]",
      "weight_distribution": "[Balance: leaning left/right/centered/shifted]",
      "shoulders": "[Position: level/tilted/rotated/hunched/back]"
    }
  },
  "environment": {
    "background": "[Rich description of background from REFERENCE]",
    "setting_type": "[indoor/outdoor/studio/natural environment - specific location type]",
    "spatial_depth": "[shallow/medium/deep - describe depth layers: foreground, midground, background elements]",
    "wall_surface": {
      "material": "[Exact base: painted drywall/concrete/brick/wood paneling/tile/plaster]",
      "texture": "[Tactile quality: perfectly smooth/slightly textured/rough/patterned]",
      "finish": "[Sheen: matte/satin/glossy/flat]",
      "color": "[Specific with undertones: warm gray/cool blue-gray/off-white/cream]",
      "features": "[ALL observable details: clean/water stains/streaks/cracks/patches/fixtures/artwork]",
      "condition": "[State: pristine/aged/weathered/industrial/residential]"
    },
    "floor_surface": {
      "material": "[Exact type: hardwood/tile/carpet/concrete/grass]",
      "color": "[Specific color]",
      "pattern": "[If present: solid/checkered/herringbone]"
    },
    "objects_catalog": "[List EVERY visible object with position and depth layer: 'monstera plant - left background, wooden shelf - right midground, etc.']"
  },
  "lighting_and_atmosphere": "[General lighting mood description - kept for backwards compatibility]",
  "lighting_detailed": {
    "type": "[Source: natural window light/artificial/mixed/studio/practical lights]",
    "direction": "[Where from: front/45-degree side/90-degree side/back/top/diffused from above]",
    "directionality": "[How focused: highly directional (strong shadows)/moderately directional/diffused/omni-directional]",
    "quality": "[Character: hard light/soft light/dramatic/even/gradient/sculpted]",
    "intensity": "[Level: bright/moderate/low/moody/high-key/low-key]",
    "contrast_ratio": "[Shadow-to-highlight: high contrast (dramatic)/medium contrast/low contrast (flat)]",
    "shadows": {
      "type": "[Edge quality: harsh defined edges/soft gradual edges/minimal/dramatic/absent]",
      "density": "[Depth: deep black/gray/transparent/faint]",
      "placement": "[Where: under subject/on wall/from objects/cast patterns]"
    },
    "highlights": {
      "treatment": "[Style: blown out/preserved/subtle/dramatic/specular]",
      "placement": "[Where light hits: on face/hair/clothing/background]"
    },
    "ambient_fill": "[present/absent - is there secondary fill light reducing shadows?]",
    "light_temperature": "[Color cast: warm golden/neutral/cool blue]"
  },
  "color_profile": {
    "dominant_colors": [
      {"color": "[Name]", "hex": "[#hexcode]", "role": "[background/accent/primary subject]"}
    ],
    "temperature": "[Overall: warm/cool/neutral]",
    "saturation": "[Level: highly saturated/moderate/desaturated]",
    "contrast": "[Visual: high contrast/medium contrast/low contrast/soft]"
  },
  "technical_specs": {
    "style": "[realistic/hyperrealistic/stylized/minimalist]",
    "texture": "[Image texture: smooth/grainy/sharp/soft/glossy/matte]",
    "sharpness": "[Focus: tack sharp/slightly soft/deliberately soft/bokeh effect]",
    "grain": "[Noise: none/film grain/digital noise/intentional grain]",
    "depth_of_field": "[DOF: shallow (blurred background)/medium/deep (everything sharp) - describe subject isolation]",
    "perspective": "[Viewpoint: straight on/low angle/high angle/dutch angle/eye level]"
  },
  "technical_quality": "[ALWAYS include: 'Raw photograph quality, realistic skin texture with visible pores and natural imperfections, sharp focus, natural depth of field, authentic lighting, NO CGI, NO plastic skin, NO artificial smoothing']"
}

IMPORTANT: 
- Write naturally and hyper-specifically, not generically. Every field must contain meaningful detailed analysis.
- Use precise technical terminology for lighting, color, and composition.
- The result must be indistinguishable from a real photograph.
- For hair and skin: describe natural variation and imperfections - avoid "AI perfect" descriptions.
- For background: be exhaustive - catalog every visible element with position.
- For lighting: the shadow and highlight analysis is CRITICAL for maintaining quality across pose variations.

CRITICAL REMINDERS:
- FACE ACCESSORIES (masks, glasses, etc.): Extract from BASE MODEL, NOT from reference. If the model wears a black face mask, the output MUST have the black face mask.
- TATTOOS: NEVER copy tattoos from the REFERENCE image to the output. The BASE MODEL's skin should remain as shown in their photos (typically clean/clear unless they specifically have tattoos).
- The output person should look like the BASE MODEL dressed in the REFERENCE's clothing and in the REFERENCE's scene - but with the MODEL's face, body, skin, and any face accessories they wear.
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
      throw new Error("CONTENIDO_BLOQUEADO_SEGURIDAD");
    }

    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) throw new Error("NO_JSON_GENERATED");

    return JSON.parse(text) as ZakraPayload;

  } catch (error: any) {
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

  // Build enhanced sections from v2 fields (with fallback to v1)
  const hairSection = payload.subject.hair_detailed
    ? `HAIR (DETAILED):
  - Length & Cut: ${payload.subject.hair_detailed.length}, ${payload.subject.hair_detailed.cut}
  - Texture: ${payload.subject.hair_detailed.texture} (${payload.subject.hair_detailed.texture_quality})
  - Natural Imperfections: ${payload.subject.hair_detailed.natural_imperfections}
  - Styling: ${payload.subject.hair_detailed.styling}
  - Part: ${payload.subject.hair_detailed.part} | Volume: ${payload.subject.hair_detailed.volume}
  - Details: ${payload.subject.hair_detailed.details}`
    : `HAIR: ${payload.subject.hair}`;

  const expressionSection = payload.subject.facial_expression
    ? `FACIAL EXPRESSION:
  - Mouth: ${payload.subject.facial_expression.mouth} (smile intensity: ${payload.subject.facial_expression.smile_intensity})
  - Eyes: ${payload.subject.facial_expression.eyes}
  - Eyebrows: ${payload.subject.facial_expression.eyebrows}
  - Emotion: ${payload.subject.facial_expression.overall_emotion} (${payload.subject.facial_expression.authenticity})`
    : '';

  const handsSection = payload.subject.hands_and_gestures
    ? `HANDS & GESTURES:
  - Left hand: ${payload.subject.hands_and_gestures.left_hand}
  - Right hand: ${payload.subject.hands_and_gestures.right_hand}
  - Fingers: ${payload.subject.hands_and_gestures.finger_positions}
  - Tension: ${payload.subject.hands_and_gestures.hand_tension}
  - Interaction: ${payload.subject.hands_and_gestures.interaction}
  - Naturalness: ${payload.subject.hands_and_gestures.naturalness}`
    : '';

  const bodySection = payload.subject.body_positioning
    ? `BODY POSITION:
  - Posture: ${payload.subject.body_positioning.posture}
  - Angle: ${payload.subject.body_positioning.angle}
  - Weight: ${payload.subject.body_positioning.weight_distribution}
  - Shoulders: ${payload.subject.body_positioning.shoulders}`
    : '';

  const lightingSection = payload.lighting_detailed
    ? `LIGHTING (DETAILED):
  - Type: ${payload.lighting_detailed.type} | Direction: ${payload.lighting_detailed.direction}
  - Directionality: ${payload.lighting_detailed.directionality}
  - Quality: ${payload.lighting_detailed.quality} | Intensity: ${payload.lighting_detailed.intensity}
  - Contrast Ratio: ${payload.lighting_detailed.contrast_ratio}
  - Shadows: ${payload.lighting_detailed.shadows.type}, density: ${payload.lighting_detailed.shadows.density}, placement: ${payload.lighting_detailed.shadows.placement}
  - Highlights: ${payload.lighting_detailed.highlights.treatment}, on: ${payload.lighting_detailed.highlights.placement}
  - Ambient Fill: ${payload.lighting_detailed.ambient_fill}
  - Light Temperature: ${payload.lighting_detailed.light_temperature}`
    : `LIGHTING: ${payload.lighting_and_atmosphere}`;

  const colorSection = payload.color_profile
    ? `COLOR PROFILE:
  - Dominant Colors: ${payload.color_profile.dominant_colors.map(c => `${c.color} (${c.hex}, ${c.role})`).join(', ')}
  - Temperature: ${payload.color_profile.temperature}
  - Saturation: ${payload.color_profile.saturation}
  - Contrast: ${payload.color_profile.contrast}`
    : '';

  const backgroundSection = payload.environment.wall_surface
    ? `BACKGROUND: ${payload.environment.background}
ENVIRONMENT DETAILS:
  - Setting: ${payload.environment.setting_type || 'unspecified'}
  - Spatial Depth: ${payload.environment.spatial_depth || 'unspecified'}
  - Wall: ${payload.environment.wall_surface.material}, ${payload.environment.wall_surface.texture}, ${payload.environment.wall_surface.finish} finish, color: ${payload.environment.wall_surface.color}, condition: ${payload.environment.wall_surface.condition}${payload.environment.wall_surface.features !== 'clean' ? `, features: ${payload.environment.wall_surface.features}` : ''}
  ${payload.environment.floor_surface ? `- Floor: ${payload.environment.floor_surface.material}, ${payload.environment.floor_surface.color}${payload.environment.floor_surface.pattern ? `, ${payload.environment.floor_surface.pattern}` : ''}` : ''}
  ${payload.environment.objects_catalog ? `- Objects: ${payload.environment.objects_catalog}` : ''}`
    : `BACKGROUND: ${payload.environment.background}`;

  const techSpecsSection = payload.technical_specs
    ? `TECHNICAL SPECS:
  - Style: ${payload.technical_specs.style}
  - Texture: ${payload.technical_specs.texture} | Sharpness: ${payload.technical_specs.sharpness}
  - Grain: ${payload.technical_specs.grain}
  - Depth of Field: ${payload.technical_specs.depth_of_field}
  - Perspective: ${payload.technical_specs.perspective}`
    : '';

  // Build face accessories section (masks, glasses from MODEL)
  const faceAccessoriesSection = payload.subject.face_accessories && payload.subject.face_accessories !== 'none'
    ? `FACE ACCESSORIES (MUST INCLUDE): ${payload.subject.face_accessories}`
    : '';

  // Build body accessories section (jewelry, watches from REFERENCE)
  const bodyAccessoriesSection = payload.subject.body_accessories && payload.subject.body_accessories !== 'none'
    ? `BODY ACCESSORIES: ${payload.subject.body_accessories}`
    : '';

  // Build skin notes section (clean skin, no reference tattoos)
  const skinNotesSection = payload.subject.skin_notes
    ? `SKIN: ${payload.subject.skin_notes}`
    : 'SKIN: Clean, clear skin without tattoos (unless specifically noted above)';

  const imagePrompt = `
Generate a photorealistic image with these EXACT specifications. This must look like a real photograph taken with an iPhone or high-end camera.

SUBJECT: ${payload.subject.description}
${hairSection}
${faceAccessoriesSection ? `${faceAccessoriesSection}` : ''}
${skinNotesSection}
CLOTHING: ${payload.subject.clothing}
POSE & EXPRESSION: ${payload.subject.pose_and_expression}
${expressionSection ? `${expressionSection}` : ''}
${bodyAccessoriesSection ? `${bodyAccessoriesSection}` : ''}
${payload.subject.accessories ? `ACCESSORIES: ${payload.subject.accessories}` : ''}
${handsSection ? `${handsSection}` : ''}
${bodySection ? `${bodySection}` : ''}

SCENE: ${payload.main_composition}
${backgroundSection}
${lightingSection}
${colorSection ? `${colorSection}` : ''}
${techSpecsSection ? `${techSpecsSection}` : ''}

QUALITY: ${payload.technical_quality}${customSection}

CRITICAL REQUIREMENTS:
1. This must look like a REAL photograph, NOT CGI. Realistic skin with visible pores, natural imperfections, authentic lighting.
2. The person MUST have the EXACT face and identity shown in the reference image provided.
3. Maintain the exact color temperature, saturation, and contrast described above.
4. Reproduce the lighting direction, shadow quality, and highlight placement precisely.
5. Hair must show natural variation - flyaways, texture inconsistencies, not "AI perfect" smoothness.
6. Hands must look natural with correct finger anatomy and relaxed positioning.

IDENTITY PRESERVATION (CRITICAL):
7. FACE ACCESSORIES: If the model wears a face mask, glasses, or any face covering, it MUST appear in the output exactly as described above.
8. NO TATTOOS: The output person must NOT have any tattoos unless the BASE MODEL specifically has tattoos. Do NOT copy tattoos from reference poses.
9. CLEAN SKIN: The model's skin should match their reference photos - typically clean and clear without tattoos or body modifications from the pose reference.
  `.trim();

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
      throw new Error("CONTENIDO_BLOQUEADO_SEGURIDAD");
    }

    if (candidate) {
      const parts = candidate.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("NO_IMAGE_DATA_RECEIVED");

  } catch (error: any) {
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

  // Build enhanced sections for pose variation (re-inject all quality-critical details)
  const pv_hairSection = originalPayload.subject.hair_detailed
    ? `  - Hair Length & Cut: ${originalPayload.subject.hair_detailed.length}, ${originalPayload.subject.hair_detailed.cut}
  - Hair Texture: ${originalPayload.subject.hair_detailed.texture} (${originalPayload.subject.hair_detailed.texture_quality})
  - Hair Imperfections: ${originalPayload.subject.hair_detailed.natural_imperfections}
  - Hair Styling: ${originalPayload.subject.hair_detailed.styling}
  - Hair Part: ${originalPayload.subject.hair_detailed.part} | Volume: ${originalPayload.subject.hair_detailed.volume}`
    : `  - Hair: ${originalPayload.subject.hair}`;

  const pv_lightingSection = originalPayload.lighting_detailed
    ? `LIGHTING (MUST REPLICATE EXACTLY):
  - Type: ${originalPayload.lighting_detailed.type}
  - Direction: ${originalPayload.lighting_detailed.direction}
  - Directionality: ${originalPayload.lighting_detailed.directionality}
  - Quality: ${originalPayload.lighting_detailed.quality} | Intensity: ${originalPayload.lighting_detailed.intensity}
  - Contrast Ratio: ${originalPayload.lighting_detailed.contrast_ratio}
  - Shadows: ${originalPayload.lighting_detailed.shadows.type}, density: ${originalPayload.lighting_detailed.shadows.density}, placement: ${originalPayload.lighting_detailed.shadows.placement}
  - Highlights: ${originalPayload.lighting_detailed.highlights.treatment} on ${originalPayload.lighting_detailed.highlights.placement}
  - Ambient Fill: ${originalPayload.lighting_detailed.ambient_fill}
  - Light Temperature: ${originalPayload.lighting_detailed.light_temperature}
  NOTE: Shadows will naturally shift with the new pose, but maintain the SAME light source position, quality, temperature, and contrast ratio.`
    : `LIGHTING: ${originalPayload.lighting_and_atmosphere}`;

  const pv_colorSection = originalPayload.color_profile
    ? `COLOR PROFILE (MUST MATCH EXACTLY):
  - Dominant Colors: ${originalPayload.color_profile.dominant_colors.map(c => `${c.color} (${c.hex}, ${c.role})`).join(', ')}
  - Temperature: ${originalPayload.color_profile.temperature}
  - Saturation: ${originalPayload.color_profile.saturation}
  - Contrast: ${originalPayload.color_profile.contrast}
  NOTE: The color grading, temperature, and saturation MUST be identical to the original.`
    : '';

  const pv_backgroundSection = originalPayload.environment.wall_surface
    ? `BACKGROUND (MUST BE IDENTICAL):
  - Setting: ${originalPayload.environment.setting_type || originalPayload.environment.background}
  - Spatial Depth: ${originalPayload.environment.spatial_depth || 'as in reference'}
  - Wall: ${originalPayload.environment.wall_surface.material}, ${originalPayload.environment.wall_surface.texture}, ${originalPayload.environment.wall_surface.finish} finish, color: ${originalPayload.environment.wall_surface.color}${originalPayload.environment.wall_surface.features !== 'clean' ? `, features: ${originalPayload.environment.wall_surface.features}` : ''}
  ${originalPayload.environment.floor_surface ? `- Floor: ${originalPayload.environment.floor_surface.material}, ${originalPayload.environment.floor_surface.color}` : ''}
  ${originalPayload.environment.objects_catalog ? `- Objects: ${originalPayload.environment.objects_catalog}` : ''}
  - Full description: ${originalPayload.environment.background}`
    : `BACKGROUND (MUST BE IDENTICAL): ${originalPayload.environment.background}`;

  const pv_techSpecs = originalPayload.technical_specs
    ? `TECHNICAL SPECS (MUST MATCH):
  - Style: ${originalPayload.technical_specs.style}
  - Texture: ${originalPayload.technical_specs.texture} | Sharpness: ${originalPayload.technical_specs.sharpness}
  - Grain: ${originalPayload.technical_specs.grain}
  - Depth of Field: ${originalPayload.technical_specs.depth_of_field}
  - Perspective: ${originalPayload.technical_specs.perspective}`
    : '';

  // Build the pose variation prompt - comprehensive quality preservation
  const imagePrompt = `
POSE VARIATION REQUEST - Generate the SAME photo with a DIFFERENT POSE while maintaining IDENTICAL quality.

You are looking at TWO types of reference images:
1. MODEL REFERENCE (face/identity images): Use these to maintain the EXACT same person identity
2. ORIGINAL GENERATED IMAGE (last image): This is the photo we want to recreate with a different pose

WHAT MUST STAY IDENTICAL (copy from the original image):
- Background, setting, environment, every object in its exact position
- Clothing, accessories, fabric texture and fit
- The person's face, skin tone, hair color and style
- Camera angle, framing, and perspective
- Overall mood, atmosphere, and image quality

WHAT CHANGES: The person's pose and expression to: ${poseInstruction}

═══════════════════════════════════════
SUBJECT IDENTITY (from model references):
  - Face: ${originalPayload.subject.description}
${pv_hairSection}
  ${originalPayload.subject.face_accessories && originalPayload.subject.face_accessories !== 'none' ? `- FACE ACCESSORIES (MUST INCLUDE): ${originalPayload.subject.face_accessories}` : ''}
  - Skin: ${originalPayload.subject.skin_notes || 'Clean, clear skin without tattoos'}
  - Clothing: ${originalPayload.subject.clothing}
  ${originalPayload.subject.body_accessories && originalPayload.subject.body_accessories !== 'none' ? `- Body Accessories: ${originalPayload.subject.body_accessories}` : ''}
  ${originalPayload.subject.accessories ? `- Accessories: ${originalPayload.subject.accessories}` : ''}

NEW POSE/EXPRESSION:
  - ${poseInstruction}
  ${isAutoPose ? '- Hands should be in a natural, relaxed position appropriate for the new pose' : ''}

═══════════════════════════════════════
SCENE: ${originalPayload.main_composition}

${pv_backgroundSection}

${pv_lightingSection}

${pv_colorSection ? `${pv_colorSection}` : ''}

${pv_techSpecs ? `${pv_techSpecs}` : ''}

═══════════════════════════════════════
QUALITY REQUIREMENTS:
${originalPayload.technical_quality}

CRITICAL RULES FOR QUALITY PRESERVATION:
1. This must look like the NEXT FRAME in the same photoshoot — same everything except the pose.
2. The image must be indistinguishable from a real photograph taken with an iPhone or high-end camera.
3. SKIN: Realistic texture with visible pores, natural imperfections, warm undertones — NO plastic, NO airbrushed, NO CGI look.
4. HAIR: Must show natural variation — flyaways, texture inconsistencies, movement. NOT "AI smooth" perfect hair.
5. HANDS: Must have correct anatomy with natural finger positions. Relaxed, organic placement — NOT stiff or malformed.
6. LIGHTING CONSISTENCY: The light source position, quality, temperature, and contrast ratio must remain IDENTICAL. Only the shadows on the subject shift naturally with the new pose.
7. COLOR CONSISTENCY: The color temperature, saturation level, and overall color grading must be EXACTLY the same as the original.
8. BACKGROUND: Must be pixel-level similar — same wall texture, same objects, same spatial depth.
9. DO NOT degrade image quality, sharpness, or detail level from the original.

IDENTITY PRESERVATION (CRITICAL):
10. FACE ACCESSORIES: If the model wears a face mask, glasses, or any face covering, it MUST appear in the output exactly as described.
11. NO TATTOOS: The output person must NOT have any tattoos unless the BASE MODEL specifically has tattoos. Never add tattoos from reference images.
12. CLEAN SKIN: The model's skin should remain clean and clear as in their reference photos.
  `.trim();

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
      throw new Error("CONTENIDO_BLOQUEADO_SEGURIDAD");
    }

    if (candidate) {
      const parts = candidate.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("NO_IMAGE_DATA_RECEIVED");

  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('Quota exceeded')) {
      throw new Error("QUOTA_API_AGOTADA");
    }

    if (error.message === "CONTENIDO_BLOQUEADO_SEGURIDAD") throw error;

    throw new Error(error.message || "FALLO_VARIACION_POSE");
  }
};