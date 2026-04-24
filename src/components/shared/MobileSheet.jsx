import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function MobileSheet({
  open,
  onClose,
  title,
  description,
  children,
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[65] flex items-end md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close sheet"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="glass-card relative z-10 w-full rounded-b-none border-b-0 px-5 pb-8 pt-5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:text-slate-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-10">
              <p className="panel-title">Filters</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-100">
                {title}
              </h2>
              {description ? (
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="mt-6">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
