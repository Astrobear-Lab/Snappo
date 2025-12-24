import { motion } from 'framer-motion';
import { useState } from 'react';
import AchievementBadge from './AchievementBadge';

const PhotographerProfileCard = ({ photographer, stats }) => {
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  if (!photographer) return null;

  const profile = photographer.profile;
  const privacySettings = photographer.privacy_settings || {
    show_bio: true,
    show_stats: true,
    show_achievements: true,
  };
  const achievements = photographer.achievements || [];

  // Format large numbers (1000 -> 1K, 1000000 -> 1M)
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const displayedAchievements = showAllAchievements ? achievements : achievements.slice(0, 4);
  const remainingCount = achievements.length - 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-lg"
    >
      <h4 className="text-sm font-semibold text-gray-500 mb-4">PHOTOGRAPHED BY</h4>

      {/* Profile Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="relative">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-teal to-purple rounded-full flex items-center justify-center text-white font-bold text-xl">
              {profile?.full_name?.[0] || '?'}
            </div>
          )}
          {photographer.verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal rounded-full flex items-center justify-center text-white text-xs shadow-md">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Name & Location */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-navy text-lg">
              {profile?.full_name || 'Snappo Photographer'}
            </p>
            {photographer.verified && (
              <span className="px-2 py-0.5 bg-teal/10 text-teal text-xs font-semibold rounded-full">
                Verified
              </span>
            )}
          </div>
          {photographer.location && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <span>📍</span>
              {photographer.location}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {privacySettings.show_bio && photographer.bio && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
            {photographer.bio}
          </p>
        </div>
      )}

      {/* Stats */}
      {privacySettings.show_stats && stats && (
        <div className="flex items-center justify-around py-3 mb-4 border-y border-gray-100">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">{formatNumber(stats.total_photos)}</p>
            <p className="text-xs text-gray-500">Photos</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">{formatNumber(stats.total_views)}</p>
            <p className="text-xs text-gray-500">Views</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">{formatNumber(stats.total_downloads)}</p>
            <p className="text-xs text-gray-500">Downloads</p>
          </div>
        </div>
      )}

      {/* Achievements */}
      {privacySettings.show_achievements && achievements.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">ACHIEVEMENTS</p>
          <div className="flex items-center gap-2 flex-wrap">
            {displayedAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.achievement_type}
                achievement={achievement}
                size="sm"
              />
            ))}
            {!showAllAchievements && remainingCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAllAchievements(true)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 transition-colors"
              >
                +{remainingCount}
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Portfolio Link */}
      {photographer.portfolio_url && (
        <motion.a
          href={photographer.portfolio_url}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-4 block w-full py-2 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
        >
          View Portfolio
        </motion.a>
      )}
    </motion.div>
  );
};

export default PhotographerProfileCard;
