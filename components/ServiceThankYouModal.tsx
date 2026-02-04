import React from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { ServiceItem } from '../services/servicesData';

interface ServiceThankYouModalProps {
  isOpen: boolean;
  service: ServiceItem;
  onClose: () => void;
  onGoToUpload: () => void;
  onGoToPurchases: () => void;
}

export const ServiceThankYouModal: React.FC<ServiceThankYouModalProps> = ({
  isOpen,
  service,
  onClose,
  onGoToUpload,
  onGoToPurchases
}) => {
  if (!isOpen) return null;

  const isLora = service.category === 'lora' || service.category === 'package';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Red header strip */}
        <div className="bg-reed-red px-8 py-5">
          <div className="flex items-center gap-3">
            <ExternalLink className="w-5 h-5 text-white/80" />
            <div>
              <h2 className="text-lg font-bold text-white">Payment Opened</h2>
              <p className="text-sm text-white/70">Complete your payment in the Coinbase window</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Order summary */}
          <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl mb-6">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                {service.category === 'workflow' ? 'Workflow' : service.category === 'lora' ? 'LoRA' : 'Package'}
              </p>
              <p className="font-semibold text-[var(--text-primary)]">{service.name}</p>
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)]">{service.price}</p>
          </div>

          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
            {isLora
              ? 'Once confirmed, you\'ll upload at least 2 reference photos (face + body) of your model so we can start training.'
              : 'Once confirmed, your files will be prepared and available in My Purchases.'
            }
          </p>

          {/* Subtle note */}
          <p className="text-xs text-[var(--text-muted)] mb-6">
            Your order activates automatically after Coinbase confirms the transaction.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={isLora ? onGoToUpload : onGoToPurchases}
              className="w-full py-3 bg-reed-red text-white font-semibold rounded-xl hover:bg-reed-red-dark transition-colors flex items-center justify-center gap-2"
            >
              My Purchases
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 border border-[var(--border-color)] text-[var(--text-secondary)] font-medium rounded-xl hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceThankYouModal;
