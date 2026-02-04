import React, { useState } from 'react';
import { X, Shield, ExternalLink, Loader2, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createCharge, generatePaymentId } from '../services/coinbaseService';
import { ServiceItem } from '../services/servicesData';

interface ServicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem;
  onPaymentInitiated: (serviceId: string) => void;
}

type PaymentStatus = 'idle' | 'creating' | 'redirecting' | 'error';

export const ServicePaymentModal: React.FC<ServicePaymentModalProps> = ({
  isOpen,
  onClose,
  service,
  onPaymentInitiated
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handlePayWithCrypto = async () => {
    if (!user) return;

    setStatus('creating');
    setError(null);

    try {
      const paymentId = generatePaymentId();

      const charge = await createCharge({
        name: `REED ${service.name}`,
        description: `${service.description} - Payment ID: ${paymentId}`,
        amount: service.priceValue,
        currency: 'USD',
        metadata: {
          payment_id: paymentId,
          user_id: user.id,
          purchase_type: 'service',
          service_id: service.id,
          service_name: service.name,
          service_category: service.category,
          amount: service.priceValue.toString(),
        },
        redirectUrl: `${window.location.origin}?payment=success&service=${service.id}`,
        cancelUrl: `${window.location.origin}?payment=cancelled`,
      });

      if (charge) {
        setStatus('redirecting');
        window.open(charge.hosted_url, '_blank');

        setTimeout(() => {
          onClose();
          setStatus('idle');
          onPaymentInitiated(service.id);
        }, 1500);
      } else {
        setError('Failed to create payment. Please try again.');
        setStatus('error');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An error occurred. Please try again.');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-reed-red/10 to-transparent p-6 border-b border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--hover-bg)] transition-colors"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-reed-red/20 flex items-center justify-center">
              <Shield className="text-reed-red" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Secure Payment</h2>
              <p className="text-sm text-[var(--text-muted)]">Powered by Coinbase Commerce</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">

          {/* Service Info */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <p className="text-xs text-reed-red font-semibold uppercase tracking-wider mb-1">
                  {service.category === 'workflow' ? 'SDXL Workflow' : service.category === 'lora' ? 'Custom LoRA' : 'Package'}
                </p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{service.name}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">{service.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-reed-red">{service.price}</p>
                <p className="text-xs text-[var(--text-muted)]">one-time</p>
              </div>
            </div>
          </div>

          {/* Crypto Options */}
          <div className="mb-6">
            <p className="text-sm text-[var(--text-muted)] mb-3">Accepted cryptocurrencies:</p>
            <div className="flex flex-wrap gap-2">
              {['BTC', 'ETH', 'USDC', 'USDT', 'DOGE', 'LTC'].map((coin) => (
                <span
                  key={coin}
                  className="px-3 py-1.5 bg-[var(--bg-secondary)] rounded-full text-xs font-medium text-[var(--text-secondary)]"
                >
                  {coin}
                </span>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {status === 'error' && error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={handlePayWithCrypto}
            disabled={status === 'creating' || status === 'redirecting'}
            className="w-full py-4 bg-[#0052FF] hover:bg-[#0040CC] text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'creating' ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating payment...
              </>
            ) : status === 'redirecting' ? (
              <>
                <ExternalLink size={20} />
                Opening Coinbase...
              </>
            ) : (
              <>
                <Coins size={20} />
                Pay {service.price} with Crypto
              </>
            )}
          </button>

          {/* Trust Badges */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
              <Shield size={16} className="mx-auto mb-1 text-green-500" />
              <span className="text-[var(--text-muted)]">Secure</span>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
              <Coins size={16} className="mx-auto mb-1 text-[#0052FF]" />
              <span className="text-[var(--text-muted)]">Multi-crypto</span>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
              <CheckCircle2 size={16} className="mx-auto mb-1 text-reed-red" />
              <span className="text-[var(--text-muted)]">Guaranteed</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-center text-[var(--text-muted)]">
            You'll be redirected to Coinbase Commerce to complete your payment securely.
            {service.category === 'lora' && ' After payment, you\'ll be asked to upload reference photos.'}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Shield size={12} />
              Coinbase protected
            </span>
            <span>•</span>
            <span>14-day guarantee</span>
            <span>•</span>
            <a href="mailto:support@reed.ai" className="hover:text-reed-red transition-colors">Need help?</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePaymentModal;
