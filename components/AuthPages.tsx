import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface AuthPageProps {
  onClose: () => void;
  onSwitch: () => void;
  onSuccess?: () => void;
}

// Translate Supabase auth errors to user-friendly messages
function getLoginErrorMessage(error: any): string {
  const msg = error?.message?.toLowerCase() || '';

  if (msg.includes('email not confirmed')) {
    return 'EMAIL_NOT_VERIFIED';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'The email or password you entered is incorrect.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('user not found')) {
    return 'No account found with this email.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}

function getRegisterErrorMessage(error: any): string {
  const msg = error?.message?.toLowerCase() || '';

  if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already registered')) {
    return 'This email is already registered. Please sign in instead.';
  }
  if (msg.includes('password') && msg.includes('least')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('valid email') || msg.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}

export const LoginPage: React.FC<AuthPageProps> = ({ onClose, onSwitch, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowVerificationMessage(false);
    setResendDone(false);

    const result = await signIn(email, password);
    
    if (result.error) {
      const msg = getLoginErrorMessage(result.error);
      if (msg === 'EMAIL_NOT_VERIFIED') {
        setShowVerificationMessage(true);
      } else {
        setError(msg);
      }
      setLoading(false);
    } else {
      setLoading(false);
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setResending(true);
    try {
      await supabase.auth.resend({ type: 'signup', email });
      setResendDone(true);
    } catch {
      // Silent fail
    }
    setResending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
        {/* Header */}
        <div className="bg-reed-red p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-6 w-auto brightness-0 invert" />
              <span className="font-bold text-lg">REED</span>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
          </div>
          <h2 className="text-2xl font-bold mt-4">Welcome Back</h2>
          <p className="text-white/80 text-sm">Sign in to continue generating</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-500">{error}</span>
            </div>
          )}

          {/* Email not verified state */}
          {showVerificationMessage && (
            <div className="rounded-lg border border-[var(--border-color)] overflow-hidden">
              <div className="p-4 bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-reed-red" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Email verification required</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  We sent a verification link to <span className="text-[var(--text-primary)] font-medium">{email}</span>. 
                  Please check your inbox and spam folder, then click the link to activate your account.
                </p>
              </div>
              <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
                {resendDone ? (
                  <div className="flex items-center gap-2 text-xs text-green-500">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verification email sent!</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="flex items-center gap-2 text-xs text-reed-red hover:text-reed-red-dark transition-colors disabled:opacity-50"
                  >
                    {resending ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5" /> Resend verification email</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red transition-colors bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red transition-colors bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-reed-red text-white font-semibold rounded-lg hover:bg-reed-red-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
            ) : (
              <>Sign In <ArrowRight className="w-5 h-5" /></>
            )}
          </button>

          <div className="text-center text-sm text-[var(--text-secondary)]">
            Don't have an account?{' '}
            <button type="button" onClick={onSwitch} className="text-reed-red font-semibold hover:underline">
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Generate a device fingerprint (no external library needed)
function getDeviceFingerprint(): string {
  const components = [
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.hardwareConcurrency || 0,
    navigator.maxTouchPoints || 0,
    navigator.platform || '',
    // Canvas fingerprint
    (() => {
      try {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        if (!ctx) return '';
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fp', 2, 2);
        return c.toDataURL().slice(-50);
      } catch { return ''; }
    })(),
  ];
  // Simple hash
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

async function checkSignupAllowed(fingerprint: string): Promise<{ allowed: boolean; message?: string }> {
  try {
    const res = await fetch('/.netlify/functions/signup-guard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check', fingerprint }),
    });
    if (!res.ok) return { allowed: true }; // On error, don't block
    return await res.json();
  } catch {
    return { allowed: true }; // On network error, don't block
  }
}

async function logSignupAttempt(fingerprint: string, email: string): Promise<void> {
  try {
    await fetch('/.netlify/functions/signup-guard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log', fingerprint, email }),
    });
  } catch {
    // Silent fail
  }
}

export const RegisterPage: React.FC<AuthPageProps> = ({ onClose, onSwitch }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    // Step 1: Check rate limit (IP + fingerprint)
    const fingerprint = getDeviceFingerprint();
    const guard = await checkSignupAllowed(fingerprint);
    
    if (!guard.allowed) {
      setError(guard.message || 'Too many accounts created. Please try again later.');
      setLoading(false);
      return;
    }

    // Step 2: Attempt signup
    const result = await signUp(email, password, fullName);
    
    if (result.error) {
      setError(getRegisterErrorMessage(result.error));
      setLoading(false);
    } else {
      // Step 3: Log successful signup attempt
      await logSignupAttempt(fingerprint, email);
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
          {/* Success Header */}
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Check Your Email</h2>
            <p className="text-sm text-[var(--text-muted)]">
              We sent a verification link to
            </p>
            <p className="text-sm text-[var(--text-primary)] font-semibold mt-1">{email}</p>
          </div>

          {/* Instructions */}
          <div className="px-8 pb-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-[var(--text-muted)]">1</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Open the email and click the verification link</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-[var(--text-muted)]">2</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Check your spam folder if you don't see it</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-[var(--text-muted)]">3</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Come back and sign in to get your <span className="font-semibold text-[var(--text-primary)]">3 free credits</span></p>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="p-8 pt-4">
            <button
              onClick={onSwitch}
              className="w-full py-3 bg-reed-red text-white font-semibold rounded-lg hover:bg-reed-red-dark transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
        {/* Header */}
        <div className="bg-reed-red p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-6 w-auto brightness-0 invert" />
              <span className="font-bold text-lg">REED</span>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
          </div>
          <h2 className="text-2xl font-bold mt-4">Create Account</h2>
          <p className="text-white/80 text-sm">Start with 3 free credits</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-500">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red transition-colors bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red transition-colors bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red transition-colors bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red transition-colors bg-[var(--bg-primary)] text-[var(--text-primary)]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-reed-red text-white font-semibold rounded-lg hover:bg-reed-red-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Creating account...</>
            ) : (
              <>Create Account <ArrowRight className="w-5 h-5" /></>
            )}
          </button>

          <div className="text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <button type="button" onClick={onSwitch} className="text-reed-red font-semibold hover:underline">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
