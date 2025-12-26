import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import GenerateCodeModal from './GenerateCodeModal';
import ActiveCodesBoard from './ActiveCodesBoard';
import TimelineMatchPanel from './TimelineMatchPanel';
import CodeDetailDrawer from './CodeDetailDrawer';
import ToastNotification from './ToastNotification';
import StripeConnectButton from './StripeConnectButton';
import EarningsDashboard from './EarningsDashboard';
import ProfileSettingsModal from '../ProfileSettingsModal';
import ProfilePrivacySettings from './ProfilePrivacySettings';
import MyAchievements from './MyAchievements';

const PhotographerDashboardMain = () => {
  const { user } = useAuth();
  const { codes, uploads } = usePhotographer();

  const [activeView, setActiveView] = useState('dashboard');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [showCodeDetail, setShowCodeDetail] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile on mount
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Update selectedCode when codes array changes (e.g., after sample status update)
  useEffect(() => {
    if (selectedCode) {
      const updatedCode = codes.find(c => c.id === selectedCode.id);
      if (updatedCode) {
        setSelectedCode(updatedCode);
      }
    }
  }, [codes, selectedCode]);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'codes', label: 'Active Codes', icon: '🎫' },
    { id: 'upload', label: 'Upload & Match', icon: '📸' },
    { id: 'earnings', label: 'Earnings', icon: '💰' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = {
    totalCodes: codes.length,
    pendingUpload: codes.filter((c) => c.status === 'pending_upload').length,
    published: codes.filter((c) => c.status === 'published').length,
    unlocked: codes.filter((c) => c.status === 'unlocked').length,
    totalPhotos: codes.reduce((acc, c) => acc + c.photos.length, 0),
    unmatchedUploads: uploads.filter((u) => !u.matched).length,
  };

  const handleCodeClick = (code) => {
    setSelectedCode(code);
    setShowCodeDetail(true);
  };

  const handleUploadClick = (code) => {
    setSelectedCode(code);
    setActiveView('upload');
  };

  const handleProfileSettingsClose = () => {
    setShowProfileSettings(false);
    // Refresh user profile after settings modal closes
    if (user) {
      fetchUserProfile();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ToastNotification />

      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-2xl sm:text-3xl">📸</div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-800">Snappo</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Photographer Dashboard</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                onClick={() => setShowGenerateModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 sm:px-6 py-2 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow text-sm sm:text-base"
              >
                <span className="hidden sm:inline">✨ Generate Code</span>
                <span className="sm:hidden">✨ New</span>
              </motion.button>

              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-teal to-cyan-500 flex items-center justify-center text-white font-bold overflow-hidden">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{userProfile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'P'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 pb-20 lg:pb-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation - Desktop Only */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-md p-4 sticky top-24">
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const isActive = activeView === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      whileHover={{ x: 4 }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </motion.button>
                  );
                })}
              </nav>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Quick Stats
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Codes</span>
                    <span className="font-bold text-gray-800">
                      {stats.totalCodes}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Photos</span>
                    <span className="font-bold text-gray-800">
                      {stats.totalPhotos}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unlocked</span>
                    <span className="font-bold text-teal">{stats.unlocked}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-4 sm:space-y-6 w-full">
            {/* Dashboard View */}
            {activeView === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-teal to-cyan-500 rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8 text-white">
                  <h2 className="text-xl sm:text-3xl font-bold mb-2">
                    {getGreeting()}, Photographer!
                  </h2>
                  <p className="text-white/90 text-sm sm:text-lg mb-4 sm:mb-6">
                    You created {stats.totalCodes} code
                    {stats.totalCodes !== 1 ? 's' : ''} with{' '}
                    {stats.totalPhotos} photo{stats.totalPhotos !== 1 ? 's' : ''}{' '}
                    🌟
                  </p>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                      <div className="text-xl sm:text-3xl font-bold">
                        {stats.pendingUpload}
                      </div>
                      <div className="text-xs sm:text-sm text-white/80">Pending Upload</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                      <div className="text-xl sm:text-3xl font-bold">{stats.published}</div>
                      <div className="text-xs sm:text-sm text-white/80">Published</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                      <div className="text-xl sm:text-3xl font-bold">{stats.unlocked}</div>
                      <div className="text-xs sm:text-sm text-white/80">Unlocked</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <motion.button
                    onClick={() => setShowGenerateModal(true)}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-5 sm:p-6 text-left"
                  >
                    <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">✨</div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">
                      Generate Code
                    </h3>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      Create a new code for your photoshoot
                    </p>
                  </motion.button>

                  <motion.button
                    onClick={() => setActiveView('upload')}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-5 sm:p-6 text-left relative"
                  >
                    <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📸</div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">
                      Upload & Match
                    </h3>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      Upload photos and match them to codes
                    </p>
                    {stats.unmatchedUploads > 0 && (
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                        {stats.unmatchedUploads}
                      </div>
                    )}
                  </motion.button>
                </div>

                {/* My Achievements */}
                <MyAchievements />

                {/* Active Codes Preview */}
                <ActiveCodesBoard
                  onCodeClick={handleCodeClick}
                  onUploadClick={handleUploadClick}
                />
              </motion.div>
            )}

            {/* Codes View */}
            {activeView === 'codes' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ActiveCodesBoard
                  onCodeClick={handleCodeClick}
                  onUploadClick={handleUploadClick}
                />
              </motion.div>
            )}

            {/* Upload View */}
            {activeView === 'upload' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <TimelineMatchPanel />
              </motion.div>
            )}

            {/* Earnings View */}
            {activeView === 'earnings' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <EarningsDashboard />
              </motion.div>
            )}

            {/* Settings View */}
            {activeView === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Payment Settings */}
                <div className="bg-white rounded-3xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    💰 Payment Settings
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Connect your Stripe account to receive payments automatically when customers purchase photos.
                  </p>
                  <StripeConnectButton />
                </div>

                {/* Profile Settings */}
                <div className="bg-white rounded-3xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    👤 Profile Settings
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Manage your profile information, bio, and contact details.
                  </p>
                  <motion.button
                    onClick={() => setShowProfileSettings(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-teal to-cyan-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-shadow"
                  >
                    Edit Profile
                  </motion.button>
                </div>

                {/* Privacy Settings */}
                <ProfilePrivacySettings />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <GenerateCodeModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
      />

      <CodeDetailDrawer
        code={selectedCode}
        isOpen={showCodeDetail}
        onClose={() => setShowCodeDetail(false)}
      />

      <ProfileSettingsModal
        isOpen={showProfileSettings}
        onClose={handleProfileSettingsClose}
      />

      {/* Bottom Tab Bar - Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <nav className="flex justify-around items-center h-16">
          {navigationItems.map((item) => {
            const isActive = activeView === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-teal' : 'text-gray-600'
                }`}
              >
                <span className="text-2xl mb-0.5">{item.icon}</span>
                <span className="text-xs font-semibold">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default PhotographerDashboardMain;
