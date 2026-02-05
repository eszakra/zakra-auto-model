import React, { useState } from 'react';
import { ArrowLeft, Check, BookOpen, Settings, Lightbulb, HelpCircle, Play, Lock, ExternalLink, AlertTriangle, Info, Download, Copy, CheckCheck } from 'lucide-react';
import { getServiceById } from '../services/servicesData';

interface ServiceContentProps {
  purchaseId: string;
  serviceId: string;
  onBack: () => void;
}

interface Module {
  id: string;
  title: string;
  icon: React.ReactNode;
  lessons: { id: string; title: string; duration: string; }[];
}

// ── Helper Components ──────────────────────────────────────────────────────────

const TipBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 my-5">
    <div className="flex items-start gap-2.5">
      <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</div>
    </div>
  </div>
);

const WarningBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 my-5">
    <div className="flex items-start gap-2.5">
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</div>
    </div>
  </div>
);

const ExternalUrl: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-reed-red hover:underline inline-flex items-center gap-1 break-all">
    {children} <ExternalLink className="w-3 h-3 flex-shrink-0" />
  </a>
);

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4 my-4 overflow-x-auto text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
    {children}
  </pre>
);

const StepItem: React.FC<{ number: number; children: React.ReactNode }> = ({ number, children }) => (
  <div className="flex items-start gap-3 mb-4">
    <span className="flex-shrink-0 w-7 h-7 bg-reed-red/10 text-reed-red rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
      {number}
    </span>
    <div className="text-sm text-[var(--text-secondary)] leading-relaxed pt-1">{children}</div>
  </div>
);

// ── Generic Modules (fallback for other services) ─────────────────────────────

const GENERIC_MODULES: Module[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Play className="w-4 h-4" />,
    lessons: [
      { id: '1-1', title: 'Welcome & Overview', duration: '3 min' },
      { id: '1-2', title: 'What You\'ll Need', duration: '5 min' },
      { id: '1-3', title: 'Quick Start Guide', duration: '8 min' },
    ]
  },
  {
    id: 'setup',
    title: 'Setup Guide',
    icon: <Settings className="w-4 h-4" />,
    lessons: [
      { id: '2-1', title: 'Installing ComfyUI', duration: '10 min' },
      { id: '2-2', title: 'Loading Your Files', duration: '7 min' },
      { id: '2-3', title: 'First Test Run', duration: '5 min' },
    ]
  },
  {
    id: 'how-to-use',
    title: 'How to Use',
    icon: <BookOpen className="w-4 h-4" />,
    lessons: [
      { id: '3-1', title: 'Basic Workflow Walkthrough', duration: '12 min' },
      { id: '3-2', title: 'Customizing Prompts', duration: '8 min' },
      { id: '3-3', title: 'Resolution & Quality Settings', duration: '6 min' },
      { id: '3-4', title: 'Batch Processing', duration: '10 min' },
    ]
  },
  {
    id: 'tips',
    title: 'Tips & Tricks',
    icon: <Lightbulb className="w-4 h-4" />,
    lessons: [
      { id: '4-1', title: 'Getting Better Results', duration: '7 min' },
      { id: '4-2', title: 'Common Mistakes to Avoid', duration: '5 min' },
      { id: '4-3', title: 'Advanced Techniques', duration: '15 min' },
    ]
  },
  {
    id: 'support',
    title: 'Support',
    icon: <HelpCircle className="w-4 h-4" />,
    lessons: [
      { id: '5-1', title: 'FAQ', duration: '5 min' },
      { id: '5-2', title: 'Troubleshooting', duration: '8 min' },
      { id: '5-3', title: 'Contact Support', duration: '2 min' },
    ]
  }
];

// ── ControlNet Workflow Modules ───────────────────────────────────────────────

const CONTROLNET_MODULES: Module[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Play className="w-4 h-4" />,
    lessons: [
      { id: 'cn-1-1', title: 'Welcome & Overview', duration: '2 min' },
      { id: 'cn-1-2', title: 'Requirements', duration: '3 min' },
      { id: 'cn-1-3', title: 'Deploying on RunPod', duration: '5 min' },
    ]
  },
  {
    id: 'environment-setup',
    title: 'Environment Setup',
    icon: <Settings className="w-4 h-4" />,
    lessons: [
      { id: 'cn-2-1', title: 'Activating Your Pod', duration: '3 min' },
      { id: 'cn-2-2', title: 'CivitComfy API Configuration', duration: '5 min' },
      { id: 'cn-2-3', title: 'Downloading Required Models', duration: '5 min' },
    ]
  },
  {
    id: 'workflow-config',
    title: 'Workflow Configuration',
    icon: <BookOpen className="w-4 h-4" />,
    lessons: [
      { id: 'cn-3-1', title: 'Loading the Workflow File', duration: '2 min' },
      { id: 'cn-3-2', title: 'Assigning Checkpoints & LoRA', duration: '4 min' },
      { id: 'cn-3-3', title: 'Setting Up Your Model LoRA', duration: '3 min' },
    ]
  },
  {
    id: 'controlnet-modes',
    title: 'Using ControlNet',
    icon: <Lightbulb className="w-4 h-4" />,
    lessons: [
      { id: 'cn-4-1', title: 'ControlNet Overview', duration: '3 min' },
      { id: 'cn-4-2', title: 'Canny Mode', duration: '3 min' },
      { id: 'cn-4-3', title: 'Pose Mode', duration: '3 min' },
      { id: 'cn-4-4', title: 'Enabling & Disabling ControlNet', duration: '2 min' },
    ]
  },
  {
    id: 'prompting',
    title: 'Prompts & Generation',
    icon: <HelpCircle className="w-4 h-4" />,
    lessons: [
      { id: 'cn-5-1', title: 'SDXL Prompt Structure', duration: '6 min' },
      { id: 'cn-5-2', title: 'AI-Assisted Prompt Creation', duration: '4 min' },
      { id: 'cn-5-3', title: 'LoRA Tags & Trigger Words', duration: '4 min' },
      { id: 'cn-5-4', title: 'Tips & Troubleshooting', duration: '3 min' },
    ]
  }
];

// ── LoRA Service Modules ─────────────────────────────────────────────────────

const LORA_MODULES: Module[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Play className="w-4 h-4" />,
    lessons: [
      { id: 'lr-1-1', title: 'Welcome to Your Custom LoRA', duration: '3 min' },
      { id: 'lr-1-2', title: 'Basic vs Advanced LoRA', duration: '3 min' },
      { id: 'lr-1-3', title: 'Photo Guidelines', duration: '4 min' },
    ]
  },
  {
    id: 'your-order',
    title: 'Your LoRA Order',
    icon: <BookOpen className="w-4 h-4" />,
    lessons: [
      { id: 'lr-2-1', title: 'The Process', duration: '3 min' },
      { id: 'lr-2-2', title: 'Order Status & Timeline', duration: '2 min' },
      { id: 'lr-2-3', title: 'Download & Install', duration: '4 min' },
    ]
  },
  {
    id: 'tips',
    title: 'Tips & Best Practices',
    icon: <Lightbulb className="w-4 h-4" />,
    lessons: [
      { id: 'lr-3-1', title: 'Using Your LoRA', duration: '5 min' },
      { id: 'lr-3-2', title: 'Getting Better Results', duration: '5 min' },
    ]
  }
];

// ── Inpainting Workflow Modules ──────────────────────────────────────────────

const INPAINTING_MODULES: Module[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Play className="w-4 h-4" />,
    lessons: [
      { id: 'ip-1-1', title: 'Welcome & Overview', duration: '2 min' },
      { id: 'ip-1-2', title: 'Requirements', duration: '3 min' },
      { id: 'ip-1-3', title: 'Deploying on RunPod', duration: '5 min' },
    ]
  },
  {
    id: 'environment-setup',
    title: 'Environment Setup',
    icon: <Settings className="w-4 h-4" />,
    lessons: [
      { id: 'ip-2-1', title: 'Activating Your Pod', duration: '3 min' },
      { id: 'ip-2-2', title: 'CivitComfy API Configuration', duration: '5 min' },
      { id: 'ip-2-3', title: 'Downloading Required Models', duration: '5 min' },
    ]
  },
  {
    id: 'workflow-config',
    title: 'Workflow Configuration',
    icon: <BookOpen className="w-4 h-4" />,
    lessons: [
      { id: 'ip-3-1', title: 'Loading the Workflow File', duration: '2 min' },
      { id: 'ip-3-2', title: 'Assigning Checkpoints & LoRA', duration: '4 min' },
      { id: 'ip-3-3', title: 'Setting Up Your Model LoRA', duration: '3 min' },
    ]
  },
  {
    id: 'inpainting',
    title: 'Using Inpainting',
    icon: <Lightbulb className="w-4 h-4" />,
    lessons: [
      { id: 'ip-4-1', title: 'How Inpainting Works', duration: '3 min' },
      { id: 'ip-4-2', title: 'Uploading & Creating Masks', duration: '5 min' },
      { id: 'ip-4-3', title: 'Writing Inpainting Prompts', duration: '4 min' },
      { id: 'ip-4-4', title: 'Tips & Troubleshooting', duration: '3 min' },
    ]
  }
];

