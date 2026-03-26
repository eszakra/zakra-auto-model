import { supabase } from './supabaseClient';

const SUPABASE_URL = 'https://obtuhkszoudwypklhvyq.supabase.co';
const TEMPLATES_BASE = `${SUPABASE_URL}/storage/v1/object/public/templates`;

// Maps serviceId to template workflow file(s)
const WORKFLOW_TEMPLATES: Record<string, string[]> = {
  'workflow-controlnet': ['workflows/REED_ControlNet_v1.json'],
  'workflow-inpainting': ['workflows/REED_Inpainting_v1.json'],
  'workflow-elite': ['workflows/REED_ControlNet_v1.json', 'workflows/REED_Inpainting_v1.json'],
};

// Maps serviceId to installer script
const SCRIPT_TEMPLATES: Record<string, string> = {
  'workflow-controlnet': 'scripts/reed_installer_controlnet.sh',
  'workflow-inpainting': 'scripts/reed_installer_inpainting.sh',
  'workflow-elite': 'scripts/reed_installer_controlnet.sh',
};

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function getPersonalizedFilename(templatePath: string, fullName: string): string {
  // "workflows/REED_ControlNet_v1.json" → "REED_ControlNet_Santiago_Gaviria.json"
  const baseName = templatePath.split('/').pop()!.replace('.json', '');
  const cleanName = sanitizeName(fullName);
  return `${baseName}_${cleanName}.json`;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function fetchAndDownload(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  triggerDownload(blobUrl, filename);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

export async function downloadPersonalizedWorkflow(
  userId: string,
  userEmail: string,
  userFullName: string,
  purchaseId: string,
  serviceId: string
): Promise<void> {
  const templates = WORKFLOW_TEMPLATES[serviceId];
  if (!templates) throw new Error('Unknown service');

  for (const templatePath of templates) {
    const filename = getPersonalizedFilename(templatePath, userFullName);
    const storagePath = `${userId}/workflows/${filename}`;

    // Check if personalized copy already exists
    const { data: existing } = await supabase.storage
      .from('purchases')
      .list(`${userId}/workflows`, { search: filename });

    const alreadyExists = existing && existing.some(f => f.name === filename);

    if (!alreadyExists) {
      // Fetch the base template
      const templateUrl = `${TEMPLATES_BASE}/${templatePath}`;
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error(`Failed to fetch template: ${response.status}`);

      const workflowJson = await response.json();

      // Inject watermark
      workflowJson._reed_license = {
        owner: userFullName,
        email: userEmail,
        purchase_id: purchaseId,
        issued_at: new Date().toISOString(),
        license: 'Personal use only. Redistribution is strictly prohibited and may result in account termination.',
      };

      // Upload personalized copy to private bucket
      const blob = new Blob([JSON.stringify(workflowJson, null, 2)], { type: 'application/json' });
      const { error: uploadError } = await supabase.storage
        .from('purchases')
        .upload(storagePath, blob, { contentType: 'application/json', upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Generate signed URL (1 hour expiry) with download option
    const { data: signedData, error: signError } = await supabase.storage
      .from('purchases')
      .createSignedUrl(storagePath, 3600, { download: filename });

    if (signError || !signedData?.signedUrl) {
      throw new Error(`Failed to generate download link: ${signError?.message}`);
    }

    triggerDownload(signedData.signedUrl, filename);
  }
}

export async function downloadScript(serviceId: string): Promise<void> {
  const scriptPath = SCRIPT_TEMPLATES[serviceId];
  if (!scriptPath) throw new Error('Unknown service');

  const scriptUrl = `${TEMPLATES_BASE}/${scriptPath}`;
  const filename = scriptPath.split('/').pop()!;
  await fetchAndDownload(scriptUrl, filename);
}
