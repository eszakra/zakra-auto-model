import React, { useState, useEffect } from 'react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem('ZAKRA_API_KEY');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('ZAKRA_API_KEY', apiKey);
    onSave(apiKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-md border border-zinc-800 bg-black p-1 shadow-2xl">
        <div className="border border-zinc-800 p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <h2 className="text-sm font-bold tracking-widest text-zakra-text uppercase">// SYSTEM_CONFIG</h2>
            <button onClick={onClose} className="text-zakra-grey hover:text-white uppercase text-xs">[CLOSE]</button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zakra-grey uppercase tracking-wider">> API_ENDPOINT_URL</label>
              <input 
                type="text" 
                disabled
                value="https://api.zakra.ai/v1/nano-banana-pro"
                className="w-full bg-zinc-900 border border-zinc-700 p-3 text-xs text-zinc-500 font-mono outline-none cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-zakra-grey uppercase tracking-wider">> API_KEY_OVERRIDE</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ENTER_KEY_MATRIX..."
                className="w-full bg-black border border-zinc-700 p-3 text-xs text-zakra-text font-mono outline-none focus:border-white transition-colors placeholder-zinc-800"
              />
              <p className="text-[10px] text-zinc-600 uppercase">
                * LEAVE EMPTY TO USE ENVIRONMENT VARIABLES.
                <br/>
                * <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-white">BILLING DOCS REFERENCE</a>
              </p>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full border border-zinc-600 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
          >
            [ SAVE_CONFIGURATION ]
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;