// ── Elite Bundle Modules ────────────────────────────────────────────────────

const ELITE_MODULES: Module[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Play className="w-4 h-4" />,
    lessons: [
      { id: 'el-1-1', title: 'Welcome & Overview', duration: '3 min' },
      { id: 'el-1-2', title: 'Requirements', duration: '4 min' },
      { id: 'el-1-3', title: 'Deploying on RunPod', duration: '5 min' },
    ]
  },
  {
    id: 'environment-setup',
    title: 'Environment Setup',
    icon: <Settings className="w-4 h-4" />,
    lessons: [
      { id: 'el-2-1', title: 'Activating Your Pod', duration: '3 min' },
      { id: 'el-2-2', title: 'CivitComfy API Configuration', duration: '5 min' },
      { id: 'el-2-3', title: 'Downloading Required Models', duration: '5 min' },
    ]
  },
  {
    id: 'controlnet-workflow',
    title: 'ControlNet Workflow',
    icon: <BookOpen className="w-4 h-4" />,
    lessons: [
      { id: 'el-3-1', title: 'Loading the ControlNet File', duration: '2 min' },
      { id: 'el-3-2', title: 'Assigning Checkpoints & LoRA', duration: '4 min' },
      { id: 'el-3-3', title: 'Setting Up Your Model LoRA', duration: '3 min' },
      { id: 'el-3-4', title: 'ControlNet Overview', duration: '3 min' },
      { id: 'el-3-5', title: 'Canny Mode', duration: '3 min' },
      { id: 'el-3-6', title: 'Pose Mode', duration: '3 min' },
      { id: 'el-3-7', title: 'Enabling & Disabling ControlNet', duration: '2 min' },
    ]
  },
  {
    id: 'inpainting-workflow',
    title: 'Inpainting Workflow',
    icon: <Lightbulb className="w-4 h-4" />,
    lessons: [
      { id: 'el-4-1', title: 'Loading the Inpainting File', duration: '2 min' },
      { id: 'el-4-2', title: 'How Inpainting Works', duration: '3 min' },
      { id: 'el-4-3', title: 'Uploading & Creating Masks', duration: '5 min' },
      { id: 'el-4-4', title: 'Writing Inpainting Prompts', duration: '4 min' },
    ]
  },
  {
    id: 'prompting',
    title: 'Prompts & Generation',
    icon: <HelpCircle className="w-4 h-4" />,
    lessons: [
      { id: 'el-5-1', title: 'SDXL Prompt Structure', duration: '6 min' },
      { id: 'el-5-2', title: 'AI-Assisted Prompt Creation', duration: '4 min' },
      { id: 'el-5-3', title: 'LoRA Tags & Trigger Words', duration: '4 min' },
      { id: 'el-5-4', title: 'Tips & Troubleshooting', duration: '3 min' },
    ]
  }
];

// ── Module selector by service ────────────────────────────────────────────────

const getModulesForService = (serviceId: string): Module[] => {
  switch (serviceId) {
    case 'workflow-controlnet': return CONTROLNET_MODULES;
    case 'workflow-inpainting': return INPAINTING_MODULES;
    case 'workflow-elite': return ELITE_MODULES;
    case 'lora-basic':
    case 'lora-advanced': return LORA_MODULES;
    default: return GENERIC_MODULES;
  }
};

// ── ControlNet Requirements (with download + password) ────────────────────────

const WORKFLOW_PASSWORD = 'REED$xK94mW2p!vL8nQ#4jR7tY5&uB3eF@6hA0dG1cZw9S2kM8';
const WORKFLOW_DOWNLOAD_URL = 'https://drive.google.com/file/d/1pABE_EH5ka9YvFW3ftXG83QmJWXpfz7n/view?usp=sharing';

