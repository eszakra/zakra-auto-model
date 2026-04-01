export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  priceValue: number;
  originalPrice?: string;
  originalPriceValue?: number;
  discountPercent?: string;
  features: string[];
  popular: boolean;
  category: 'workflow' | 'lora' | 'package';
}

export const WORKFLOWS: ServiceItem[] = [
  {
    id: "workflow-inpainting",
    slug: "inpainting-pro",
    name: "Inpainting Pro",
    description: "SDXL Inpainting workflow built for NSFW content creation. Manually developed, exclusive for ComfyUI, and completely ready to use. Also works perfectly for SFW — same quality, same results.",
    price: "$197",
    priceValue: 197,
    originalPrice: "$397",
    originalPriceValue: 397,
    discountPercent: "50% OFF",
    features: ["NSFW & SFW ready", "Zero knowledge required", "Ready to use (Plug & Play)", "Basic setup guide"],
    popular: false,
    category: "workflow"
  },
  {
    id: "workflow-controlnet",
    slug: "controlnet-poses",
    name: "ControlNet Poses",
    description: "Exact pose replication workflow designed for NSFW creators. Control every position, angle, and scene with precision. Fully uncensored — also produces stunning SFW content.",
    price: "$297",
    priceValue: 297,
    originalPrice: "$697",
    originalPriceValue: 697,
    discountPercent: "57% OFF",
    features: ["Full NSFW support", "Exact pose control", "Ready to use instantly", "Zero node experience needed"],
    popular: true,
    category: "workflow"
  },
  {
    id: "workflow-elite",
    slug: "elite-bundle",
    name: "Elite Bundle",
    description: "Both NSFW workflows + our prompt library. The complete uncensored toolkit — produce any content type from explicit to editorial, all plug & play.",
    price: "$497",
    priceValue: 497,
    originalPrice: "$997",
    originalPriceValue: 997,
    discountPercent: "50% OFF",
    features: ["Both workflows included", "NSFW prompt library", "Ready to use (Plug & Play)", "1-on-1 VIP support"],
    popular: false,
    category: "workflow"
  }
];

export const LORAS: ServiceItem[] = [
  {
    id: "lora-basic",
    slug: "basic-lora",
    name: "Basic LoRA",
    description: "100% manual creation by our team (no auto-generated software). You choose the base model for your character: SDXL, Flux, or Z Image Turbo. Delivery in 1 to 5 days maximum.",
    price: "$19",
    priceValue: 19,
    originalPrice: "$47",
    originalPriceValue: 47,
    discountPercent: "60% OFF",
    features: ["Manual expert creation", "You choose: SDXL, Flux, etc", "1 to 5 days delivery", "1 revision included"],
    popular: false,
    category: "lora"
  },
  {
    id: "lora-advanced",
    slug: "advanced-lora",
    name: "Advanced LoRA",
    description: "Advanced ultra-realistic manual training with 150 images. We do the meticulous work in SDXL, Flux, or the model you prefer. Delivery in 1 to 5 days maximum.",
    price: "$67",
    priceValue: 67,
    originalPrice: "$147",
    originalPriceValue: 147,
    discountPercent: "54% OFF",
    features: ["Ultra-realistic (150 photos)", "Professional manual creation", "1 to 5 days delivery", "3 revisions included"],
    popular: true,
    category: "lora"
  }
];

export const PACKAGES: ServiceItem[] = [
  {
    id: "package-starter",
    slug: "starter-package",
    name: "Starter",
    description: "Your LoRA + ready-to-use images. Start posting consistent content immediately.",
    price: "$297",
    priceValue: 297,
    features: ["Basic SDXL LoRA", "20 generated images", "Starter prompt pack"],
    popular: false,
    category: "package"
  },
  {
    id: "package-pro",
    slug: "pro-package",
    name: "Pro",
    description: "The go-to for creators who need volume and variety without losing consistency.",
    price: "$597",
    priceValue: 597,
    features: ["Advanced SDXL LoRA", "50 generated images", "Optimized prompt pack"],
    popular: true,
    category: "package"
  },
  {
    id: "package-elite",
    slug: "elite-package",
    name: "Elite",
    description: "Full production setup. Maximum output, maximum consistency, zero guesswork.",
    price: "$997",
    priceValue: 997,
    features: ["Premium SDXL LoRA", "100 generated images", "VIP prompt library"],
    popular: false,
    category: "package"
  }
];

export const ALL_SERVICES: ServiceItem[] = [...WORKFLOWS, ...LORAS, ...PACKAGES];

export function getServiceById(id: string): ServiceItem | undefined {
  return ALL_SERVICES.find(s => s.id === id);
}
