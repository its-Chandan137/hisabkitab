import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, Trash2, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';

const toneConfig = {
  success: {
    icon: CheckCircle2,
    accent: 'text-success',
    ring: 'border-success/25',
  },
  danger: {
    icon: Trash2,
    accent: 'text-danger',
    ring: 'border-danger/25',
  },
  info: {
    icon: Info,
    accent: 'text-electric-300',
    ring: 'border-electric-500/25',
  },
};

export default function ToastViewport() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(92vw,24rem)] flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = toneConfig[toast.tone] || toneConfig.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'pointer-events-auto rounded-2xl border bg-slate-950/[0.88] p-4 shadow-glow backdrop-blur-xl',
                config.ring,
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 rounded-2xl bg-white/5 p-2',
                    config.accent,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100">
                    {toast.title}
                  </p>
                  {toast.message ? (
                    <p className="mt-1 text-sm text-slate-400">
                      {toast.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded-full p-1 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