const ControlNetRequirements: React.FC = () => {
  const [copied, setCopied] = React.useState(false);

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(WORKFLOW_PASSWORD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = WORKFLOW_PASSWORD;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
        Before you begin, make sure you have the following accounts and resources ready.
      </p>

      <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
        <h4 className="font-semibold text-[var(--text-primary)] mb-3">Required Accounts:</h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span><strong className="text-[var(--text-primary)]">RunPod account</strong> — This is where the workflow runs. You'll rent a cloud GPU to power ComfyUI.</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span><strong className="text-[var(--text-primary)]">CivitAI account</strong> — Needed to generate an API key for downloading the required checkpoints and LoRAs.</span>
          </li>
        </ul>
      </div>

      {/* ── Workflow File Download ── */}
      <div className="bg-gradient-to-br from-reed-red/5 to-reed-red/10 rounded-xl p-6 mb-6 border border-reed-red/20">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-5 h-5 text-reed-red" />
          <h4 className="font-semibold text-[var(--text-primary)]">Download Workflow File</h4>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Download the <strong className="text-[var(--text-primary)]">REED Cnet v1</strong> workflow file. The file is compressed in a password-protected RAR archive.
        </p>

        <a
          href={WORKFLOW_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-reed-red hover:bg-reed-red-dark text-white font-semibold rounded-lg transition-colors mb-5"
        >
          <Download className="w-4 h-4" />
          Download from Google Drive
        </a>

        <div className="mt-2">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-2">Extraction Password:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm text-reed-red font-mono select-all break-all">
              {WORKFLOW_PASSWORD}
            </code>
            <button
              onClick={copyPassword}
              className={`flex-shrink-0 p-3 rounded-lg border transition-all duration-200 ${
                copied
                  ? 'bg-green-500/10 border-green-500/30 text-green-500'
                  : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
              }`}
              title="Copy password"
            >
              {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
        <h4 className="font-semibold text-[var(--text-primary)] mb-3">Required Models (downloaded later via CivitComfy):</h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span><strong className="text-[var(--text-primary)]">Two SDXL checkpoints</strong> — BigLust and NatVis Natural Vision</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span><strong className="text-[var(--text-primary)]">DMD2 Speed LoRA</strong> — An acceleration LoRA for faster generation</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span><strong className="text-[var(--text-primary)]">Your model's LoRA</strong> — An SDXL-compatible LoRA of your model. We recommend using one trained by REED for best compatibility.</span>
          </li>
        </ul>
      </div>

      <TipBox>
        You don't need to download the checkpoints and LoRAs manually. The RunPod template includes <strong>CivitComfy</strong>, which lets you download everything directly from within ComfyUI using model URLs. We'll walk you through this in the Environment Setup section.
      </TipBox>
    </>
  );
};

// ── Inpainting Requirements (with download + password) ────────────────────────

const INPAINTING_PASSWORD = 'REED$A7vP1nQ#9sR4tY2&uB8eF@5hA0dG3cZw6S2kM1';
const INPAINTING_DOWNLOAD_URL = 'https://drive.google.com/file/d/1hAi48wiMgGeE0r7IN7uB5nxUOdgKPGjZ/view?usp=sharing';

const WorkflowDownloadBlock: React.FC<{ label: string; url: string; password: string }> = ({ label, url, password }) => {
  const [copied, setCopied] = React.useState(false);

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = password;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-gradient-to-br from-reed-red/5 to-reed-red/10 rounded-xl p-6 mb-6 border border-reed-red/20">
      <div className="flex items-center gap-2 mb-3">
        <Download className="w-5 h-5 text-reed-red" />
        <h4 className="font-semibold text-[var(--text-primary)]">{label}</h4>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        The file is compressed in a password-protected RAR archive.
      </p>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-reed-red hover:bg-reed-red-dark text-white font-semibold rounded-lg transition-colors mb-5"
      >
        <Download className="w-4 h-4" />
        Download from Google Drive
      </a>

      <div className="mt-2">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-2">Extraction Password:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm text-reed-red font-mono select-all break-all">
            {password}
          </code>
          <button
            onClick={copyPassword}
            className={`flex-shrink-0 p-3 rounded-lg border transition-all duration-200 ${
              copied
                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
            }`}
            title="Copy password"
          >
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

const RequirementsBase: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <>
    <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
      Before you begin, make sure you have the following accounts and resources ready.
    </p>

    <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
      <h4 className="font-semibold text-[var(--text-primary)] mb-3">Required Accounts:</h4>
      <ul className="space-y-2">
        <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span><strong className="text-[var(--text-primary)]">RunPod account</strong> — This is where the workflow runs. You'll rent a cloud GPU to power ComfyUI.</span>
        </li>
        <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span><strong className="text-[var(--text-primary)]">CivitAI account</strong> — Needed to generate an API key for downloading the required checkpoints and LoRAs.</span>
        </li>
      </ul>
    </div>

    {children}

    <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
      <h4 className="font-semibold text-[var(--text-primary)] mb-3">Required Models (downloaded later via CivitComfy):</h4>
      <ul className="space-y-2">
        <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span><strong className="text-[var(--text-primary)]">Two SDXL checkpoints</strong> — BigLust and NatVis Natural Vision</span>
        </li>
        <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span><strong className="text-[var(--text-primary)]">DMD2 Speed LoRA</strong> — An acceleration LoRA for faster generation</span>
        </li>
        <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span><strong className="text-[var(--text-primary)]">Your model's LoRA</strong> — An SDXL-compatible LoRA of your model. We recommend using one trained by REED for best compatibility.</span>
        </li>
      </ul>
    </div>

    <TipBox>
      You don't need to download the checkpoints and LoRAs manually. The RunPod template includes <strong>CivitComfy</strong>, which lets you download everything directly from within ComfyUI using model URLs. We'll walk you through this in the Environment Setup section.
    </TipBox>
  </>
);

const InpaintingRequirements: React.FC = () => (
  <RequirementsBase>
    <WorkflowDownloadBlock label="Download Inpainting Workflow" url={INPAINTING_DOWNLOAD_URL} password={INPAINTING_PASSWORD} />
  </RequirementsBase>
);

const EliteRequirements: React.FC = () => (
  <RequirementsBase>
    <WorkflowDownloadBlock label="Download ControlNet Workflow" url={WORKFLOW_DOWNLOAD_URL} password={WORKFLOW_PASSWORD} />
    <WorkflowDownloadBlock label="Download Inpainting Workflow" url={INPAINTING_DOWNLOAD_URL} password={INPAINTING_PASSWORD} />
  </RequirementsBase>
);

// ── ControlNet Lesson Content ─────────────────────────────────────────────────

const renderControlNetContent = (lessonId: string): React.ReactNode => {
  switch (lessonId) {

    // ─── MODULE 1: GETTING STARTED ──────────────────────────────────

    case 'cn-1-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Welcome to the <strong className="text-[var(--text-primary)]">REED ControlNet Poses Workflow</strong> — your professional-grade SDXL pipeline for generating hyper-realistic images with exact pose control and facial consistency.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            This workflow runs on <strong className="text-[var(--text-primary)]">ComfyUI</strong> via <strong className="text-[var(--text-primary)]">RunPod</strong>, giving you access to powerful cloud GPUs without needing any local hardware. Everything is pre-configured — the custom nodes, extensions, and pipeline are ready to go right out of the box.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">What's Included:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Pre-configured ComfyUI workflow file (<strong>REED Cnet v1</strong>)
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                All required custom nodes pre-installed on the RunPod template
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                CivitComfy integration for easy model downloads
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                ControlNet pose and edge detection capabilities
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                This step-by-step setup and usage guide
              </li>
            </ul>
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Follow this guide from start to finish and you'll be generating high-quality, pose-controlled images in no time. Each section builds on the previous one, so we recommend going through them in order.
          </p>
        </>
      );

    case 'cn-1-2':
      return (
        <ControlNetRequirements />
      );

    case 'cn-1-3':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Start by opening the RunPod template link below. This template comes pre-loaded with all the custom nodes and extensions required for the workflow, including the CivitComfy node for downloading models.
          </p>

          <a
            href="https://console.runpod.io/deploy?template=jullnp20dd&ref=ombfs0oy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl mb-6"
          >
            <ExternalLink className="w-5 h-5" />
            Open RunPod Template
          </a>

          <StepItem number={1}>
            <strong className="text-[var(--text-primary)]">Select the GPU.</strong> Make sure the <strong>RTX 5090</strong> is selected. This provides the optimal balance of performance and cost for this workflow.
          </StepItem>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252781/111_if8an9.jpg" alt="RunPod GPU selection screen — RTX 5090 highlighted" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <StepItem number={2}>
            <strong className="text-[var(--text-primary)]">Configure storage.</strong> The default disk space settings will work fine. If you need more space (for storing additional models or outputs), feel free to increase it — this won't affect the workflow's functionality.
          </StepItem>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252781/2222_mamfml.jpg" alt="RunPod storage configuration — Container Disk and Volume Disk settings" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <StepItem number={3}>
            <strong className="text-[var(--text-primary)]">Deploy.</strong> Without changing any other settings, click the <strong>"Deploy On-Demand"</strong> button and wait for the pod to be provisioned.
          </StepItem>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252781/333_hgqofr.jpg" alt="RunPod Deploy On-Demand button" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <TipBox>
            Deployment usually completes within a couple of minutes. You'll be able to see the progress in the next step when we check the pod's activation status.
          </TipBox>
        </>
      );

    // ─── MODULE 2: ENVIRONMENT SETUP ────────────────────────────────

    case 'cn-2-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            After deploying, you need to wait for your pod to fully activate before you can open ComfyUI. There are two ways to check the status:
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">How to check activation:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Check the Logs tab</strong> — Watch the startup logs until you see that all services are running.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Check the Connect tab</strong> — Wait until all ports show <strong className="text-green-400">"Ready"</strong> in green.</span>
              </li>
            </ul>
          </div>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252781/444_pearo1.jpg" alt="RunPod Connect tab — HTTP services panel showing ports with their status indicators" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Once all services show as ready, locate the <strong className="text-[var(--text-primary)]">ComfyUI</strong> link (Port 3000) in the Connect tab. Make sure the status indicator next to it is <strong className="text-green-400">green</strong> before clicking it.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252781/555_ywxyhd.jpg" alt="ComfyUI port link (Port 3000) with green Ready indicator" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Clicking that link will open ComfyUI in a new browser tab. Your workflow environment will load with all the pre-installed custom nodes ready to use.
          </p>

          <WarningBox>
            Do not try to open ComfyUI before the status turns green. The service needs to fully initialize first, otherwise you may encounter errors.
          </WarningBox>
        </>
      );

    case 'cn-2-2':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Before downloading the required models, you need to configure <strong className="text-[var(--text-primary)]">CivitComfy</strong> with your CivitAI API key. This key authorizes CivitComfy to download checkpoints and LoRAs directly from CivitAI.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Step 1: Get Your CivitAI API Key</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Go to your CivitAI account settings page:
          </p>
          <p className="mb-4">
            <ExternalUrl href="https://civitai.com/user/account">https://civitai.com/user/account</ExternalUrl>
          </p>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Scroll down until you find the <strong className="text-[var(--text-primary)]">"API Keys"</strong> section. Click <strong>"+ Add API key"</strong> to create a new key.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252781/777_vd8cim.jpg" alt="CivitAI account page — API Keys section with Add API key button highlighted" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Give the key any name you want — the name doesn't matter. What matters is the <strong className="text-[var(--text-primary)]">key value</strong> that gets generated. Copy it immediately, as you won't be able to see it again.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252780/888_pgpnkz.jpg" alt="CivitAI Create API Key dialog showing the generated API key with a copy button" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Step 2: Paste the Key in CivitComfy</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Back in ComfyUI, open the <strong className="text-[var(--text-primary)]">CivitComfy</strong> panel and navigate to the <strong>"Settings"</strong> tab. Paste your API key into the <strong>"Civitai API Key"</strong> field.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252781/666_mtsxqf.jpg" alt="CivitComfy Settings tab — Civitai API Key field with key pasted, Save Settings button visible" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Click <strong className="text-[var(--text-primary)]">"Save Settings"</strong> to save your configuration. CivitComfy is now ready to download models.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252780/999_um1rcx.jpg" alt="CivitComfy Settings tab — Save Settings button highlighted" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />
        </>
      );

    case 'cn-2-3':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Now you need to download the three models required by the workflow: <strong className="text-[var(--text-primary)]">two checkpoints</strong> and <strong className="text-[var(--text-primary)]">one LoRA</strong>. You'll use CivitComfy's Download tab for this.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Checkpoints to download:</h4>
            <ul className="space-y-3">
              <li className="text-sm text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">1. BigLust</strong><br />
                <ExternalUrl href="https://civitai.com/models/575395/big-lust">https://civitai.com/models/575395/big-lust</ExternalUrl>
              </li>
              <li className="text-sm text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">2. NatVis (Natural Vision)</strong><br />
                <ExternalUrl href="https://civitai.com/models/617652/natvis-natural-vision">https://civitai.com/models/617652/natvis-natural-vision</ExternalUrl>
              </li>
            </ul>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">LoRA to download:</h4>
            <ul className="space-y-3">
              <li className="text-sm text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">DMD2 Speed LoRA (SDXL)</strong><br />
                <ExternalUrl href="https://civitai.com/models/1608870/dmd2-speed-lora-sdxl-pony-illustrious">https://civitai.com/models/1608870/dmd2-speed-lora-sdxl-pony-illustrious</ExternalUrl>
              </li>
            </ul>
          </div>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">How to Download Each Model</h3>

          <StepItem number={1}>
            In CivitComfy, go to the <strong>"Download"</strong> tab.
          </StepItem>
          <StepItem number={2}>
            Paste the model URL into the <strong>"Model URL or ID"</strong> field. CivitComfy will automatically fetch the model information and display it below.
          </StepItem>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252780/101010_an3ybj.jpg" alt="CivitComfy Download tab — Model URL pasted, model info displayed (NatVis Natural Vision, SDXL 1.0, checkpoint)" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <StepItem number={3}>
            Click <strong>"Start Download"</strong> and wait for the download to complete. Repeat this process for each of the three models.
          </StepItem>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252780/111111_eay7dv.jpg" alt="CivitComfy Download tab — Start Download button highlighted" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <WarningBox>
            <strong>Critical: Select the correct "Model Type (Save Location)"</strong> for each download. When downloading a <strong>checkpoint</strong>, make sure the dropdown is set to <strong>"checkpoints"</strong>. When downloading a <strong>LoRA</strong>, change it to <strong>"loras"</strong>. If the model is saved to the wrong folder, the workflow won't be able to find it.
          </WarningBox>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252779/121212_nrakwe.jpg" alt="CivitComfy Download tab — Model Type (Save Location) dropdown showing loras selected for a LoRA download" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />
        </>
      );

    // ─── MODULE 3: WORKFLOW CONFIGURATION ───────────────────────────

    case 'cn-3-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Loading your workflow into ComfyUI is straightforward — just <strong className="text-[var(--text-primary)]">drag and drop</strong>.
          </p>

          <StepItem number={1}>
            Locate the <strong className="text-[var(--text-primary)]">"REED Cnet v1"</strong> workflow file on your computer (included with your purchase).
          </StepItem>
          <StepItem number={2}>
            Drag the file directly onto the ComfyUI canvas in your browser.
          </StepItem>
          <StepItem number={3}>
            The workflow will load automatically, displaying all the configured nodes and connections.
          </StepItem>

          <TipBox>
            If at any point you accidentally modify the workflow and it stops working, simply delete the current workflow from the canvas and drag the original file in again. This will restore everything to its default state.
          </TipBox>
        </>
      );

    case 'cn-3-2':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Once the workflow is loaded and all models have been downloaded, you need to assign each model to its corresponding node. The workflow uses <strong className="text-[var(--text-primary)]">two checkpoints</strong> and <strong className="text-[var(--text-primary)]">one speed LoRA</strong>.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Checkpoint Nodes</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            You'll find two <strong className="text-[var(--text-primary)]">"Load Checkpoint"</strong> nodes in the workflow. Assign them as follows:
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">First Load Checkpoint node</strong> → Select <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs text-reed-red">bigLust_v16.safetensors</code></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Second Load Checkpoint node</strong> → Select <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs text-reed-red">natvisNaturalVision_v27.safetensors</code></span>
              </li>
            </ul>
          </div>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252779/131313_fjxqbr.jpg" alt="ComfyUI canvas — Two Load Checkpoint nodes with bigLust and natvisNaturalVision selected, connected to a ModelMerge node" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Speed LoRA Node</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Find the <strong className="text-[var(--text-primary)]">"LoraLoaderModelOnly"</strong> node (displayed in teal/cyan color) and select the DMD2 speed LoRA:
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">LoraLoaderModelOnly node</strong> → Select <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs text-reed-red">dmd2_sdxl_4step_lora.safetensors</code></span>
              </li>
            </ul>
          </div>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252780/141414_idx57q.jpg" alt="ComfyUI canvas — LoraLoaderModelOnly node (teal color) with dmd2_sdxl_4step_lora selected, strength_model set to 0.90" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />
        </>
      );

    case 'cn-3-3':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The most important element for personalized results is <strong className="text-[var(--text-primary)]">your model's LoRA</strong> — this is what gives the generated images your model's unique appearance. This LoRA must be <strong>SDXL-compatible</strong>.
          </p>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            In the workflow, you'll find a <strong className="text-[var(--text-primary)]">red-colored LoRA node</strong>. This is where you load your model's LoRA file.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252780/151515_eofcgu.jpg" alt="ComfyUI canvas — Red LoRA loader node highlighted, with ModelMergeSimple and LoraLoaderModelOnly nodes visible" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Key Points:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Your LoRA <strong>must</strong> be an SDXL model — other architectures won't work with this workflow.
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                We recommend using a LoRA trained by REED, as it's specifically optimized for this workflow.
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                If you purchased a LoRA from us, we'll provide you with the trigger word — no extra configuration needed on your part.
              </li>
            </ul>
          </div>

          <TipBox>
            You can use any SDXL-compatible LoRA of your model. However, a LoRA trained by REED will deliver the best results with this specific workflow since the entire pipeline is optimized to work together.
          </TipBox>
        </>
      );

    // ─── MODULE 4: USING CONTROLNET ─────────────────────────────────

    case 'cn-4-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The ControlNet section of the workflow is what sets this pipeline apart. It allows you to <strong className="text-[var(--text-primary)]">upload a reference image</strong> and have the AI replicate its pose, edges, or structure — while applying your model's face and appearance.
          </p>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            In the workflow, you'll see a group of nodes dedicated to ControlNet. The main components are:
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">ControlNet Node Group:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Load Image</strong> — Where you upload your reference image</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">ControlNet Preprocessor</strong> — Processes the reference image using your chosen method</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Load ControlNet Model</strong> — Loads the ControlNet model that guides the generation</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Apply ControlNet</strong> — Applies the control signal to the generation process</span>
              </li>
            </ul>
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The preprocessor dropdown offers many modes to choose from. Each mode extracts different information from your reference image:
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252780/161616_eorozy.jpg" alt="ControlNet preprocessor dropdown — Full list of available modes including canny, pose, lineart, depth, and more" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <TipBox>
            We recommend starting with <strong>canny</strong> and <strong>pose</strong> modes, as they deliver the most consistent and reliable results. You can experiment with all the other modes as you gain experience.
          </TipBox>
        </>
      );

    case 'cn-4-2':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            <strong className="text-[var(--text-primary)]">Canny mode</strong> is an edge-detection preprocessor that extracts the contours and outlines from your reference image. The AI then uses these edges as a guide to generate the result with the same shapes and proportions.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Best Use Cases:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Close-up shots where you need precise anatomical detail replication
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Images where contour accuracy is more important than overall pose
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Detailed reference matching where edge fidelity matters
              </li>
            </ul>
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            When you select <strong>canny</strong> as the preprocessor, the Preview Image node will show a black-and-white edge map extracted from your reference. The generation will follow these edges closely.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252780/171717_jmgzxc.jpg" alt="ControlNet in canny mode — Reference image on the left, extracted canny edge map shown in the Preview Image node on the right" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <TipBox>
            Also try <strong>canny_pyra</strong> for a variation of this mode that can produce slightly different results. Both work well for close-up, detail-focused images.
          </TipBox>
        </>
      );

    case 'cn-4-3':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            <strong className="text-[var(--text-primary)]">Pose mode</strong> is the second most commonly used ControlNet preprocessor. It detects the body skeleton from your reference image — identifying key joints and limbs — and uses that skeleton as a guide for generation.
          </p>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The result maintains the <strong className="text-[var(--text-primary)]">exact same pose</strong> as the reference image, but with your model's face and body. This is ideal for replicating specific positions and angles.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252779/181818_ghezuc.jpg" alt="ControlNet in pose mode — Reference image on the left, extracted skeleton/joint map displayed in the Preview Image node on the right" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Best Use Cases:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Full-body pose replication from reference photos
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Generating consistent poses across multiple images
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Recreating specific body positions with your model's appearance
              </li>
            </ul>
          </div>

          <TipBox>
            Feel free to experiment with all available preprocessor modes. Each one offers a different approach to extracting reference information from your image. The more you experiment, the better you'll understand the capabilities and find what works best for your specific needs.
          </TipBox>
        </>
      );

    case 'cn-4-4':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            ControlNet is optional. If you don't have a reference image or want the AI to generate entirely original compositions based solely on your prompt, you can <strong className="text-[var(--text-primary)]">disable ControlNet</strong>.
          </p>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Look for the <strong className="text-[var(--text-primary)]">"Fast Groups Bypasser"</strong> node in the workflow. It has a toggle labeled <strong>"Enable ControlNet"</strong>. Set it to <strong>"no"</strong> to deactivate all ControlNet nodes.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252779/191919_t3g7gu.jpg" alt="ComfyUI canvas — Fast Groups Bypasser node with Enable ControlNet toggle set to no" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">When to use each mode:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">ControlNet ON</strong> — When you have a reference image and want to replicate a specific pose or composition.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">ControlNet OFF</strong> — When you want the AI to generate entirely new compositions guided only by your text prompt.</span>
              </li>
            </ul>
          </div>

          <TipBox>
            We recommend using ControlNet when you need more precise, consistent results. Disabling it gives you more creative freedom but with less predictable compositions.
          </TipBox>
        </>
      );

    // ─── MODULE 5: PROMPTS & GENERATION ─────────────────────────────

    case 'cn-5-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The prompt is what directs the AI to generate the image you want. Since this workflow uses <strong className="text-[var(--text-primary)]">SDXL</strong>, the prompt needs to follow a specific structure for optimal results.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Prompt Structure</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Every prompt should follow this pattern:
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <ol className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex-shrink-0 w-6 h-6 bg-reed-red/10 text-reed-red rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span><strong className="text-[var(--text-primary)]">Trigger word</strong> — Start with <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs text-reed-red">@your_model_name</code> to activate LoRA recognition.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex-shrink-0 w-6 h-6 bg-reed-red/10 text-reed-red rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span><strong className="text-[var(--text-primary)]">Scene description</strong> — A detailed, hyper-realistic description of the scene, pose, physical features, environment, and lighting.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex-shrink-0 w-6 h-6 bg-reed-red/10 text-reed-red rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span><strong className="text-[var(--text-primary)]">Quality tags</strong> — End with quality descriptors like <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs text-reed-red">ultra-high detail, 8k, realistic skin texture, f/1.8, high-resolution photographic aesthetics</code>.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex-shrink-0 w-6 h-6 bg-reed-red/10 text-reed-red rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span><strong className="text-[var(--text-primary)]">LoRA activation tags</strong> — After the prompt text, add your LoRA tags on separate lines.</span>
              </li>
            </ol>
          </div>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Example Prompt</h3>

          <CodeBlock>{`@your_model_name, A hyperrealistic young woman sitting on the bed, looking directly into the camera lens with striking almond-shaped eyes and well-defined arched eyebrows. Her warm, tanned skin has a realistic texture. Her long, straight brown hair is parted in the middle and falls naturally onto the white pillow. She has a shy, playful smile on her full, soft lips. She has both arms resting on the bed. The background is a minimalist bedroom, completely white, with plain cotton sheets and closed windows. The lighting is soft, with diffuse, uniform artificial light from the front creating a flattering glow without unnatural ring reflections. Unretouched photo quality, ultra-high detail, 8k, realistic skin texture, sharp focus on the eyes and smile, f/1.8, high-resolution photographic aesthetics with a smartphone.

<lora:your_model:1>
<lora:dmd2_sdxl_4step_lora_fp16:1>`}</CodeBlock>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252779/212121_p5hiyf.jpg" alt="ComfyUI canvas — CLIP Text Encode (Prompt) node showing the positive prompt with the trigger word at the beginning and LoRA tags at the end" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Negative Prompt</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The negative prompt is already pre-configured in the workflow's second <strong className="text-[var(--text-primary)]">CLIP Text Encode</strong> node. It includes common quality-related negative terms to avoid artifacts. You do <strong>not</strong> need to modify it.
          </p>

          <CodeBlock>{`lowres, text, error, cropped, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, out of frame, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated`}</CodeBlock>
        </>
      );

    case 'cn-5-2':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Writing detailed prompts manually can be challenging. We recommend using <strong className="text-[var(--text-primary)]">AI assistants</strong> to help you generate accurate, well-structured prompts based on your model's reference photos.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Recommended: Grok</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            <strong className="text-[var(--text-primary)]">Grok</strong> is our top recommendation for prompt generation. It's free and handles NSFW content well. Here's how to use it:
          </p>

          <StepItem number={1}>
            Open a new Grok chat session.
          </StepItem>
          <StepItem number={2}>
            Upload a photo of your model.
          </StepItem>
          <StepItem number={3}>
            Paste one of the example prompts from the previous lesson along with this instruction:
          </StepItem>

          <CodeBlock>{`"Based on this photo of this model, update this prompt verbatim so that it accurately describes the girl in the photo. It must maintain the structure of the example prompt, including how it begins and ends, as well as the details at the end."`}</CodeBlock>

          <StepItem number={4}>
            Grok will return an updated prompt that matches your model's actual physical features while maintaining the correct prompt structure.
          </StepItem>

          <TipBox>
            If Grok doesn't comply with the request, simply start a new chat session and try again. It usually works within a few attempts.
          </TipBox>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Alternative: Venice AI</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            If Grok consistently refuses your requests, <strong className="text-[var(--text-primary)]">Venice AI</strong> is a solid alternative. It always processes NSFW content, though it's generally less capable than Grok for detailed prompt writing. Use it as a backup option.
          </p>
        </>
      );

    case 'cn-5-3':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            For the best results, every prompt must include two types of LoRA references: the <strong className="text-[var(--text-primary)]">trigger word</strong> at the beginning and the <strong className="text-[var(--text-primary)]">LoRA activation tags</strong> at the end.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Trigger Word (@)</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-xs text-reed-red">@</code> at the beginning of the prompt acts as a <strong className="text-[var(--text-primary)]">trigger word</strong>. It tells the model which LoRA to prioritize. Replace <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-xs text-reed-red">your_model_name</code> with the actual name associated with your LoRA.
          </p>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            If your LoRA was trained by REED, we will provide you with the exact trigger word to use — you won't need to figure it out yourself.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">LoRA Activation Tags</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            At the end of every prompt, you must include two LoRA tags:
          </p>

          <CodeBlock>{`<lora:your_model:1>
<lora:dmd2_sdxl_4step_lora_fp16:1>`}</CodeBlock>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Tag Breakdown:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs text-reed-red">&lt;lora:your_model:1&gt;</code> — Replace <strong>your_model</strong> with the exact filename of your LoRA file (without the extension). The <strong>:1</strong> is the strength value.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs text-reed-red">&lt;lora:dmd2_sdxl_4step_lora_fp16:1&gt;</code> — This is the speed LoRA. Always keep this tag exactly as shown.</span>
              </li>
            </ul>
          </div>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252779/202020_fsafzp.jpg" alt="ComfyUI canvas — LoRA node with model LoRA file selected, showing the connection to ModelMergeSimple and CLIP Text Encode with LoRA tags" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <WarningBox>
            The LoRA filename in the tag must exactly match the actual file name of your LoRA (minus the file extension). For example, if your file is named <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs">Shyla.Plays.safetensors</code>, the tag should be <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs">&lt;lora:Shyla.Plays:1&gt;</code>.
          </WarningBox>
        </>
      );

    case 'cn-5-4':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            With everything configured, you're ready to generate. Here are the essential tips to get the best results and avoid common issues.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Generating Images</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Click <strong className="text-[var(--text-primary)]">"Queue Prompt"</strong> (or the <strong>"Run"</strong> button) to start generating. The result will appear in the output nodes once processing is complete.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Important Guidelines:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Expect some imperfect results.</strong> Since this is a locally-running SDXL model, occasional artifacts are normal — extra limbs, duplicated features, etc. Simply regenerate when this happens.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Don't touch node parameters</strong> unless you have prior ComfyUI experience. Changing values in any node may break the workflow.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">If the workflow breaks</strong>, simply delete it from the canvas and drag the original "REED Cnet v1" file back in. This fully resets everything.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Keep generating.</strong> The quality varies between runs. Generate multiple times until you achieve the desired result.</span>
              </li>
            </ul>
          </div>

          <WarningBox>
            <strong>Do not modify node parameters</strong> (steps, CFG, sampler, scheduler, etc.) unless you're experienced with ComfyUI. Changing these values can significantly degrade output quality or cause errors. If you accidentally change something and the workflow stops working, drag the original file back into ComfyUI to reset.
          </WarningBox>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770252779/212121_p5hiyf.jpg" alt="ComfyUI canvas — CLIP Text Encode (Prompt) node with a complete prompt, ready for generation" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Quick Reference</h3>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Workflow Checklist:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Both checkpoints assigned (BigLust + NatVis Natural Vision)
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                DMD2 speed LoRA assigned in the teal node
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Your model's LoRA assigned in the red node
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Prompt includes trigger word (@model_name) at the start
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Prompt includes both LoRA tags at the end
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                ControlNet enabled/disabled based on your needs
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Reference image uploaded (if using ControlNet)
              </li>
            </ul>
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            That's everything you need to start generating professional-quality, pose-controlled images. If you run into issues, don't hesitate to contact our support team through the priority support channel included with your purchase.
          </p>
        </>
      );

    default:
      return null;
  }
};

