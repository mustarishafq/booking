import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

/**
 * Re-mounts on pathname change so every route gets a consistent entry animation.
 * Search/hash changes do not re-trigger.
 */
export default function PageTransition({ children, className }) {
  const { pathname } = useLocation();

  return (
    <motion.div
      key={pathname}
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
