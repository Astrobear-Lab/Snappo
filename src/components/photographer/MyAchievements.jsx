import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { usePhotographer } from '../../contexts/PhotographerContext';

// All possible achievements with their requirements
const ALL_ACHIEVEMENTS = [
  { type: 'first_sale', name: 'First Sale', description: 'Complete your first photo sale', icon: '🏆', target: 1, statKey: 'sales' },
  { type: 'downloads_10', name: 'Rising Star', description: '10 photos downloaded', icon: '⭐', target: 10, statKey: 'downloads' },
  { type: 'downloads_100', name: 'Download Hero', description: '100 photos downloaded', icon: '🔥', target: 100, statKey: 'downloads' },
  { type: 'downloads_1000', name: 'Download Legend', description: '1000 photos downloaded', icon: '👑', target: 1000, statKey: 'downloads' },
  { type: 'views_100', name: 'Getting Noticed', description: '100 photo views', icon: '👀', target: 100, statKey: 'views' },
  { type: 'views_1000', name: 'Popular Choice', description: '1000 photo views', icon: '📈', target: 1000, statKey: 'views' },
  { type: 'photos_10', name: 'Prolific Shooter', description: '10 photos uploaded', icon: '📷', target: 10, statKey: 'photos' },
  { type: 'photos_50', name: 'Photo Master', description: '50 photos uploaded', icon: '🎞️', target: 50, statKey: 'photos' },
  { type: 'verified', name: 'Verified Pro', description: 'Account verified', icon: '✓', target: 1, statKey: 'verified' },
];

const MyAchievements = () => {
  const { photographerProfile } = usePhotographer();
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({ sales: 0, downloads: 0, views: 0, photos: 0, verified: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (photographerProfile?.id) {
      fetchAchievementsAndStats();
    }
  }, [photographerProfile?.id]);

  const fetchAchievementsAndStats = async () => {
    try {
      // Fetch achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('photographer_achievements')
        .select('*')
        .eq('photographer_id', photographerProfile.id)
        .order('earned_at', { ascending: false });

      if (achievementsError) throw achievementsError;
      setAchievements(achievementsData || []);

      // Fetch stats
      // Count total sales (purchased photo codes)
      const { count: salesCount, error: salesError } = await supabase
        .from('photo_codes')
        .select('*', { count: 'exact', head: true })
        .eq('photographer_id', photographerProfile.id)
        .eq('is_purchased', true);

      if (salesError) throw salesError;

      // Count total photos uploaded
      const { count: photosCount, error: photosError } = await supabase
        .from('code_photos')
        .select('photo_id', { count: 'exact', head: true })
        .in('code_id',
          supabase
            .from('photo_codes')
            .select('id')
            .eq('photographer_id', photographerProfile.id)
        );

      if (photosError) throw photosError;

      // For now, set downloads and views to match sales (we'll implement proper tracking later)
      // TODO: Add proper views and downloads tracking tables
      const downloadsCount = salesCount; // Each sale = 1 download for now
      const viewsCount = 0; // Not tracking yet

      setStats({
        sales: salesCount || 0,
        downloads: downloadsCount || 0,
        views: viewsCount || 0,
        photos: photosCount || 0,
        verified: photographerProfile.verified ? 1 : 0,
      });
    } catch (err) {
      console.error('Error fetching achievements and stats:', err);
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

          // Calculate progress
          const currentValue = stats[achievement.statKey] || 0;
          const progress = Math.min((currentValue / achievement.target) * 100, 100);
          const progressText = `${currentValue}/${achievement.target}`;

          return (
            <motion.div
              key={achievement.type}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative group"
            >
              <div
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-3 transition-all relative overflow-hidden ${
                  isEarned
                    ? 'bg-gradient-to-br from-teal/10 to-cyan-500/10 border-2 border-teal/30'
                    : 'bg-gray-100 border-2 border-gray-200 opacity-50 grayscale'
                }`}
              >
                {/* Background progress fill */}
                {!isEarned && (
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-teal/5 to-cyan-500/5"
                    style={{
                      clipPath: `polygon(0 100%, 100% 100%, 100% ${100 - progress}%, 0 ${100 - progress}%)`
                    }}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center justify-center">
                  <span className={`text-3xl mb-1 ${!isEarned && 'filter grayscale'}`}>
                    {achievement.icon}
                  </span>
                  <p className={`text-xs font-semibold text-center leading-tight ${isEarned ? 'text-gray-800' : 'text-gray-500'}`}>
                    {achievement.name}
                  </p>
                  {/* Progress text below name */}
                  {!isEarned && (
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">
                      {progressText}
                    </p>
                  )}
                </div>
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
                  <>
                    <p className="text-gray-400 mt-1">Progress: {progressText}</p>
                    {/* Mini progress bar in tooltip */}
                    <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-teal to-cyan-500 rounded-full"
                      />
                    </div>
                  </>
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