// ── Inpainting Lesson Content ─────────────────────────────────────────────────

const renderInpaintingContent = (lessonId: string): React.ReactNode => {
  switch (lessonId) {

    case 'ip-1-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Welcome to the <strong className="text-[var(--text-primary)]">REED Inpainting Pro Workflow</strong> — your professional SDXL pipeline for editing specific areas of images while keeping everything else perfectly intact.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Unlike traditional generation where you create images from scratch, inpainting lets you <strong className="text-[var(--text-primary)]">modify targeted regions</strong> of existing photos. Upload an image, paint over the area you want to change, describe what should replace it, and the AI seamlessly blends the new content with the original.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">What's Included:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Pre-configured ComfyUI inpainting workflow file (<strong>REED Inpaint v1</strong>)
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Built-in Mask Editor for precise area selection
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                All required custom nodes pre-installed on the RunPod template
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                CivitComfy integration for easy model downloads
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                This step-by-step setup and usage guide
              </li>
            </ul>
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            This workflow uses the <strong className="text-[var(--text-primary)]">same RunPod template, checkpoints, and LoRAs</strong> as the ControlNet workflow. If you've already set those up, you can skip directly to the Inpainting section. Otherwise, follow this guide from start to finish.
          </p>
        </>
      );

    case 'ip-1-2':
      return (<InpaintingRequirements />);

    // Shared setup lessons — delegate to ControlNet
    case 'ip-1-3': return renderControlNetContent('cn-1-3');
    case 'ip-2-1': return renderControlNetContent('cn-2-1');
    case 'ip-2-2': return renderControlNetContent('cn-2-2');
    case 'ip-2-3': return renderControlNetContent('cn-2-3');

    case 'ip-3-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Loading the inpainting workflow into ComfyUI is straightforward — just <strong className="text-[var(--text-primary)]">drag and drop</strong>.
          </p>

          <StepItem number={1}>
            Locate the <strong className="text-[var(--text-primary)]">"REED Inpaint v1"</strong> workflow file on your computer (included with your purchase).
          </StepItem>
          <StepItem number={2}>
            Drag the file directly onto the ComfyUI canvas in your browser.
          </StepItem>
          <StepItem number={3}>
            The workflow will load automatically, displaying all the configured nodes and connections.
          </StepItem>

          <TipBox>
            If at any point you accidentally modify the workflow and it stops working, simply delete the current workflow from the canvas and drag the original file in again. This will restore everything to its default state.
          </TipBox>
        </>
      );

    // Shared config lessons — delegate to ControlNet
    case 'ip-3-2': return renderControlNetContent('cn-3-2');
    case 'ip-3-3': return renderControlNetContent('cn-3-3');

    // ─── MODULE 4: USING INPAINTING ──────────────────────────────────

    case 'ip-4-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Inpainting allows you to <strong className="text-[var(--text-primary)]">selectively edit specific areas</strong> of an existing image while keeping everything else untouched. Instead of generating an entire image from a prompt, you upload a photo, mask the region you want to change, and describe what should appear there.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Inpainting Workflow at a Glance:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Upload an image</strong> — Load the photo you want to edit into the workflow</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Paint a mask</strong> — Use the Mask Editor to highlight exactly which area you want to change</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Write a prompt</strong> — Describe what should replace the masked area</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Generate</strong> — The AI fills in the masked area while seamlessly blending with the rest of the image</span>
              </li>
            </ul>
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The core of the workflow is the <strong className="text-[var(--text-primary)]">"1. UPLOAD PHOTO & PAINT MASK"</strong> node. This is where you upload your image and define the mask. To its left, you'll see the prompt nodes and the LoRA configuration — the same red model LoRA node used in the ControlNet workflow.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770255660/3644364363_vhhkam.png" alt="Inpainting workflow overview — Upload Photo and Paint Mask node with LoRA configuration and prompt nodes" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <TipBox>
            The checkpoints, speed LoRA, and model LoRA are configured exactly the same way as in the ControlNet workflow. If you've already completed those steps, they carry over — you don't need to reconfigure anything.
          </TipBox>
        </>
      );

    case 'ip-4-2':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The masking process is how you tell the AI <strong className="text-[var(--text-primary)]">exactly which area</strong> of the image to edit. Everything outside the mask remains untouched.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Step 1: Upload Your Image</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            In the <strong className="text-[var(--text-primary)]">"1. UPLOAD PHOTO & PAINT MASK"</strong> node, click <strong>"choose file to upload"</strong> and select the image you want to edit.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Step 2: Open the Mask Editor</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Once your image is loaded, <strong className="text-[var(--text-primary)]">right-click</strong> on the image node. A context menu will appear. Look for <strong className="text-[var(--text-primary)]">"Open in MaskEditor | Image Canvas"</strong> near the bottom of the menu and click it.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770254569/3252352623_okrioi.jpg" alt="Right-click context menu on image node showing Open in MaskEditor option highlighted" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Step 3: Paint the Mask</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The Mask Editor will open with your image displayed. Use the <strong className="text-[var(--text-primary)]">brush tool</strong> to paint over the areas you want the AI to replace. The painted region will be highlighted — this is the area the AI will regenerate based on your prompt.
          </p>

          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/f_auto,q_auto,w_850/v1770254570/342343242_nk7bew.jpg" alt="Mask Editor interface — brush tool painting over the area to be inpainted, with brush settings visible on the right" className="w-full h-auto rounded-xl border border-[var(--border-color)] my-6" loading="lazy" />

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Mask Editor Controls:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Brush Size</strong> — Adjust the brush size for finer or broader strokes</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Hardness</strong> — Controls the edge softness of the brush</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Clear</strong> — Removes the entire mask so you can start over</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Save</strong> — Saves the mask and returns to the main workflow canvas</span>
              </li>
            </ul>
          </div>

          <StepItem number={4}>
            Once you're satisfied with the mask, click <strong className="text-[var(--text-primary)]">"Save"</strong> at the top of the Mask Editor. The mask will be applied to the image node and you'll return to the main ComfyUI canvas.
          </StepItem>

          <WarningBox>
            The quality of the inpainting result depends heavily on how accurately you paint the mask. Take your time to cover exactly the area you want to change — avoid leaving gaps or masking too much of the surrounding area.
          </WarningBox>
        </>
      );

    case 'ip-4-3':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Inpainting prompts are fundamentally different from full-image generation prompts. Instead of describing an entire scene, you <strong className="text-[var(--text-primary)]">only describe what should appear in the masked area</strong>.
          </p>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Prompt Structure</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Keep the prompt simple and focused. You still need to include your trigger word and LoRA tags, but the descriptive portion should target only the masked region.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">What to Include:</h4>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex-shrink-0 w-6 h-6 bg-reed-red/10 text-reed-red rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span><strong className="text-[var(--text-primary)]">Trigger word</strong> — Start with <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs text-reed-red">@your_model_name</code> as always.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex-shrink-0 w-6 h-6 bg-reed-red/10 text-reed-red rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span><strong className="text-[var(--text-primary)]">Masked area description</strong> — Describe <strong>only</strong> what should appear in the masked region. Be specific and concise.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex-shrink-0 w-6 h-6 bg-reed-red/10 text-reed-red rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span><strong className="text-[var(--text-primary)]">Quality tags</strong> — Add blending and quality descriptors: <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-xs text-reed-red">smooth skin, perfect seamless blending</code></span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex-shrink-0 w-6 h-6 bg-reed-red/10 text-reed-red rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span><strong className="text-[var(--text-primary)]">LoRA tags</strong> — End with your LoRA activation tags (same as ControlNet).</span>
              </li>
            </ol>
          </div>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-6">Example Prompts</h3>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-2">
            <strong className="text-[var(--text-primary)]">Changing clothing in the masked area:</strong>
          </p>
          <CodeBlock>{`@your_model_name, wearing a red bikini top, smooth skin, perfect seamless blending

<lora:your_model:1>
<lora:dmd2_sdxl_4step_lora_fp16:1>`}</CodeBlock>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-2 mt-4">
            <strong className="text-[var(--text-primary)]">Removing an item from the masked area:</strong>
          </p>
          <CodeBlock>{`@your_model_name, bare skin, natural body, smooth skin, perfect seamless blending

<lora:your_model:1>
<lora:dmd2_sdxl_4step_lora_fp16:1>`}</CodeBlock>

          <TipBox>
            The key difference from ControlNet prompts: <strong>do not describe the entire scene</strong>. Only describe what should exist within the painted mask. The AI already knows what the rest of the image looks like and will blend your changes into it.
          </TipBox>
        </>
      );

    case 'ip-4-4':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            With your mask painted and prompt written, click <strong className="text-[var(--text-primary)]">"Queue Prompt"</strong> (or the <strong>"Run"</strong> button) to start generating. Here are the key tips for getting the best inpainting results.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Best Practices:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Be precise with your mask.</strong> The quality of the result depends heavily on how well you define the area. Take your time painting — avoid gaps and excessive overflow into surrounding regions.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Keep prompts short and targeted.</strong> Only describe what should fill the masked area. Long, detailed scene descriptions will confuse the inpainting process.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Always include "seamless blending" in your prompt.</strong> This helps the AI merge the inpainted area naturally with the surrounding image.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Generate multiple times.</strong> Results vary between runs. If the first result isn't perfect, simply run it again — each generation will produce a different variation.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">Don't modify node parameters</strong> unless you have prior ComfyUI experience. Changing values may break the workflow.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong className="text-[var(--text-primary)]">If the workflow breaks</strong>, delete it from the canvas and drag the original "REED Inpaint v1" file back in to fully reset.</span>
              </li>
            </ul>
          </div>

          <WarningBox>
            <strong>Do not modify node parameters</strong> (steps, CFG, sampler, scheduler, denoise, etc.) unless you're experienced with ComfyUI. Changing these values can significantly degrade output quality or cause errors. If you accidentally change something and the workflow stops working, drag the original file back into ComfyUI to reset.
          </WarningBox>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            That's everything you need to start editing images with professional-quality inpainting. If you run into issues, don't hesitate to contact our support team through the priority support channel included with your purchase.
          </p>
        </>
      );

    default:
      return null;
  }
};

