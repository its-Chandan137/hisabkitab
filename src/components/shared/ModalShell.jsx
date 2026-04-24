import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ModalShell({
  open,
  onClose,
  title,
  description,
  children,
  className,
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'glass-card relative z-10 w-full max-w-xl p-6',
              className,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:text-slate-100"
            >
              <X className="h-4 w-4" />
            </button>

            {(title || description) && (
              <div className="pr-10">
                {title ? (
                  <h2 className="text-xl font-semibold text-slate-100">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {description}
                  </p>
                ) : null}
              </div>
            )}

            <div className={title || description ? 'mt-6' : ''}>{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
