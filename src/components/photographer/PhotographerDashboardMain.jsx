import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useAuth } from '../../contexts/AuthContext';
import GenerateCodeModal from './GenerateCodeModal';
import ActiveCodesBoard from './ActiveCodesBoard';
import TimelineMatchPanel from './TimelineMatchPanel';
import CodeDetailDrawer from './CodeDetailDrawer';
import ToastNotification from './ToastNotification';
import StripeConnectButton from './StripeConnectButton';
import EarningsDashboard from './EarningsDashboard';

const PhotographerDashboardMain = () => {
  const { user } = useAuth();
  const { codes, uploads } = usePhotographer();

  const [activeView, setActiveView] = useState('dashboard');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [showCodeDetail, setShowCodeDetail] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ToastNotification />

      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="text-3xl">📸</div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Snappo</h1>
                <p className="text-xs text-gray-500">Photographer Dashboard</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => setShowGenerateModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                ✨ Generate Code
              </motion.button>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-cyan-500 flex items-center justify-center text-white font-bold">
                {user?.email?.[0]?.toUpperCase() || 'P'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
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
          <div className="flex-1 space-y-6">
            {/* Dashboard View */}
            {activeView === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-teal to-cyan-500 rounded-3xl shadow-lg p-8 text-white">
                  <h2 className="text-3xl font-bold mb-2">
                    {getGreeting()}, Photographer!
                  </h2>
                  <p className="text-white/90 text-lg mb-6">
                    You created {stats.totalCodes} code
                    {stats.totalCodes !== 1 ? 's' : ''} with{' '}
                    {stats.totalPhotos} photo{stats.totalPhotos !== 1 ? 's' : ''}{' '}
                    🌟
                  </p>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-3xl font-bold">
                        {stats.pendingUpload}
                      </div>
                      <div className="text-sm text-white/80">Pending Upload</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-3xl font-bold">{stats.published}</div>
                      <div className="text-sm text-white/80">Published</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-3xl font-bold">{stats.unlocked}</div>
                      <div className="text-sm text-white/80">Unlocked</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    onClick={() => setShowGenerateModal(true)}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-6 text-left"
                  >
                    <div className="text-4xl mb-3">✨</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      Generate Code
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Create a new code for your photoshoot
                    </p>
                  </motion.button>

                  <motion.button
                    onClick={() => setActiveView('upload')}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-6 text-left relative"
                  >
                    <div className="text-4xl mb-3">📸</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      Upload & Match
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Upload photos and match them to codes
                    </p>
                    {stats.unmatchedUploads > 0 && (
                      <div className="absolute top-4 right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {stats.unmatchedUploads}
                      </div>
                    )}
                  </motion.button>
                </div>

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
                  <p className="text-gray-600">
                    Profile customization coming soon...
                  </p>
                </div>
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
    </div>
  );
};

export default PhotographerDashboardMain;