// ── Elite Bundle Lesson Content ───────────────────────────────────────────────

const renderEliteContent = (lessonId: string): React.ReactNode => {
  switch (lessonId) {

    case 'el-1-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Welcome to the <strong className="text-[var(--text-primary)]">REED Elite Bundle</strong> — the complete SDXL toolkit for professional content creation. This bundle includes <strong className="text-[var(--text-primary)]">both workflows</strong>, our optimized prompt library, and custom presets, all in one package.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">What's Included:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <strong className="text-[var(--text-primary)]">ControlNet Poses Workflow</strong> — Generate images with exact pose control using reference images
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <strong className="text-[var(--text-primary)]">Inpainting Pro Workflow</strong> — Edit specific areas of existing images with intelligent masking
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <strong className="text-[var(--text-primary)]">Optimized Prompt Library</strong> — A curated collection of proven prompts for various scenarios
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <strong className="text-[var(--text-primary)]">Custom Presets</strong> — Pre-configured settings for different use cases
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <strong className="text-[var(--text-primary)]">1:1 VIP Support</strong> — Direct access to our support team for personalized assistance
              </li>
            </ul>
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Both workflows run on the <strong className="text-[var(--text-primary)]">same RunPod template</strong> and share the same checkpoints and LoRAs — you only need to deploy and configure once. This guide covers the complete setup process and detailed usage instructions for both workflows.
          </p>

          <TipBox>
            We recommend going through this guide in order. The first two sections (Getting Started and Environment Setup) are shared between both workflows. After that, each workflow has its own dedicated section.
          </TipBox>
        </>
      );

    case 'el-1-2':
      return (<EliteRequirements />);

    // Shared setup — delegate to ControlNet
    case 'el-1-3': return renderControlNetContent('cn-1-3');
    case 'el-2-1': return renderControlNetContent('cn-2-1');
    case 'el-2-2': return renderControlNetContent('cn-2-2');
    case 'el-2-3': return renderControlNetContent('cn-2-3');

    // ControlNet workflow section — delegate to ControlNet
    case 'el-3-1': return renderControlNetContent('cn-3-1');
    case 'el-3-2': return renderControlNetContent('cn-3-2');
    case 'el-3-3': return renderControlNetContent('cn-3-3');
    case 'el-3-4': return renderControlNetContent('cn-4-1');
    case 'el-3-5': return renderControlNetContent('cn-4-2');
    case 'el-3-6': return renderControlNetContent('cn-4-3');
    case 'el-3-7': return renderControlNetContent('cn-4-4');

    // Inpainting workflow section — delegate to Inpainting
    case 'el-4-1': return renderInpaintingContent('ip-3-1');
    case 'el-4-2': return renderInpaintingContent('ip-4-1');
    case 'el-4-3': return renderInpaintingContent('ip-4-2');
    case 'el-4-4': return renderInpaintingContent('ip-4-3');

    // Prompts section — delegate to ControlNet (shared)
    case 'el-5-1': return renderControlNetContent('cn-5-1');
    case 'el-5-2': return renderControlNetContent('cn-5-2');
    case 'el-5-3': return renderControlNetContent('cn-5-3');
    case 'el-5-4': return renderControlNetContent('cn-5-4');

    default:
      return null;
  }
};

