import { motion } from 'framer-motion';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/shared/PageShell';
import { APP_NAME } from '../lib/constants';
import { useAppContext } from '../context/AppContext';
import { requestAccess } from '../lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAppContext();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSyncingLogin, setIsSyncingLogin] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSyncingLogin(true);

    const result =
      mode === 'login'
        ? await login(email, password)
        : await requestAccess({
            username: username.trim(),
            email: email.trim(),
            password,
          });

    if (result.success) {
      if (mode === 'login') {
        navigate('/dashboard', { replace: true });
        return;
      }

      setIsSyncingLogin(false);
      setSuccessMessage(
        result.status === 'approved'
          ? 'Your access has already been approved.'
          : "Access requested. You'll receive an email once approved.",
      );
      return;
    }

    setIsSyncingLogin(false);
    setError(result.message);
    setShakeKey((currentKey) => currentKey + 1);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-90" />

      <PageShell className="relative z-10 max-w-md">
        <motion.div
          key={shakeKey}
          animate={
            error
              ? { x: [0, -10, 10, -8, 8, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.35 }}
          className="glass-card p-6 sm:p-8"
        >
          <div className="nav-pill w-fit">Encrypted device ledger</div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white">
            {APP_NAME}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {mode === 'login'
              ? 'Sign in with your email and password to open your personal udhar dashboard.'
              : 'Request access to your personal udhar dashboard.'}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {mode === 'request' ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Username
                </span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="input-field pl-11"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Email
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input-field pl-11"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input-field pl-11 pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((currentValue) => !currentValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            {isSyncingLogin ? (
              <div className="flex items-center gap-2 rounded-2xl border border-electric-500/20 bg-electric-500/10 px-4 py-3 text-sm text-electric-200">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {mode === 'login' ? 'Syncing your data...' : 'Submitting request...'}
              </div>
            ) : null}

            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {successMessage ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSyncingLogin}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSyncingLogin
                ? mode === 'login'
                  ? 'Syncing...'
                  : 'Requesting...'
                : mode === 'login'
                  ? 'Login'
                  : 'Request Access'}
            </button>

            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => {
                setMode((currentMode) =>
                  currentMode === 'login' ? 'request' : 'login',
                );
                setError('');
                setSuccessMessage('');
              }}
            >
              {mode === 'login' ? 'Request access' : 'Back to Login'}
            </button>
          </form>
        </motion.div>
      </PageShell>
    </div>
  );
}
