import { motion, AnimatePresence } from 'framer-motion';
import { usePhotographer } from '../../contexts/PhotographerContext';

const ToastNotification = () => {
  const { notifications, removeNotification } = usePhotographer();

  const typeConfig = {
    success: {
      icon: '✓',
      className: 'bg-green-500',
    },
    error: {
      icon: '✕',
      className: 'bg-red-500',
    },
    info: {
      icon: 'ℹ',
      className: 'bg-blue-500',
    },
    warning: {
      icon: '⚠',
      className: 'bg-yellow-500',
    },
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => {
          const config = typeConfig[notification.type] || typeConfig.info;

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, x: 100 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
            >
              <div className="flex items-center gap-3 p-4">
                <div
                  className={`w-8 h-8 rounded-full ${config.className} flex items-center justify-center text-white font-bold flex-shrink-0`}
                >
                  {config.icon}
                </div>

                <p className="flex-1 text-sm text-gray-800 font-medium">
                  {notification.message}
                </p>

                <button
                  onClick={() => removeNotification(notification.id)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <span className="text-gray-400 text-sm">✕</span>
                </button>
              </div>

              {/* Progress bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className={`h-1 ${config.className}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ToastNotification;