// ── LoRA Service Content ─────────────────────────────────────────────────────

const renderLoraContent = (lessonId: string, serviceId: string): React.ReactNode => {
  const isAdvanced = serviceId === 'lora-advanced';

  switch (lessonId) {
    case 'lr-1-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            A <strong className="text-[var(--text-primary)]">LoRA</strong> (Low-Rank Adaptation) is a lightweight AI model trained specifically on photos of one person. Once trained, it allows you to generate hyper-realistic images of that person in <strong className="text-[var(--text-primary)]">any pose, outfit, or scene</strong> you can imagine — all through simple text prompts.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">What You Get</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>A custom <strong className="text-[var(--text-primary)]">.safetensors</strong> LoRA file trained on your reference photos</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Compatible with SDXL workflows in ComfyUI, Automatic1111, and other platforms</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Unlimited generations once you have the file — it's yours forever</span>
              </li>
            </ul>
          </div>

          <TipBox>
            Your LoRA works perfectly with our ControlNet and Inpainting workflows. If you want full control over poses and editing, check out those services as well.
          </TipBox>
        </>
      );

    case 'lr-1-2':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            We offer two tiers of LoRA training, each designed for different levels of detail and accuracy.
          </p>

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div className={`rounded-xl p-5 border ${!isAdvanced ? 'border-reed-red bg-reed-red/5' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Basic LoRA</h3>
                {!isAdvanced && <span className="px-2 py-0.5 text-[10px] font-bold bg-reed-red text-white rounded uppercase">Your plan</span>}
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mb-3">$47</p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Trained on <strong>40 images</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>85%+</strong> likeness accuracy</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>24-hour delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>1 revision included</span>
                </li>
              </ul>
            </div>

            <div className={`rounded-xl p-5 border ${isAdvanced ? 'border-reed-red bg-reed-red/5' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Advanced LoRA</h3>
                {isAdvanced && <span className="px-2 py-0.5 text-[10px] font-bold bg-reed-red text-white rounded uppercase">Your plan</span>}
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mb-3">$147</p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Trained on <strong>150 images</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>95%+</strong> likeness accuracy</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Ultra-detailed rendering</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>3 revisions included</span>
                </li>
              </ul>
            </div>
          </div>

          <TipBox>
            The Advanced LoRA captures finer details like skin texture, unique facial features, and body proportions — resulting in generations that are nearly indistinguishable from real photos.
          </TipBox>
        </>
      );

    case 'lr-1-3':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            The quality of your LoRA depends directly on the quality of the photos you provide. Follow these guidelines for the best results.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Photo Requirements</h3>
            <div className="space-y-4">
              <StepItem number={1} title="Minimum 2 photos (1 face + 1 body)" description="This is the absolute minimum. More photos = better LoRA. We recommend 10-20 for Basic and 30+ for Advanced." />
              <StepItem number={2} title="Clear, well-lit photos" description="No filters, no blur, no heavy editing. Natural lighting works best. The AI needs to see actual skin texture and features." />
              <StepItem number={3} title="Variety is key" description="Include different poses, angles, expressions, and outfits. Front-facing, side profile, 3/4 angle, full body, and half body shots." />
              <StepItem number={4} title="Same person in all photos" description="Every photo must be of the same model. Mixing different people will produce poor results." />
            </div>
          </div>

          <WarningBox>
            Avoid group photos, heavily filtered images, or photos with obstructions covering the face. These will significantly reduce LoRA quality.
          </WarningBox>
        </>
      );

    case 'lr-2-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Here's exactly what happens after you purchase your LoRA:
          </p>

          <div className="space-y-4 mb-6">
            <StepItem number={1} title="Upload your reference photos" description="Go to My Purchases, find your order, and click 'Upload Photos'. Follow the guidelines to provide high-quality reference images." />
            <StepItem number={2} title="We train your LoRA" description="Our team receives your photos and begins training. We use optimized SDXL training parameters calibrated for maximum likeness." />
            <StepItem number={3} title="Quality review" description="We test the LoRA internally to ensure it meets our quality standards before delivery." />
            <StepItem number={4} title="Download your LoRA" description="Once ready, you'll see the status change to 'Ready' in My Purchases. Click 'Download LoRA' to get your .safetensors file." />
          </div>

          <TipBox>
            You can check the status of your order anytime in <strong>My Purchases</strong>. The status will update from "Processing" to "Ready" when your LoRA is complete.
          </TipBox>
        </>
      );

    case 'lr-2-2':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Your order goes through three stages:
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-amber-500">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-amber-500">Processing</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Your photos have been received and training is underway. This is the active work phase.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-green-500">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-green-500">Ready</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Training is complete and your LoRA file is available for download. This is when you get the green "Download LoRA" button.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-blue-500">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-blue-500">Delivered</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1">You've downloaded your LoRA. You can re-download it anytime from My Purchases.</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border-color)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Delivery Timeline</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              We deliver most LoRAs within <strong className="text-[var(--text-primary)]">24–48 hours</strong>. In peak periods, it may take up to <strong className="text-[var(--text-primary)]">3 business days</strong>. Advanced LoRAs require more training time due to the larger dataset.
            </p>
          </div>
        </>
      );

    case 'lr-2-3':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Once your LoRA status shows <strong className="text-[var(--text-primary)]">"Ready"</strong>, follow these steps:
          </p>

          <div className="space-y-4 mb-6">
            <StepItem number={1} title="Download the file" description="Go to My Purchases and click the green 'Download LoRA' button. You'll receive a .safetensors file." />
            <StepItem number={2} title="Place it in the correct folder" description="Copy the .safetensors file into your ComfyUI loras folder. The typical path is: ComfyUI/models/loras/" />
            <StepItem number={3} title="Load it in your workflow" description="In any SDXL workflow, add a 'Load LoRA' node and select your LoRA file from the dropdown. Connect it between the checkpoint and the sampler." />
          </div>

          <CodeBlock>ComfyUI/models/loras/your-lora-name.safetensors</CodeBlock>

          <TipBox>
            If you purchased one of our workflows (ControlNet or Inpainting), the LoRA node is already pre-configured. Just select your LoRA file from the dropdown — no manual wiring needed.
          </TipBox>
        </>
      );

    case 'lr-3-1':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Your LoRA uses a <strong className="text-[var(--text-primary)]">trigger word</strong> to activate the likeness in your prompts. We set this trigger word based on the <strong className="text-[var(--text-primary)]">model name you provided</strong> during the upload process. Simply include that name in your prompt and the AI will generate images with the trained likeness.
          </p>

          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">LoRA Strength</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              The LoRA strength (weight) controls how strongly the model's likeness appears. You can adjust this in the Load LoRA node.
            </p>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="font-mono text-reed-red font-bold">0.6–0.7</span>
                <span>— Subtle influence. Good for artistic or stylized outputs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-reed-red font-bold">0.8–0.9</span>
                <span>— Recommended. Strong likeness while maintaining natural variety.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-reed-red font-bold">1.0</span>
                <span>— Maximum likeness. May reduce flexibility in poses and expressions.</span>
              </li>
            </ul>
          </div>

          <WarningBox>
            Setting the LoRA strength above 1.0 can produce artifacts and distortions. Stay within the 0.6–1.0 range for best results.
          </WarningBox>
        </>
      );

    case 'lr-3-2':
      return (
        <>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Here are proven techniques to get the most out of your custom LoRA:
          </p>

          <div className="space-y-4 mb-6">
            <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-color)]">
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Be specific in your prompts</h4>
              <p className="text-sm text-[var(--text-secondary)]">Describe the scene, lighting, clothing, and pose in detail. The more specific you are, the better the result. Avoid vague prompts like "beautiful photo."</p>
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-color)]">
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Use negative prompts</h4>
              <p className="text-sm text-[var(--text-secondary)]">Include negative prompts to avoid common issues: "blurry, deformed, extra limbs, bad anatomy, low quality, watermark." This significantly improves output quality.</p>
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-color)]">
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Experiment with seeds</h4>
              <p className="text-sm text-[var(--text-secondary)]">If you find a generation you like, save the seed number. You can reuse it with slight prompt variations to get consistent results with minor changes.</p>
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-color)]">
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Combine with ControlNet</h4>
              <p className="text-sm text-[var(--text-secondary)]">For exact pose control, pair your LoRA with our ControlNet workflow. This gives you both accurate likeness AND precise poses — the combination used by professional AI content creators.</p>
            </div>
          </div>

          <TipBox>
            Need help getting specific results? Reach out to our support team. We can guide you through prompt optimization for your LoRA.
          </TipBox>
        </>
      );

    default:
      return null;
  }
};

