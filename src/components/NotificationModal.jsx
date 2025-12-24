import { motion, AnimatePresence } from 'framer-motion';

const NotificationModal = ({ isOpen, onClose, type = 'success', title, message, autoClose = true }) => {
  // Auto-close after 3 seconds for success, 5 seconds for error
  if (autoClose && isOpen) {
    setTimeout(() => {
      onClose();
    }, type === 'success' ? 3000 : 5000);
  }

  const typeConfig = {
    success: {
      emoji: '✅',
      bgColor: 'from-green-500 to-emerald-500',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
    },
    error: {
      emoji: '❌',
      bgColor: 'from-red-500 to-rose-500',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
    },
    warning: {
      emoji: '⚠️',
      bgColor: 'from-yellow-500 to-amber-500',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
    },
    info: {
      emoji: 'ℹ️',
      bgColor: 'from-blue-500 to-cyan-500',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
    },
  };

  const config = typeConfig[type] || typeConfig.success;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
          >
            <div className="text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mb-4"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${config.bgColor} text-white text-3xl`}>
                  {config.emoji}
                </div>
              </motion.div>

              {/* Title */}
              {title && (
                <h3 className="text-2xl font-bold text-navy mb-2">
                  {title}
                </h3>
              )}

              {/* Message */}
              {message && (
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
              )}

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-8 py-3 bg-gradient-to-r ${config.bgColor} text-white font-bold rounded-xl shadow-lg`}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationModal;
