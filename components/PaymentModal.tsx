import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Copy, Check, Clock, Shield, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  createPayment,
  verifyPayment,
  confirmPayment,
  Payment,
  generatePaymentId
} from '../services/paymentService';

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

type PaymentStatus = 'pending' | 'waiting' | 'confirming' | 'confirmed' | 'expired' | 'error';

const WALLET_ADDRESS = 'TW4e2GLCRnwyBrpYE55CGgqNhifWNn1MAL';
const PAYMENT_EXPIRY_MINUTES = 30;
const POLLING_INTERVAL_MS = 30000; // Poll blockchain every 30 seconds

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  onPaymentComplete
}) => {
  const { user } = useAuth();
  const [paymentId, setPaymentId] = useState<string>('');
  const [paymentRecord, setPaymentRecord] = useState<Payment | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [copied, setCopied] = useState<'address' | 'amount' | 'memo' | null>(null);
  const [timeLeft, setTimeLeft] = useState(PAYMENT_EXPIRY_MINUTES * 60);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize payment when modal opens
  const initializePayment = useCallback(async () => {
    if (!user) return;

    try {
      const id = generatePaymentId();
      setPaymentId(id);

      // Create payment record in database
      const payment = await createPayment(user.id, plan.id, plan.price);

      if (payment) {
        setPaymentRecord(payment);
        setStatus('waiting');
        setTimeLeft(PAYMENT_EXPIRY_MINUTES * 60);
      } else {
        setError('Failed to create payment. Please try again.');
        setStatus('error');
      }
    } catch (err) {
      console.error('Error initializing payment:', err);
      setError('Failed to initialize payment. Please try again.');
      setStatus('error');
    }
  }, [user, plan]);

  // Generate unique payment ID and create record when modal opens
  useEffect(() => {
    if (isOpen && !paymentId && user) {
      initializePayment();
    }
  }, [isOpen, paymentId, user, initializePayment]);

  // Countdown timer
  useEffect(() => {
    if (status !== 'waiting' && status !== 'confirming') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Poll blockchain for payment verification
  useEffect(() => {
    if (status !== 'waiting' || !paymentRecord) return;

    const pollPayment = async () => {
      try {
        const result = await verifyPayment(paymentRecord);

        if (result.verified && result.txHash) {
          setStatus('confirming');
          setTxHash(result.txHash);

          // Confirm payment and update user profile
          const confirmed = await confirmPayment(paymentRecord.id, result.txHash);

          if (confirmed) {
            setStatus('confirmed');
            onPaymentComplete?.();
          } else {
            setError('Payment verification failed. Please contact support.');
            setStatus('error');
          }
        }
      } catch (err) {
        console.error('Error polling payment:', err);
      }
    };

    // Initial check
    pollPayment();

    // Set up polling interval
    pollingRef.current = setInterval(pollPayment, POLLING_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [status, paymentRecord, onPaymentComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: 'address' | 'amount' | 'memo') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Reset payment for retry
  const resetPayment = useCallback(() => {
    setPaymentId('');
    setPaymentRecord(null);
    setStatus('pending');
    setTxHash(null);
    setError(null);
    setTimeLeft(PAYMENT_EXPIRY_MINUTES * 60);

    // Re-initialize payment
    if (user) {
      initializePayment();
    }
  }, [user, initializePayment]);

  // Simulate payment detection (development only)
  const simulatePaymentDetection = () => {
    setStatus('confirming');
    setTimeout(() => {
      setStatus('confirmed');
      setTxHash('a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456');
      onPaymentComplete?.();
    }, 3000);
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
              <p className="text-sm text-[var(--text-muted)]">USDT (TRC-20 Network)</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">

          {/* Status: Waiting for Payment */}
          {(status === 'waiting' || status === 'confirming') && (
            <>
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
                  <span className="text-[var(--text-primary)] font-medium">{plan.credits.toLocaleString()}/month</span>
                </div>
              </div>

              {/* Payment ID */}
              <div className="mb-6">
                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2 block">
                  Payment ID (include in memo)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-4 py-3 font-mono text-lg text-center text-reed-red font-bold tracking-wider">
                    {paymentId}
                  </div>
                  <button
                    onClick={() => copyToClipboard(paymentId, 'memo')}
                    className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                  >
                    {copied === 'memo' ? <Check size={20} className="text-green-500" /> : <Copy size={20} className="text-[var(--text-muted)]" />}
                  </button>
                </div>
                <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Required: Add this ID in the transaction memo/note
                </p>
              </div>

              {/* QR Code & Wallet */}
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
                <div className="flex gap-4">
                  {/* QR Code */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white rounded-lg p-2 flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${WALLET_ADDRESS}`}
                        alt="Wallet QR Code"
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Wallet Info */}
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                      Send exactly
                    </label>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl font-bold text-[var(--text-primary)]">{plan.price} USDT</span>
                      <button
                        onClick={() => copyToClipboard(plan.price.toString(), 'amount')}
                        className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors"
                      >
                        {copied === 'amount' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                      </button>
                    </div>

                    <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                      To wallet (TRC-20)
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-[var(--text-secondary)] break-all bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                        {WALLET_ADDRESS.slice(0, 12)}...{WALLET_ADDRESS.slice(-8)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(WALLET_ADDRESS, 'address')}
                        className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors flex-shrink-0"
                      >
                        {copied === 'address' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {status === 'confirming' ? (
                      <Loader2 size={18} className="text-amber-500 animate-spin" />
                    ) : (
                      <Clock size={18} className="text-[var(--text-muted)]" />
                    )}
                    <span className="text-sm text-[var(--text-secondary)]">
                      {status === 'confirming' ? 'Confirming payment...' : 'Waiting for payment...'}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-[var(--text-muted)]">
                    {formatTime(timeLeft)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${status === 'confirming' ? 'bg-amber-500 animate-pulse' : 'bg-reed-red'}`}
                    style={{ width: `${(timeLeft / (PAYMENT_EXPIRY_MINUTES * 60)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
                  <Shield size={16} className="mx-auto mb-1 text-green-500" />
                  <span className="text-[var(--text-muted)]">Secure</span>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
                  <Clock size={16} className="mx-auto mb-1 text-blue-500" />
                  <span className="text-[var(--text-muted)]">Auto-detect</span>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
                  <CheckCircle2 size={16} className="mx-auto mb-1 text-reed-red" />
                  <span className="text-[var(--text-muted)]">Guaranteed</span>
                </div>
              </div>

              {/* Dev: Simulate button - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={simulatePaymentDetection}
                  className="mt-4 w-full py-2 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)]"
                >
                  [DEV] Simulate Payment Detection
                </button>
              )}
            </>
          )}

          {/* Status: Confirmed */}
          {status === 'confirmed' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Payment Confirmed!</h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Your {plan.name} plan is now active
              </p>

              {txHash && (
                <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 text-left">
                  <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                    Transaction Hash
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-[var(--text-secondary)] break-all">
                      {txHash.slice(0, 20)}...{txHash.slice(-20)}
                    </code>
                    <a
                      href={`https://tronscan.org/#/transaction/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors flex-shrink-0"
                    >
                      <ExternalLink size={14} className="text-[var(--text-muted)]" />
                    </a>
                  </div>
                </div>
              )}

              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Credits added</span>
                  <span className="text-green-500 font-bold">+{plan.credits.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-reed-red text-white rounded-xl font-semibold hover:bg-reed-red-light transition-colors"
              >
                Start Generating
              </button>
            </div>
          )}

          {/* Status: Expired */}
          {status === 'expired' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-4">
                <Clock size={40} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Session Expired</h3>
              <p className="text-[var(--text-secondary)] mb-6">
                The payment window has expired. Please try again.
              </p>
              <button
                onClick={resetPayment}
                className="w-full py-3 bg-reed-red text-white rounded-xl font-semibold hover:bg-reed-red-light transition-colors"
              >
                Start New Payment
              </button>
            </div>
          )}

          {/* Status: Error */}
          {status === 'error' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={40} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Payment Error</h3>
              <p className="text-[var(--text-secondary)] mb-6">
                {error || 'An error occurred. Please try again.'}
              </p>
              <button
                onClick={resetPayment}
                className="w-full py-3 bg-reed-red text-white rounded-xl font-semibold hover:bg-reed-red-light transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Shield size={12} />
              Blockchain verified
            </span>
            <span>•</span>
            <span>24h guarantee</span>
            <span>•</span>
            <a href="#" className="hover:text-reed-red transition-colors">Need help?</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
