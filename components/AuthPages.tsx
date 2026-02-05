import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface AuthPageProps {
  onClose: () => void;
  onSwitch: () => void;
  onSuccess?: () => void;
}

// Translate Supabase auth errors to user-friendly messages
function getLoginErrorMessage(error: any): { message: string; type: 'error' | 'warning' | 'info' } {
  const msg = error?.message?.toLowerCase() || '';

  if (msg.includes('email not confirmed')) {
    return {
      message: 'Your email has not been verified yet. Please check your inbox (and spam folder) for the verification link we sent you.',
      type: 'warning'
    };
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return {
      message: 'Incorrect email or password. Please try again.',
      type: 'error'
    };
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return {
      message: 'Too many login attempts. Please wait a few minutes before trying again.',
      type: 'warning'
    };
  }
  if (msg.includes('user not found')) {
    return {
      message: 'No account found with this email. Please sign up first.',
      type: 'error'
    };
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return {
      message: 'Connection error. Please check your internet and try again.',
      type: 'error'
    };
  }

  return { message: error?.message || 'An error occurred. Please try again.', type: 'error' };
}

function getRegisterErrorMessage(error: any): string {
  const msg = error?.message?.toLowerCase() || '';

  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'This email is already registered. Please sign in instead.';
  }
  if (msg.includes('password') && msg.includes('least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.includes('valid email') || msg.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }

  return error?.message || 'Error creating account. Please try again.';
}

// Alert component with different styles
const AuthAlert: React.FC<{ message: string; type: 'error' | 'warning' | 'info' }> = ({ message, type }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-[#a11008] dark:bg-red-950/30 dark:border-red-800 dark:text-red-400',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400',
  };
  const icons = {
    error: <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
    warning: <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />,
  };

  return (
    <div className={`p-3 border rounded-lg text-sm flex items-start gap-2 ${styles[type]}`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
};

export const LoginPage: React.FC<AuthPageProps> = ({ onClose, onSwitch, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: 'error' | 'warning' | 'info' } | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    setResendSuccess(false);

    const result = await signIn(email, password);
    
    if (result.error) {
      const errorInfo = getLoginErrorMessage(result.error);
      setAlert(errorInfo);
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
    if (!email) {
      setAlert({ message: 'Please enter your email address first.', type: 'warning' });
      return;
    }
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) {
        setAlert({ message: 'Could not resend verification email. Please try again later.', type: 'error' });
      } else {
        setResendSuccess(true);
        setAlert({ message: 'Verification email sent! Please check your inbox and spam folder.', type: 'info' });
      }
    } catch {
      setAlert({ message: 'Could not resend verification email.', type: 'error' });
    }
    setResendingEmail(false);
  };

  const isEmailNotConfirmed = alert?.message?.includes('verified') || alert?.message?.includes('verification');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-reed-red p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-6 w-auto brightness-0 invert" />
              <span className="font-bold text-lg">REED</span>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white"><span className="text-2xl">&times;</span></button>
          </div>
          <h2 className="text-2xl font-bold mt-4">Welcome Back</h2>
          <p className="text-white/80 text-sm">Sign in to continue generating</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {alert && <AuthAlert message={alert.message} type={alert.type} />}

          {/* Show resend verification button when email not confirmed */}
          {isEmailNotConfirmed && !resendSuccess && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="w-full py-2 text-sm font-medium text-reed-red border border-reed-red rounded-lg hover:bg-reed-red/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resendingEmail ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Mail className="w-4 h-4" /> Resend Verification Email</>
              )}
            </button>
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

    const result = await signUp(email, password, fullName);
    
    if (result.error) {
      setError(getRegisterErrorMessage(result.error));
      setLoading(false);
    } else {
      // Check if Supabase returned a "fake" success for duplicate email
      // When email confirmation is enabled, Supabase returns a user with empty identities
      // for already-registered emails (to prevent email enumeration)
      // We detect this by trying to check the user data
      const { data } = await supabase.auth.getSession();
      
      // If there's no session after signup, it could mean:
      // 1. Email needs verification (normal) - show success
      // 2. Email already exists (Supabase fake success) - we can't easily tell
      // So we check user_profiles to see if this email already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (existingProfile && !data.session) {
        // Email already registered - the signup was a no-op
        setError('This email is already registered. Please sign in instead, or check your inbox for the verification email.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Check Your Email</h2>
          <p className="text-[var(--text-secondary)] mb-2">
            We sent a verification link to:
          </p>
          <p className="text-[var(--text-primary)] font-semibold mb-4">{email}</p>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6 text-left">
            <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Important:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>Check your <strong>spam/junk folder</strong> if you don't see it</li>
                  <li>Click the link in the email to activate your account</li>
                  <li>You'll receive <strong>3 free credits</strong> once verified</li>
                </ul>
              </div>
            </div>
          </div>
          <button
            onClick={onSwitch}
            className="w-full py-3 bg-reed-red text-white font-semibold rounded-lg hover:bg-reed-red-dark transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-reed-red p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-6 w-auto brightness-0 invert" />
              <span className="font-bold text-lg">REED</span>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white"><span className="text-2xl">&times;</span></button>
          </div>
          <h2 className="text-2xl font-bold mt-4">Create Account</h2>
          <p className="text-white/80 text-sm">Start with 3 free credits</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <AuthAlert message={error} type="error" />}

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
