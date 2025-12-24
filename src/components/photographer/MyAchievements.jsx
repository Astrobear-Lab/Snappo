import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { usePhotographer } from '../../contexts/PhotographerContext';
import AchievementBadge from './AchievementBadge';

// All possible achievements with their requirements
const ALL_ACHIEVEMENTS = [
  { type: 'first_sale', name: 'First Sale', description: 'Complete your first photo sale', icon: '🏆', requirement: '1 sale' },
  { type: 'downloads_10', name: 'Rising Star', description: '10 photos downloaded', icon: '⭐', requirement: '10 downloads' },
  { type: 'downloads_100', name: 'Download Hero', description: '100 photos downloaded', icon: '🔥', requirement: '100 downloads' },
  { type: 'downloads_1000', name: 'Download Legend', description: '1000 photos downloaded', icon: '👑', requirement: '1000 downloads' },
  { type: 'views_100', name: 'Getting Noticed', description: '100 photo views', icon: '👀', requirement: '100 views' },
  { type: 'views_1000', name: 'Popular Choice', description: '1000 photo views', icon: '📈', requirement: '1000 views' },
  { type: 'photos_10', name: 'Prolific Shooter', description: '10 photos uploaded', icon: '📷', requirement: '10 photos' },
  { type: 'photos_50', name: 'Photo Master', description: '50 photos uploaded', icon: '🎞️', requirement: '50 photos' },
  { type: 'verified', name: 'Verified Pro', description: 'Account verified', icon: '✓', requirement: 'Get verified' },
];

const MyAchievements = () => {
  const { photographerProfile } = usePhotographer();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (photographerProfile?.id) {
      fetchAchievements();
    }
  }, [photographerProfile?.id]);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('photographer_achievements')
        .select('*')
        .eq('photographer_id', photographerProfile.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const earnedTypes = achievements.map(a => a.achievement_type);
  const earnedCount = achievements.length;
  const totalCount = ALL_ACHIEVEMENTS.length;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
            <span className="text-xl">🏆</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">My Achievements</h3>
            <p className="text-sm text-gray-500">{earnedCount} of {totalCount} earned</p>
          </div>
        </div>
        {/* Progress */}
        <div className="text-right">
          <p className="text-2xl font-bold text-teal">{Math.round((earnedCount / totalCount) * 100)}%</p>
          <p className="text-xs text-gray-500">Complete</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(earnedCount / totalCount) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-teal to-cyan-500 rounded-full"
        />
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {ALL_ACHIEVEMENTS.map((achievement, index) => {
          const isEarned = earnedTypes.includes(achievement.type);
          const earnedData = achievements.find(a => a.achievement_type === achievement.type);

          return (
            <motion.div
              key={achievement.type}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative group"
            >
              <div
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-3 transition-all ${
                  isEarned
                    ? 'bg-gradient-to-br from-teal/10 to-cyan-500/10 border-2 border-teal/30'
                    : 'bg-gray-100 border-2 border-gray-200 opacity-50 grayscale'
                }`}
              >
                <span className={`text-3xl mb-1 ${!isEarned && 'filter grayscale'}`}>
                  {achievement.icon}
                </span>
                <p className={`text-xs font-semibold text-center leading-tight ${isEarned ? 'text-gray-800' : 'text-gray-500'}`}>
                  {achievement.name}
                </p>
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                <p className="font-semibold">{achievement.name}</p>
                <p className="text-gray-300">{achievement.description}</p>
                {isEarned && earnedData && (
                  <p className="text-teal-400 mt-1">
                    Earned {new Date(earnedData.earned_at).toLocaleDateString()}
                  </p>
                )}
                {!isEarned && (
                  <p className="text-gray-400 mt-1">Requirement: {achievement.requirement}</p>
                )}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>

              {/* Earned checkmark */}
              {isEarned && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {earnedCount === 0 && (
        <div className="text-center py-6 mt-4 bg-gray-50 rounded-xl">
          <p className="text-gray-600">Start uploading photos and making sales to earn achievements!</p>
        </div>
      )}
    </motion.div>
  );
};

export default MyAchievements;
