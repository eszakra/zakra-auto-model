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

// Helper to ensure we have a clean base64 string (no data: prefix) AND the correct MIME type.
// Handles: http/https URLs, blob: URLs, data: URLs
// Returns { data: string (pure base64), mimeType: string }
async function ensureBase64(input: string): Promise<{ data: string; mimeType: string }> {
  if (input.startsWith('http') || input.startsWith('blob:')) {
    // Fetch the URL (works for both http and blob: URLs)
    const response = await fetch(input);
    const blob = await response.blob();
    const detectedMime = blob.type || 'image/jpeg';
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
        resolve({ data: base64, mimeType: detectedMime });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  // Already a data: URL — extract real MIME type from prefix then strip it
  const mimeMatch = input.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const data = input.replace(/^data:[^;]+;base64,/, '');
  return { data, mimeType };
}

export const generateUnifiedPayload = async (
  apiKey: string,
  modelFaceImageSource: string, // Close-up face photo — identity (face, eyes, skin tone)
  refImageSource: string,       // Scene reference — pose, clothing, background, lighting
  additionalModelImages?: string[], // Legacy extra angles (kept for backward compat)
  modelBodyImageSource?: string // Full-body photo — body type, proportions, curves
): Promise<ZakraPayload> => {
  if (!apiKey) throw new Error("FALTA_CLAVE_API");

  const ai = new GoogleGenAI({ apiKey });
  // Using Gemini 3.0 Pro for payload/text generation
  const modelId = 'gemini-3-pro-preview';

  // Fetch all images in parallel — face, ref, body, and extras all at once
  const [cleanFace, cleanRef, cleanBody, ...extraImages] = await Promise.all([
    ensureBase64(modelFaceImageSource),
    ensureBase64(refImageSource),
    modelBodyImageSource ? ensureBase64(modelBodyImageSource) : Promise.resolve(null),
    ...(additionalModelImages ?? []).map(img => ensureBase64(img)),
  ]);

  // Build image index labels for the prompt
  // Order: [FACE] [BODY?] [EXTRA_ANGLES...] [REFERENCE]
  let imgIndex = 1;
  const faceIndex = imgIndex++;
  const bodyIndex = cleanBody ? imgIndex++ : null;
  const extraStartIndex = imgIndex;
  imgIndex += extraImages.length;
  const refIndex = imgIndex;

  const faceRule = `- IMAGE ${faceIndex} (FACE — BASE MODEL): Close-up face photo of the model. Extract ONLY AND EXCLUSIVELY: eye color/shape, skin tone with undertones, nose shape, lip shape, jawline, age estimate, ethnicity, hair color/texture/length/style, any face accessories (glasses, mask, etc.). IGNORE COMPLETELY: background, lighting, setting, clothing, photographic quality, environment — everything that is NOT the person's face and hair.`;

  const bodyRule = bodyIndex
    ? `- IMAGE ${bodyIndex} (BODY — BASE MODEL): Full-body photo of THE SAME PERSON. Extract ONLY AND EXCLUSIVELY: body type (slim/athletic/curvy/plus-size/petite), proportions (shoulder width, hip width, waist definition), visible curves, height impression, posture tendency. IGNORE COMPLETELY: clothing, background, lighting, setting, environment, photographic quality — everything that is NOT the physical body shape.`
    : '';

  const extraRule = extraImages.length > 0
    ? `- IMAGES ${extraStartIndex}–${extraStartIndex + extraImages.length - 1} (EXTRA ANGLES — BASE MODEL): Additional photos of the same person for face/identity accuracy only. IGNORE their backgrounds and lighting completely.`
    : '';

  const refRule = `- IMAGE ${refIndex} (SCENE REFERENCE — THE ONLY SOURCE FOR EVERYTHING ELSE): This is the ONLY image from which you extract: pose, expression, clothing, background, lighting, environment, accessories, color grading, photographic style, camera quality, depth of field, grain, color temperature. ALL scene and quality information comes exclusively from THIS image. Nothing from the model photos should influence the scene, background, or photographic quality.`;

  const prompt = `
You are an expert visual analysis specialist and prompt engineer with 15+ years of experience in photography, digital art, and AI image generation. You excel at deconstructing every visual element and translating them into precise technical specifications.

TASK: Analyze the provided images and create a comprehensive JSON payload that FUSES them.

RULES:
${faceRule}
${bodyRule}
${extraRule}
${refRule}
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

ANALYSIS RULES — SOURCE IS CRITICAL:

FROM THE MODEL PHOTOS (face + body) ONLY:
- Hair: Measure exact length using body reference points. Identify specific cut style by name. Note texture AND quality. Capture natural imperfections (flyaways, frizz, uneven sections). Real hair has variation — never describe as "perfect".
- Face & identity: eye color, skin tone, facial features, face accessories.
- Body type: honest specific description of proportions and curves as they actually appear.

FROM THE SCENE REFERENCE ONLY (ignore model photos for these):
- Hands: Describe EACH hand separately with exact position, finger positions, tension, naturalness — from REFERENCE pose.
- Facial expression: Capture exact mouth position, smile intensity, eye expression — from REFERENCE.
- Background: Catalog EVERY visible object with position. For plants identify species. Analyze wall material (painted drywall vs concrete vs brick). Document floor type, spatial depth layers. FROM REFERENCE ONLY.
- Lighting: Distinguish dramatic directional vs flat even. Shadow edge quality (harsh vs soft), density, placement, ambient fill. CRITICAL for recreation. FROM REFERENCE ONLY.
- Color: Dominant colors with hex values, temperature (warm/cool), saturation, contrast. FROM REFERENCE ONLY.
- PHOTOGRAPHIC QUALITY (CRITICAL — FROM REFERENCE ONLY): Analyze the REFERENCE image as a professional photographer would. Is it iPhone/smartphone (natural noise, vivid HDR, slightly soft edges) or DSLR? Exact grain level, rendering style. Capture precisely in technical_specs and technical_quality. The model photos' photographic quality is IRRELEVANT — only the reference image's quality matters.

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN, NO BACKTICKS):
{
  "prompt_type": "[Type of photo from REFERENCE: 'candid indoor smartphone selfie', 'professional studio portrait', 'outdoor natural light portrait', etc.]",
  "main_composition": "[Describe scene/action from REFERENCE. Include: rule applied (rule of thirds/center/symmetry), focal points, visual hierarchy, how eye moves through image]",
  "subject": {
    "description": "[FROM FACE PHOTO ONLY: eye color/shape, skin tone with undertones, nose shape, lip shape, jawline, age estimate, ethnicity. Be hyper-specific: 'striking light green/hazel almond-shaped eyes, defined dark arched eyebrows, warm olive skin with visible pores and natural texture']",
    "body_type": "[FROM BODY PHOTO: exact body type and proportions. Be honest and specific — e.g., 'curvy plus-size woman with wide hips, full bust, defined waist, rounded arms, soft belly' OR 'petite slim build, narrow shoulders, small bust, straight silhouette' OR 'athletic medium build, broad shoulders, toned arms, flat stomach'. Include: height impression (petite/average/tall), weight impression (slim/medium/full-figured/plus-size), shoulder-to-hip ratio, visible curves. This MUST be reproduced exactly — never make the model slimmer or curvier than shown.]",
    "hair": "[FROM MODEL PHOTOS (face/body) ONLY — IGNORE reference image hair: color with undertones, texture, length, style. e.g., 'Extra long sleek straight dark chocolate brown hair (deep chestnut, warm tones) with precise middle part']",
    "face_accessories": "[FROM FACE PHOTO: face mask/surgical mask/bandana/glasses/sunglasses/eye patch or 'none'. CRITICAL: If model wears a mask, describe it exactly: color, type, coverage]",
    "clothing": "[FROM REFERENCE: detailed clothing description including fabric type, fit, color, condition]",
    "pose_and_expression": "[FROM REFERENCE: exact body pose AND facial expression combined]",
    "body_accessories": "[FROM REFERENCE: jewelry, watches, bags, hats (non-face), or 'none']",
    "skin_notes": "[FROM MODEL PHOTOS ONLY: note if skin is clean/clear, any visible tattoos on the MODEL, birthmarks. NEVER include tattoos or marks from the REFERENCE image]",
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
  "technical_quality": "[MUST describe the EXACT photographic rendering style of the REFERENCE image. Example: 'iPhone 15 Pro photograph quality — natural digital sensor noise, vivid saturated colors, auto-HDR tone mapping, slightly warm rendering, tack-sharp subject with gentle background bokeh, realistic skin pores and texture, zero CGI or artificial smoothing, authentic spontaneous moment feel'. Be camera-specific: if it looks like an iPhone shot, say iPhone. If DSLR, say DSLR. Capture grain level, sharpness, and color rendering precisely.']"
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
    // Build image parts in the EXACT order described in the prompt:
    // [FACE] → [BODY?] → [EXTRA ANGLES...] → [REFERENCE]
    const imageParts: any[] = [
      { inlineData: { mimeType: cleanFace.mimeType, data: cleanFace.data } },
    ];
    if (cleanBody) {
      imageParts.push({ inlineData: { mimeType: cleanBody.mimeType, data: cleanBody.data } });
    }
    for (const extra of extraImages) {
      imageParts.push({ inlineData: { mimeType: extra.mimeType, data: extra.data } });
    }
    imageParts.push({ inlineData: { mimeType: cleanRef.mimeType, data: cleanRef.data } });

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
  baseModelFaceImageSource: string, // Face close-up — primary identity reference
  imageSize?: string, // '1K', '2K', '4K' or undefined for AUTO
  aspectRatio?: string, // '1:1', '4:3', '16:9', etc.
  userPlan?: string, // 'free', 'starter', 'creator', 'pro', 'studio'
  additionalModelImages?: string[], // Legacy extra angles
  customInstructions?: string, // Optional user instructions to refine the output
  refImageSource?: string, // Scene reference — used to match photographic quality
  bodyImageSource?: string // Full-body photo — body type/proportions reference
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

  // Defensive alias — Gemini occasionally omits the subject object entirely
  const subj = payload?.subject ?? {} as any;
  const env  = payload?.environment ?? {} as any;

  // Build enhanced sections from v2 fields (with fallback to v1)
  const hairSection = subj.hair_detailed
    ? `HAIR (DETAILED):
  - Length & Cut: ${subj.hair_detailed.length ?? ''}, ${subj.hair_detailed.cut ?? ''}
  - Texture: ${subj.hair_detailed.texture ?? ''} (${subj.hair_detailed.texture_quality ?? ''})
  - Natural Imperfections: ${subj.hair_detailed.natural_imperfections ?? ''}
  - Styling: ${subj.hair_detailed.styling ?? ''}
  - Part: ${subj.hair_detailed.part ?? ''} | Volume: ${subj.hair_detailed.volume ?? ''}
  - Details: ${subj.hair_detailed.details ?? ''}`
    : `HAIR: ${subj.hair ?? ''}`;

  const expressionSection = subj.facial_expression
    ? `FACIAL EXPRESSION:
  - Mouth: ${subj.facial_expression.mouth ?? ''} (smile intensity: ${subj.facial_expression.smile_intensity ?? ''})
  - Eyes: ${subj.facial_expression.eyes ?? ''}
  - Eyebrows: ${subj.facial_expression.eyebrows ?? ''}
  - Emotion: ${subj.facial_expression.overall_emotion ?? ''} (${subj.facial_expression.authenticity ?? ''})`
    : '';

  const handsSection = subj.hands_and_gestures
    ? `HANDS & GESTURES:
  - Left hand: ${subj.hands_and_gestures.left_hand ?? ''}
  - Right hand: ${subj.hands_and_gestures.right_hand ?? ''}
  - Fingers: ${subj.hands_and_gestures.finger_positions ?? ''}
  - Tension: ${subj.hands_and_gestures.hand_tension ?? ''}
  - Interaction: ${subj.hands_and_gestures.interaction ?? ''}
  - Naturalness: ${subj.hands_and_gestures.naturalness ?? ''}`
    : '';

  const bodySection = subj.body_positioning
    ? `BODY POSITION:
  - Posture: ${subj.body_positioning.posture ?? ''}
  - Angle: ${subj.body_positioning.angle ?? ''}
  - Weight: ${subj.body_positioning.weight_distribution ?? ''}
  - Shoulders: ${subj.body_positioning.shoulders ?? ''}`
    : '';

  const lightingSection = payload.lighting_detailed
    ? `LIGHTING (DETAILED):
  - Type: ${payload.lighting_detailed.type ?? ''} | Direction: ${payload.lighting_detailed.direction ?? ''}
  - Directionality: ${payload.lighting_detailed.directionality ?? ''}
  - Quality: ${payload.lighting_detailed.quality ?? ''} | Intensity: ${payload.lighting_detailed.intensity ?? ''}
  - Contrast Ratio: ${payload.lighting_detailed.contrast_ratio ?? ''}
  - Shadows: ${payload.lighting_detailed.shadows?.type ?? ''}, density: ${payload.lighting_detailed.shadows?.density ?? ''}, placement: ${payload.lighting_detailed.shadows?.placement ?? ''}
  - Highlights: ${payload.lighting_detailed.highlights?.treatment ?? ''}, on: ${payload.lighting_detailed.highlights?.placement ?? ''}
  - Ambient Fill: ${payload.lighting_detailed.ambient_fill ?? ''}
  - Light Temperature: ${payload.lighting_detailed.light_temperature ?? ''}`
    : `LIGHTING: ${payload.lighting_and_atmosphere ?? ''}`;

  const colorSection = payload.color_profile
    ? `COLOR PROFILE:
  - Dominant Colors: ${(payload.color_profile.dominant_colors ?? []).map(c => `${c.color} (${c.hex}, ${c.role})`).join(', ')}
  - Temperature: ${payload.color_profile.temperature ?? ''}
  - Saturation: ${payload.color_profile.saturation ?? ''}
  - Contrast: ${payload.color_profile.contrast ?? ''}`
    : '';

  const backgroundSection = env.wall_surface
    ? `BACKGROUND: ${env.background ?? ''}
ENVIRONMENT DETAILS:
  - Setting: ${env.setting_type || 'unspecified'}
  - Spatial Depth: ${env.spatial_depth || 'unspecified'}
  - Wall: ${env.wall_surface.material ?? ''}, ${env.wall_surface.texture ?? ''}, ${env.wall_surface.finish ?? ''} finish, color: ${env.wall_surface.color ?? ''}, condition: ${env.wall_surface.condition ?? ''}${env.wall_surface.features && env.wall_surface.features !== 'clean' ? `, features: ${env.wall_surface.features}` : ''}
  ${env.floor_surface ? `- Floor: ${env.floor_surface.material ?? ''}, ${env.floor_surface.color ?? ''}${env.floor_surface.pattern ? `, ${env.floor_surface.pattern}` : ''}` : ''}
  ${env.objects_catalog ? `- Objects: ${env.objects_catalog}` : ''}`
    : `BACKGROUND: ${env.background ?? ''}`;

  const techSpecsSection = payload.technical_specs
    ? `TECHNICAL SPECS:
  - Style: ${payload.technical_specs.style ?? ''}
  - Texture: ${payload.technical_specs.texture ?? ''} | Sharpness: ${payload.technical_specs.sharpness ?? ''}
  - Grain: ${payload.technical_specs.grain ?? ''}
  - Depth of Field: ${payload.technical_specs.depth_of_field ?? ''}
  - Perspective: ${payload.technical_specs.perspective ?? ''}`
    : '';

  // Build face accessories section (masks, glasses from MODEL)
  const faceAccessoriesSection = subj.face_accessories && subj.face_accessories !== 'none'
    ? `FACE ACCESSORIES (MUST INCLUDE): ${subj.face_accessories}`
    : '';

  // Build body accessories section (jewelry, watches from REFERENCE)
  const bodyAccessoriesSection = subj.body_accessories && subj.body_accessories !== 'none'
    ? `BODY ACCESSORIES: ${subj.body_accessories}`
    : '';

  // Build skin notes section (clean skin, no reference tattoos)
  const skinNotesSection = subj.skin_notes
    ? `SKIN: ${subj.skin_notes}`
    : 'SKIN: Clean, clear skin without tattoos (unless specifically noted above)';

  // Add a section describing how to use each image type
  const refImageInstruction = `
IMAGE ROLES (follow strictly):
- FIRST IMAGE: Face close-up — use ONLY for facial identity (eyes, skin, features, face accessories).${bodyImageSource ? '\n- SECOND IMAGE: Full-body photo — use ONLY for body type, proportions, and curves. NEVER copy clothing from it.' : ''}${refImageSource ? '\n- LAST IMAGE: Scene reference photo — use for pose, clothing, background, lighting, and photographic quality. Match its exact camera feel (iPhone realism, grain, bokeh, color rendering).' : ''}
`;

  const bodyTypeSection = subj.body_type
    ? `BODY TYPE (MUST REPRODUCE EXACTLY): ${subj.body_type}`
    : '';

  const imagePrompt = `
Generate a photorealistic image with these EXACT specifications. This must look like a real photograph taken with an iPhone or high-end camera.
${refImageInstruction}
FACE & IDENTITY: ${subj.description ?? ''}
${bodyTypeSection ? `${bodyTypeSection}` : ''}
${hairSection}
${faceAccessoriesSection ? `${faceAccessoriesSection}` : ''}
${skinNotesSection}
CLOTHING: ${subj.clothing ?? ''}
POSE & EXPRESSION: ${subj.pose_and_expression ?? ''}
${expressionSection ? `${expressionSection}` : ''}
${bodyAccessoriesSection ? `${bodyAccessoriesSection}` : ''}
${subj.accessories ? `ACCESSORIES: ${subj.accessories}` : ''}
${handsSection ? `${handsSection}` : ''}
${bodySection ? `${bodySection}` : ''}

SCENE: ${payload.main_composition ?? ''}
${backgroundSection}
${lightingSection}
${colorSection ? `${colorSection}` : ''}
${techSpecsSection ? `${techSpecsSection}` : ''}

QUALITY: ${payload.technical_quality ?? ''}${customSection}

CRITICAL REQUIREMENTS:
1. This must look like a REAL photograph, NOT CGI. Realistic skin with visible pores, natural imperfections, authentic lighting.
2. The person's FACE AND IDENTITY must exactly match the face reference image provided.
3. The person's BODY TYPE AND PROPORTIONS must exactly match the body reference image — reproduce curves, weight, and build faithfully. NEVER slim down or alter the body.
4. The PHOTOGRAPHIC QUALITY (sharpness, grain, color rendering, bokeh, dynamic range) must match the last reference image provided — replicate how a real iPhone captures light, texture, and depth.
5. Maintain the exact color temperature, saturation, and contrast described above.
6. Reproduce the lighting direction, shadow quality, and highlight placement precisely.
7. Hair must show natural variation - flyaways, texture inconsistencies, not "AI perfect" smoothness.
8. Hands must look natural with correct finger anatomy and relaxed positioning.

IDENTITY PRESERVATION (CRITICAL):
9. FACE ACCESSORIES: If the model wears a face mask, glasses, or any face covering, it MUST appear in the output exactly as described above.
10. NO TATTOOS: The output person must NOT have any tattoos unless the BASE MODEL specifically has tattoos. Do NOT copy tattoos from reference poses.
11. CLEAN SKIN: The model's skin should match their reference photos - typically clean and clear without tattoos or body modifications from the pose reference.
  `.trim();

  // Fetch all images in parallel — face, extras, body, and scene reference all at once
  const [baseModelImg, bodyImg, refImg, ...extraImages] = await Promise.all([
    ensureBase64(baseModelFaceImageSource),
    bodyImageSource ? ensureBase64(bodyImageSource) : Promise.resolve(null),
    refImageSource ? ensureBase64(refImageSource) : Promise.resolve(null),
    ...(additionalModelImages ?? []).map(img => ensureBase64(img)),
  ]);

  try {
    // Build image config for resolution and aspect ratio
    const imageConfig: any = {};
    if (imageSize && imageSize !== 'AUTO') {
      imageConfig.imageSize = imageSize; // '1K', '2K', '4K'
    }
    if (aspectRatio && aspectRatio !== 'AUTO') {
      imageConfig.aspectRatio = aspectRatio; // '1:1', '4:3', '16:9', etc.
    }

    // Build image parts in order matching the prompt instructions:
    // [FACE] → [BODY?] → [EXTRA ANGLES...] → [SCENE REFERENCE]
    const modelImageParts: any[] = [
      { inlineData: { mimeType: baseModelImg.mimeType, data: baseModelImg.data } }, // face
    ];
    // Body photo right after face so model clearly associates it with same person
    if (bodyImg) {
      modelImageParts.push({ inlineData: { mimeType: bodyImg.mimeType, data: bodyImg.data } });
    }
    for (const extra of extraImages) {
      modelImageParts.push({ inlineData: { mimeType: extra.mimeType, data: extra.data } });
    }
    // Scene reference photo last — for photographic quality matching
    if (refImg) {
      modelImageParts.push({ inlineData: { mimeType: refImg.mimeType, data: refImg.data } });
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
  baseModelFaceImageSource: string,
  imageSize?: string,
  aspectRatio?: string,
  additionalModelImages?: string[],
  bodyImageSource?: string // Full-body photo — body type reference
): Promise<string> => {

  if (!apiKey) throw new Error("FALTA_CLAVE_API");

  const ai = new GoogleGenAI({ apiKey });
  const modelId = 'gemini-3-pro-image-preview';

  // Fetch all images in parallel
  const [baseModelImg, generatedImg, bodyImg, ...extraModelImages] = await Promise.all([
    ensureBase64(baseModelFaceImageSource),
    ensureBase64(previouslyGeneratedImage),
    bodyImageSource ? ensureBase64(bodyImageSource) : Promise.resolve(null),
    ...(additionalModelImages ?? []).map(img => ensureBase64(img)),
  ]);

  // Determine the new pose
  const isAutoPose = newPoseDescription === 'auto' || !newPoseDescription;
  const poseInstruction = isAutoPose
    ? "a natural, slightly different pose and expression (as if taken moments later in the same photoshoot)"
    : newPoseDescription;

  // Defensive aliases for pose variation
  const pvSubj = originalPayload?.subject ?? {} as any;
  const pvEnv  = originalPayload?.environment ?? {} as any;

  // Build enhanced sections for pose variation (re-inject all quality-critical details)
  const pv_hairSection = pvSubj.hair_detailed
    ? `  - Hair Length & Cut: ${pvSubj.hair_detailed.length ?? ''}, ${pvSubj.hair_detailed.cut ?? ''}
  - Hair Texture: ${pvSubj.hair_detailed.texture ?? ''} (${pvSubj.hair_detailed.texture_quality ?? ''})
  - Hair Imperfections: ${pvSubj.hair_detailed.natural_imperfections ?? ''}
  - Hair Styling: ${pvSubj.hair_detailed.styling ?? ''}
  - Hair Part: ${pvSubj.hair_detailed.part ?? ''} | Volume: ${pvSubj.hair_detailed.volume ?? ''}`
    : `  - Hair: ${pvSubj.hair ?? ''}`;

  const pv_lightingSection = originalPayload.lighting_detailed
    ? `LIGHTING (MUST REPLICATE EXACTLY):
  - Type: ${originalPayload.lighting_detailed.type ?? ''}
  - Direction: ${originalPayload.lighting_detailed.direction ?? ''}
  - Directionality: ${originalPayload.lighting_detailed.directionality ?? ''}
  - Quality: ${originalPayload.lighting_detailed.quality ?? ''} | Intensity: ${originalPayload.lighting_detailed.intensity ?? ''}
  - Contrast Ratio: ${originalPayload.lighting_detailed.contrast_ratio ?? ''}
  - Shadows: ${originalPayload.lighting_detailed.shadows?.type ?? ''}, density: ${originalPayload.lighting_detailed.shadows?.density ?? ''}, placement: ${originalPayload.lighting_detailed.shadows?.placement ?? ''}
  - Highlights: ${originalPayload.lighting_detailed.highlights?.treatment ?? ''} on ${originalPayload.lighting_detailed.highlights?.placement ?? ''}
  - Ambient Fill: ${originalPayload.lighting_detailed.ambient_fill ?? ''}
  - Light Temperature: ${originalPayload.lighting_detailed.light_temperature ?? ''}
  NOTE: Shadows will naturally shift with the new pose, but maintain the SAME light source position, quality, temperature, and contrast ratio.`
    : `LIGHTING: ${originalPayload.lighting_and_atmosphere ?? ''}`;

  const pv_colorSection = originalPayload.color_profile
    ? `COLOR PROFILE (MUST MATCH EXACTLY):
  - Dominant Colors: ${(originalPayload.color_profile.dominant_colors ?? []).map(c => `${c.color} (${c.hex}, ${c.role})`).join(', ')}
  - Temperature: ${originalPayload.color_profile.temperature ?? ''}
  - Saturation: ${originalPayload.color_profile.saturation ?? ''}
  - Contrast: ${originalPayload.color_profile.contrast ?? ''}
  NOTE: The color grading, temperature, and saturation MUST be identical to the original.`
    : '';

  const pv_backgroundSection = pvEnv.wall_surface
    ? `BACKGROUND (MUST BE IDENTICAL):
  - Setting: ${pvEnv.setting_type || pvEnv.background || ''}
  - Spatial Depth: ${pvEnv.spatial_depth || 'as in reference'}
  - Wall: ${pvEnv.wall_surface.material ?? ''}, ${pvEnv.wall_surface.texture ?? ''}, ${pvEnv.wall_surface.finish ?? ''} finish, color: ${pvEnv.wall_surface.color ?? ''}${pvEnv.wall_surface.features && pvEnv.wall_surface.features !== 'clean' ? `, features: ${pvEnv.wall_surface.features}` : ''}
  ${pvEnv.floor_surface ? `- Floor: ${pvEnv.floor_surface.material ?? ''}, ${pvEnv.floor_surface.color ?? ''}` : ''}
  ${pvEnv.objects_catalog ? `- Objects: ${pvEnv.objects_catalog}` : ''}
  - Full description: ${pvEnv.background ?? ''}`
    : `BACKGROUND (MUST BE IDENTICAL): ${pvEnv.background ?? ''}`;

  const pv_techSpecs = originalPayload.technical_specs
    ? `TECHNICAL SPECS (MUST MATCH):
  - Style: ${originalPayload.technical_specs.style ?? ''}
  - Texture: ${originalPayload.technical_specs.texture ?? ''} | Sharpness: ${originalPayload.technical_specs.sharpness ?? ''}
  - Grain: ${originalPayload.technical_specs.grain ?? ''}
  - Depth of Field: ${originalPayload.technical_specs.depth_of_field ?? ''}
  - Perspective: ${originalPayload.technical_specs.perspective ?? ''}`
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
  - Face: ${pvSubj.description ?? ''}
  ${pvSubj.body_type ? `- BODY TYPE (MUST REPRODUCE EXACTLY): ${pvSubj.body_type}` : ''}
${pv_hairSection}
  ${pvSubj.face_accessories && pvSubj.face_accessories !== 'none' ? `- FACE ACCESSORIES (MUST INCLUDE): ${pvSubj.face_accessories}` : ''}
  - Skin: ${pvSubj.skin_notes || 'Clean, clear skin without tattoos'}
  - Clothing: ${pvSubj.clothing ?? ''}
  ${pvSubj.body_accessories && pvSubj.body_accessories !== 'none' ? `- Body Accessories: ${pvSubj.body_accessories}` : ''}
  ${pvSubj.accessories ? `- Accessories: ${pvSubj.accessories}` : ''}

NEW POSE/EXPRESSION:
  - ${poseInstruction}
  ${isAutoPose ? '- Hands should be in a natural, relaxed position appropriate for the new pose' : ''}

═══════════════════════════════════════
SCENE: ${originalPayload.main_composition ?? ''}

${pv_backgroundSection}

${pv_lightingSection}

${pv_colorSection ? `${pv_colorSection}` : ''}

${pv_techSpecs ? `${pv_techSpecs}` : ''}

═══════════════════════════════════════
QUALITY REQUIREMENTS:
${originalPayload.technical_quality ?? ''}

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

    // Build image parts: [FACE] → [BODY?] → [EXTRA ANGLES...] → [GENERATED IMAGE]
    const imageParts: any[] = [
      { inlineData: { mimeType: baseModelImg.mimeType, data: baseModelImg.data } }, // face
    ];
    if (bodyImg) {
      imageParts.push({ inlineData: { mimeType: bodyImg.mimeType, data: bodyImg.data } }); // body
    }
    for (const extra of extraModelImages) {
      imageParts.push({ inlineData: { mimeType: extra.mimeType, data: extra.data } });
    }
    // Last: the generated image we want to vary (for scene/background consistency)
    imageParts.push({ inlineData: { mimeType: generatedImg.mimeType, data: generatedImg.data } });

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