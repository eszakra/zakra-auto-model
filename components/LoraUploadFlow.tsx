import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Upload, X, Image, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { getServiceById } from '../services/servicesData';

interface LoraUploadFlowProps {
  purchaseId: string;
  serviceId: string;
  onBack: () => void;
  onComplete: () => void;
}

type Step = 'instructions' | 'upload' | 'confirm';

export const LoraUploadFlow: React.FC<LoraUploadFlowProps> = ({
  purchaseId,
  serviceId,
  onBack,
  onComplete
}) => {
  const { user } = useAuth();
  const service = getServiceById(serviceId);
  const [step, setStep] = useState<Step>('instructions');
  const [modelName, setModelName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    setFiles(prev => [...prev, ...imageFiles]);

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (droppedFiles.length === 0) return;

    setFiles(prev => [...prev, ...droppedFiles]);

    droppedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${purchaseId}/photo_${i + 1}.${ext}`;

        const { error } = await supabase.storage
          .from('lora-uploads')
          .upload(path, file, {
            contentType: file.type,
            upsert: true
          });

        if (error) {
          console.error('Upload error:', error);
          throw new Error(`Failed to upload photo ${i + 1}: ${error.message}`);
        }
      }

      // Update the purchase record with model name and photo count
      const { error: updateError } = await supabase
        .from('service_purchases')
        .update({
          photos_uploaded: true,
          metadata: { model_name: modelName.trim(), photo_count: files.length },
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
      }

      onComplete();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload photos. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Upload Reference Photos
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {service?.name || 'LoRA Training'} — Provide photos for your custom LoRA
          </p>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mt-6">
            {(['instructions', 'upload', 'confirm'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 ${step === s ? 'text-reed-red' : s === 'instructions' && step !== 'instructions' ? 'text-green-500' : s === 'upload' && step === 'confirm' ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    step === s ? 'border-reed-red bg-reed-red/10' :
                    (s === 'instructions' && step !== 'instructions') || (s === 'upload' && step === 'confirm') ? 'border-green-500 bg-green-500/10' :
                    'border-[var(--border-color)]'
                  }`}>
                    {(s === 'instructions' && step !== 'instructions') || (s === 'upload' && step === 'confirm')
                      ? <CheckCircle className="w-4 h-4" />
                      : i + 1
                    }
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">
                    {s === 'instructions' ? 'Instructions' : s === 'upload' ? 'Upload' : 'Confirm'}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-[var(--border-color)]" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Step 1: Instructions */}
        {step === 'instructions' && (
          <div>
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Photo Guidelines</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-reed-red/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-reed-red">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">At least 2 high-quality photos (required)</p>
                    <p className="text-sm text-[var(--text-muted)]">We need at least one clear face photo and one body photo of the model. Well-lit, no filters, no blur.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-reed-red/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-reed-red">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Face photos — clear and detailed</p>
                    <p className="text-sm text-[var(--text-muted)]">Front-facing, side profile, and 3/4 angle shots. The clearer the face, the better the likeness.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-reed-red/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-reed-red">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Body photos — different poses</p>
                    <p className="text-sm text-[var(--text-muted)]">Full body or half body shots showing proportions, style, and different angles. This helps recreate the model accurately.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-reed-red/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-reed-red">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Same person in all photos</p>
                    <p className="text-sm text-[var(--text-muted)]">All photos must be of the same model. The more variety (expressions, poses, outfits), the better the LoRA will perform.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold">Minimum 2 photos required</span> (1 face + 1 body). For best results, we recommend 10-20 high-quality photos with variety.
                The more you provide, the better the LoRA will perform.
              </p>
            </div>

            {/* Model Name */}
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 mb-8">
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Model Name <span className="text-reed-red">*</span>
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. Sofia, Emma, Alex..."
                className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red transition-colors bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Enter the name of the person in the photos. We'll use this to set up the trigger word for your LoRA.
              </p>
            </div>

            <button
              onClick={() => setStep('upload')}
              disabled={!modelName.trim()}
              className="w-full py-3 bg-reed-red text-white font-semibold rounded-xl hover:bg-reed-red-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Upload
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === 'upload' && (
          <div>
            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-color)] hover:border-reed-red rounded-xl p-8 text-center cursor-pointer transition-colors mb-6"
            >
              <Upload className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-primary)] font-medium mb-1">
                Drop photos here or click to browse
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Supports JPG, PNG, WebP
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Preview grid */}
            {previews.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {files.length} photo{files.length !== 1 ? 's' : ''} selected
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-reed-red font-medium hover:underline"
                  >
                    Add more
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--border-color)]">
                      <img
                        src={preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('instructions')}
                className="flex-1 py-3 border-2 border-[var(--border-color)] text-[var(--text-primary)] font-semibold rounded-xl hover:border-[var(--text-muted)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={files.length < 2}
                className="flex-1 py-3 bg-reed-red text-white font-semibold rounded-xl hover:bg-reed-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Review & Submit
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div>
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Upload Summary</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Service:</span>
                  <span className="font-medium text-[var(--text-primary)]">{service?.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Model Name:</span>
                  <span className="font-medium text-[var(--text-primary)]">{modelName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Photos:</span>
                  <span className="font-medium text-[var(--text-primary)]">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {previews.slice(0, 8).map((preview, index) => (
                  <div key={index} className="w-14 h-14 rounded-lg overflow-hidden border border-[var(--border-color)] flex-shrink-0">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {previews.length > 8 && (
                  <div className="w-14 h-14 rounded-lg border border-[var(--border-color)] flex-shrink-0 flex items-center justify-center bg-[var(--bg-secondary)]">
                    <span className="text-xs text-[var(--text-muted)]">+{previews.length - 8}</span>
                  </div>
                )}
              </div>
            </div>

            {uploadError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
                <p className="text-sm text-red-500">{uploadError}</p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl mb-6">
              <Image className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--text-secondary)]">
                Once submitted, our team will start training your LoRA.
                You'll be notified when it's ready. Typical delivery: 24-48 hours.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('upload')}
                disabled={uploading}
                className="flex-1 py-3 border-2 border-[var(--border-color)] text-[var(--text-primary)] font-semibold rounded-xl hover:border-[var(--text-muted)] transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="flex-1 py-3 bg-reed-red text-white font-semibold rounded-xl hover:bg-reed-red-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Submit Photos
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoraUploadFlow;
