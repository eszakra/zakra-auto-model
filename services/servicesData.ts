export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  priceValue: number;
  features: string[];
  popular: boolean;
  category: 'workflow' | 'lora' | 'package';
}

export const WORKFLOWS: ServiceItem[] = [
  {
    id: "workflow-inpainting",
    slug: "inpainting-pro",
    name: "Inpainting Pro",
    description: "SDXL inpainting workflow with intelligent masking. Edit specific areas while keeping the rest of the image consistent.",
    price: "$397",
    priceValue: 397,
    features: ["Automatic masking", "Consistent edits", "HD export", "Setup guide included"],
    popular: false,
    category: "workflow"
  },
  {
    id: "workflow-controlnet",
    slug: "controlnet-poses",
    name: "ControlNet Poses",
    description: "SDXL workflow with ControlNet for exact pose replication. Same face, same style, any pose you need.",
    price: "$697",
    priceValue: 697,
    features: ["Exact pose control", "Face consistency", "Multiple angles", "Priority support"],
    popular: true,
    category: "workflow"
  },
  {
    id: "workflow-elite",
    slug: "elite-bundle",
    name: "Elite Bundle",
    description: "Both workflows + our optimized prompt library. The complete SDXL toolkit for professional content creation.",
    price: "$997",
    priceValue: 997,
    features: ["Both workflows", "Prompt library", "Custom presets", "1:1 VIP support"],
    popular: false,
    category: "workflow"
  }
];

export const LORAS: ServiceItem[] = [
  {
    id: "lora-basic",
    slug: "basic-lora",
    name: "Basic LoRA",
    description: "SDXL LoRA trained on 40 images. Solid likeness for consistent character generation across prompts.",
    price: "$47",
    priceValue: 47,
    features: ["40 training images", "85%+ likeness", "24h delivery", "1 revision"],
    popular: false,
    category: "lora"
  },
  {
    id: "lora-advanced",
    slug: "advanced-lora",
    name: "Advanced LoRA",
    description: "SDXL LoRA trained on 150 images. Hyperrealistic detail — your character in any scene, any angle.",
    price: "$147",
    priceValue: 147,
    features: ["150 training images", "95%+ likeness", "Ultra-detailed", "3 revisions"],
    popular: false,
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
