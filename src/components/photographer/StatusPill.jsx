import { motion } from 'framer-motion';

const StatusPill = ({ status }) => {
  const statusConfig = {
    pending_upload: {
      label: 'Pending Upload',
      icon: '⏳',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    },
    published: {
      label: 'Published',
      icon: '✓',
      className: 'bg-teal/10 text-teal border-teal/30',
    },
    unlocked: {
      label: 'Unlocked',
      icon: '🔓',
      className: 'bg-green-100 text-green-700 border-green-300',
    },
    expired: {
      label: 'Expired',
      icon: '⏰',
      className: 'bg-gray-100 text-gray-600 border-gray-300',
    },
  };

  const config = statusConfig[status] || statusConfig.pending_upload;

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.className}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </motion.span>
  );
};

export default StatusPill;
