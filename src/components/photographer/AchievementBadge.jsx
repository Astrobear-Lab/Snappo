import { motion } from 'framer-motion';

const AchievementBadge = ({ achievement, size = 'md', showTooltip = true }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  };

  const badgeColors = {
    first_sale: 'from-yellow-400 to-amber-500',
    downloads_10: 'from-blue-400 to-cyan-500',
    downloads_100: 'from-orange-400 to-red-500',
    downloads_1000: 'from-purple-400 to-pink-500',
    views_100: 'from-teal-400 to-emerald-500',
    views_1000: 'from-indigo-400 to-purple-500',
    photos_10: 'from-gray-400 to-slate-500',
    photos_50: 'from-rose-400 to-pink-500',
    verified: 'from-teal to-cyan-500',
  };

  const gradientClass = badgeColors[achievement.achievement_type] || 'from-gray-400 to-gray-500';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      className="relative group"
    >
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br ${gradientClass} rounded-full flex items-center justify-center shadow-lg cursor-pointer`}
      >
        <span>{achievement.icon}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
          <p className="font-semibold">{achievement.achievement_name}</p>
          <p className="text-gray-300">{achievement.description}</p>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </motion.div>
  );
};

export default AchievementBadge;
