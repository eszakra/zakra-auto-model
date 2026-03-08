export interface ModeloBase {
  id: string; // UUID in Supabase
  created_at: string;
  model_name: string;
  image_url: string; // Close-up face photo (primary identity)
  body_image?: string; // Full-body photo (body type, curves, proportions)
  reference_images?: string[]; // Legacy extra angles (kept for backward compat)
  face_description?: string; // Optional/Ignored in new flow
  hair_description?: string; // Optional/Ignored in new flow
}

// Add global window definition for AI Studio extension
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface ZakraPayload {
  prompt_type: string;
  main_composition: string;
  subject: {
    description: string;        // Facial identity from face photo
    body_type?: string;         // Body type and proportions from body photo
    hair: string;
    face_accessories?: string;  // Face mask, glasses, sunglasses FROM MODEL
    clothing: string;
    pose_and_expression: string;
    accessories?: string;       // Legacy field for backwards compatibility
    body_accessories?: string;  // Jewelry, watches, bags FROM REFERENCE
    skin_notes?: string;        // Clean skin, tattoos only from MODEL (not reference)
    // --- Enhanced fields (v2) ---
    hair_detailed?: {
      length: string;        // "pixie/short/chin-length/shoulder-length/mid-back/long"
      cut: string;           // "blunt/layered/shaggy/undercut/fade/tapered"
      texture: string;       // "straight/wavy/curly/coily" with wave type
      texture_quality: string; // "smooth/coarse/fine/thick/thin"
      natural_imperfections: string; // "flyaways/frizz/uneven sections/growth patterns"
      styling: string;       // "sleek/tousled/wet look/blow-dried/natural/messy"
      part: string;          // "center/side/deep side/no part"
      volume: string;        // "flat/moderate volume/voluminous"
      details: string;       // bangs type, face-framing layers, etc.
    };
    facial_expression?: {
      mouth: string;         // "closed smile/open smile/slight smile/neutral/serious"
      smile_intensity: string; // "no smile/subtle/moderate/broad/wide"
      eyes: string;          // "direct gaze/looking away/squinting/wide/relaxed"
      eyebrows: string;      // "raised/neutral/furrowed/relaxed"
      overall_emotion: string; // "happy/content/serious/playful/confident/warm"
      authenticity: string;  // "genuine/posed/candid/formal/natural"
    };
    hands_and_gestures?: {
      left_hand: string;     // exact position and gesture
      right_hand: string;    // exact position and gesture
      finger_positions: string;
      hand_tension: string;  // "relaxed/tense/natural/posed"
      interaction: string;   // what hands are doing
      naturalness: string;   // "organic casual/deliberately posed/caught mid-motion"
    };
    body_positioning?: {
      posture: string;       // "standing/sitting/leaning/lying"
      angle: string;         // "facing camera/45 degree turn/profile"
      weight_distribution: string;
      shoulders: string;     // "level/tilted/rotated/hunched/back"
    };
  };
  environment: {
    background: string;
    // --- Enhanced fields (v2) ---
    setting_type?: string;   // "indoor/outdoor/studio/natural environment"
    spatial_depth?: string;  // "shallow/medium/deep" with layers description
    wall_surface?: {
      material: string;      // "painted drywall/concrete/brick/wood paneling"
      texture: string;       // "smooth/slightly textured/rough/patterned"
      finish: string;        // "matte/satin/glossy/flat"
      color: string;         // specific color with undertones
      features: string;      // "clean/water stains/cracks/fixtures"
      condition: string;     // "pristine/aged/weathered/industrial"
    };
    floor_surface?: {
      material: string;
      color: string;
      pattern?: string;
    };
    objects_catalog?: string; // list of every visible object with position
  };
  lighting_and_atmosphere: string;
  // --- Enhanced lighting (v2) ---
  lighting_detailed?: {
    type: string;            // "natural window/artificial/mixed/studio"
    direction: string;       // "front/45-degree side/90-degree side/back/top/diffused"
    directionality: string;  // "highly directional/moderately directional/diffused"
    quality: string;         // "hard light/soft light/dramatic/even/sculpted"
    intensity: string;       // "bright/moderate/low/moody/high-key/low-key"
    contrast_ratio: string;  // "high contrast/medium contrast/low contrast"
    shadows: {
      type: string;          // "harsh defined edges/soft gradual edges/minimal"
      density: string;       // "deep black/gray/transparent/faint"
      placement: string;     // "under subject/on wall/from objects"
    };
    highlights: {
      treatment: string;     // "blown out/preserved/subtle/dramatic/specular"
      placement: string;     // "on face/hair/clothing/background"
    };
    ambient_fill: string;    // "present/absent"
    light_temperature: string; // "warm golden/neutral/cool blue"
  };
  // --- Color profile (v2) ---
  color_profile?: {
    dominant_colors: Array<{
      color: string;
      hex: string;
      role: string;          // "background/accent/primary subject"
    }>;
    temperature: string;     // "warm/cool/neutral"
    saturation: string;      // "highly saturated/moderate/desaturated"
    contrast: string;        // "high contrast/medium contrast/low contrast/soft"
  };
  // --- Technical specs (v2) ---
  technical_specs?: {
    style: string;           // "realistic/hyperrealistic/stylized"
    texture: string;         // "smooth/grainy/sharp/soft"
    sharpness: string;       // "tack sharp/slightly soft/deliberately soft"
    grain: string;           // "none/film grain/digital noise"
    depth_of_field: string;  // "shallow/medium/deep" with subject isolation
    perspective: string;     // "straight on/low angle/high angle/dutch angle"
  };
  technical_quality: string;
  init_images?: string[];
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING', // For the fake analysis step
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
  BATCH_COMPLETE = 'BATCH_COMPLETE'
}

export interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'PENDING' | 'ANALYZING' | 'ANALYZED' | 'GENERATING' | 'COMPLETED' | 'ERROR';
  payload?: any;
  resultImage?: string;
  resultUrl?: string; // Public Supabase URL (used for ZIP download instead of base64)
  error?: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}