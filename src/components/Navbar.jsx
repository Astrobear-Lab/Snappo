import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import BecomePhotographerModal from './BecomePhotographerModal';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isPhotographerModalOpen, setIsPhotographerModalOpen] = useState(false);
  const [photographerProfile, setPhotographerProfile] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPhotographerProfile();
    } else {
      setPhotographerProfile(null);
    }
  }, [user]);

  const fetchPhotographerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('photographer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching photographer profile:', error);
      } else {
        setPhotographerProfile(data);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
    navigate('/');
  };

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handlePhotographerSuccess = () => {
    fetchPhotographerProfile();
    navigate('/dashboard');
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-3xl">📸</span>
                <span className="text-2xl font-bold text-navy">Snappo</span>
              </motion.div>
            </Link>

            {/* Right Side - Auth Buttons */}
            <div className="flex items-center gap-4">
              {user ? (
                // User Menu
                <div className="relative">
                  <motion.button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-teal to-cyan-500 text-white shadow-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                      <span className="text-lg">
                        {user.user_metadata?.full_name?.[0]?.toUpperCase() ||
                          user.email?.[0]?.toUpperCase() ||
                          '👤'}
                      </span>
                    </div>
                    <span className="font-semibold">
                      {user.user_metadata?.full_name || 'Account'}
                    </span>
                  </motion.button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowUserMenu(false)}
                        />

                        {/* Menu */}
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20"
                        >
                          <div className="p-4 border-b border-gray-100">
                            <p className="font-semibold text-navy">
                              {user.user_metadata?.full_name || 'User'}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                          </div>

                          <div className="py-2">
                            {photographerProfile ? (
                              <>
                                <button
                                  onClick={() => {
                                    setShowUserMenu(false);
                                    navigate('/dashboard');
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                                >
                                  <span>📊</span>
                                  <span>Photographer Dashboard</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setShowUserMenu(false);
                                    navigate('/');
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                                >
                                  <span>📷</span>
                                  <span>My Photos</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  setIsPhotographerModalOpen(true);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-teal/10 text-teal font-semibold transition-colors flex items-center gap-3"
                              >
                                <span>✨</span>
                                <span>Become a Photographer</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                alert('Settings feature coming soon!');
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                            >
                              <span>⚙️</span>
                              <span>Settings</span>
                            </button>
                          </div>

                          <div className="border-t border-gray-100 py-2">
                            <button
                              onClick={handleSignOut}
                              className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 transition-colors flex items-center gap-3"
                            >
                              <span>🚪</span>
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                // Auth Buttons
                <>
                  <motion.button
                    onClick={() => openAuthModal('login')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2 rounded-full font-semibold text-navy hover:bg-gray-100 transition-colors"
                  >
                    Sign In
                  </motion.button>
                  <motion.button
                    onClick={() => openAuthModal('signup')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2 rounded-full font-semibold bg-gradient-to-r from-teal to-cyan-500 text-white shadow-lg"
                  >
                    Get Started
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* Become Photographer Modal */}
      <BecomePhotographerModal
        isOpen={isPhotographerModalOpen}
        onClose={() => setIsPhotographerModalOpen(false)}
        onSuccess={handlePhotographerSuccess}
      />
    </>
  );
};

export default Navbar;
