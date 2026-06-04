import { AnimatePresence, motion } from 'framer-motion'

export default function BottomSheet({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[70svh] overflow-y-auto rounded-t-2xl border border-border bg-surface-raised p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl lg:hidden"
          >
            {title ? <h2 className="mb-3 text-center text-sm font-semibold text-text">{title}</h2> : null}
            {children}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