// ── Generic placeholder content (for non-ControlNet services) ────────────────

const renderGenericContent = () => (
  <>
    <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
      <div className="flex items-center gap-2 text-reed-red mb-3">
        <Lock className="w-4 h-4" />
        <span className="text-sm font-semibold">Content Coming Soon</span>
      </div>
      <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
        This content is being prepared and will be available shortly. Check back soon for the full guide.
      </p>
    </div>
  </>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const ServiceContent: React.FC<ServiceContentProps> = ({
  purchaseId,
  serviceId,
  onBack
}) => {
  const service = getServiceById(serviceId);
  const modules = getModulesForService(serviceId);

  const [activeModule, setActiveModule] = useState(modules[0].id);
  const [activeLesson, setActiveLesson] = useState(modules[0].lessons[0].id);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentModule = modules.find(m => m.id === activeModule) || modules[0];
  const currentLesson = currentModule.lessons.find(l => l.id === activeLesson) || currentModule.lessons[0];

  const toggleCompleted = (lessonId: string) => {
    setCompletedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedCount = completedLessons.size;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const renderLessonContent = () => {
    let content: React.ReactNode = null;
    switch (serviceId) {
      case 'workflow-controlnet':
        content = renderControlNetContent(activeLesson);
        break;
      case 'workflow-inpainting':
        content = renderInpaintingContent(activeLesson);
        break;
      case 'workflow-elite':
        content = renderEliteContent(activeLesson);
        break;
      case 'lora-basic':
      case 'lora-advanced':
        content = renderLoraContent(activeLesson, serviceId);
        break;
    }
    if (content) return content;
    return renderGenericContent();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">My Purchases</span>
              </button>
              <div className="h-6 w-px bg-[var(--border-color)]" />
              <h1 className="text-lg font-bold text-[var(--text-primary)]">
                {service?.name || 'Service Content'}
              </h1>
            </div>

            {/* Progress */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-32 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-reed-red rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)] font-medium">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} flex-shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-y-auto transition-all duration-300`}>
          <div className="p-4 space-y-1">
            {modules.map((module) => {
              const moduleCompleted = module.lessons.every(l => completedLessons.has(l.id));

              return (
                <div key={module.id}>
                  <button
                    onClick={() => {
                      setActiveModule(module.id);
                      setActiveLesson(module.lessons[0].id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeModule === module.id
                        ? 'bg-reed-red/10 text-reed-red'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${moduleCompleted ? 'text-green-500' : ''}`}>
                      {moduleCompleted ? <Check className="w-4 h-4" /> : module.icon}
                    </span>
                    <span className="text-sm font-medium">{module.title}</span>
                  </button>

                  {activeModule === module.id && (
                    <div className="ml-7 mt-1 space-y-0.5">
                      {module.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                            activeLesson === lesson.id
                              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          {completedLessons.has(lesson.id) ? (
                            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-[var(--border-color)] flex-shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                          <span className="text-xs text-[var(--text-muted)] ml-auto flex-shrink-0">{lesson.duration}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8">
            {/* Lesson Header */}
            <div className="mb-8">
              <p className="text-xs text-reed-red font-semibold uppercase tracking-wider mb-2">
                {currentModule.title}
              </p>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {currentLesson.title}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Estimated reading time: {currentLesson.duration}
              </p>
            </div>

            {/* Lesson Content */}
            <div className="prose prose-sm max-w-none">
              {renderLessonContent()}
            </div>

            {/* Mark as completed + Navigation */}
            <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex items-center justify-between">
              <button
                onClick={() => toggleCompleted(activeLesson)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  completedLessons.has(activeLesson)
                    ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-green-500 hover:text-green-500'
                }`}
              >
                <Check className="w-4 h-4" />
                {completedLessons.has(activeLesson) ? 'Completed' : 'Mark as Complete'}
              </button>

              <div className="flex items-center gap-2">
                {(() => {
                  const allLessons = modules.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id })));
                  const currentIndex = allLessons.findIndex(l => l.id === activeLesson);
                  const nextLesson = allLessons[currentIndex + 1];
                  if (!nextLesson) return null;
                  return (
                    <button
                      onClick={() => {
                        setActiveModule(nextLesson.moduleId);
                        setActiveLesson(nextLesson.id);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-reed-red text-white text-sm font-medium rounded-lg hover:bg-reed-red-dark transition-colors"
                    >
                      Next Lesson
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceContent;
