export interface ModeloBase {
  id: string; // UUID in Supabase
  created_at: string;
  model_name: string;
  image_url: string;
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
    description: string;
    hair: string;
    clothing: string;
    pose_and_expression: string;
    accessories?: string; // Added based on user example
  };
  environment: {
    background: string;
  };
  lighting_and_atmosphere: string; // Added based on user example
  technical_quality: string;
  init_images?: string[];
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING', // For the fake analysis step
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}