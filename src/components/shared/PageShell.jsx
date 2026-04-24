import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function PageShell({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={cn('mx-auto w-full', className)}
    >
      {children}
    </motion.div>
  );
}
