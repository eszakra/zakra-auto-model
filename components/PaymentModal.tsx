import React, { useState } from 'react';
import { X, Shield, ExternalLink, Loader2, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createCharge, generatePaymentId } from '../services/coinbaseService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    id: string;
    name: string;
    price: number;
    credits: number;
  };
  onPaymentComplete?: () => void;
}

type PaymentStatus = 'idle' | 'creating' | 'redirecting' | 'error';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  onPaymentComplete
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
        name: `REED ${plan.name} Plan`,
        description: `${plan.credits.toLocaleString()} credits per month - Payment ID: ${paymentId}`,
        amount: plan.price,
        currency: 'USD',
        metadata: {
          payment_id: paymentId,
          user_id: user.id,
          plan_id: plan.id,
          plan_name: plan.name,
          credits: plan.credits.toString(),
        },
        redirectUrl: `${window.location.origin}?payment=success&plan=${plan.id}`,
        cancelUrl: `${window.location.origin}?payment=cancelled`,
      });

      if (charge) {
        setStatus('redirecting');
        // Open Coinbase Commerce checkout in new tab
        window.open(charge.hosted_url, '_blank');

        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          setStatus('idle');
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

          {/* Plan Info */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Plan</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{plan.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--text-muted)]">Amount</p>
                <p className="text-2xl font-bold text-reed-red">${plan.price}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Credits included</span>
              <span className="text-[var(--text-primary)] font-medium">
                {plan.credits.toLocaleString()}/month
              </span>
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
                Pay with Crypto
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
              <span className="text-[var(--text-muted)]">Instant</span>
            </div>
          </div>

          {/* Info text */}
          <p className="mt-4 text-xs text-center text-[var(--text-muted)]">
            You'll be redirected to Coinbase Commerce to complete your payment securely.
            Credits will be added automatically after confirmation.
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
            <span>Instant confirmation</span>
            <span>•</span>
            <a href="mailto:support@reed.ai" className="hover:text-reed-red transition-colors">Need help?</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
