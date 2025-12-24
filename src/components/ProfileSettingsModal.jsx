import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    phone: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setFormData({
          full_name: data.full_name || user.user_metadata?.full_name || '',
          bio: data.bio || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
        });
      } else {
        setFormData({
          full_name: user.user_metadata?.full_name || '',
          bio: '',
          phone: '',
          avatar_url: '',
        });
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...formData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file.' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 2MB.' });
      return;
    }

    setUploadingAvatar(true);
    setMessage({ type: '', text: '' });

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to avatars bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Update form data with new avatar URL
      setFormData({
        ...formData,
        avatar_url: publicUrl,
      });

      setMessage({ type: 'success', text: 'Avatar uploaded! Click "Save Changes" to confirm.' });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage({ type: 'error', text: 'Failed to upload avatar. Please try again.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getAvatarDisplay = () => {
    if (formData.avatar_url) {
      return (
        <img
          src={formData.avatar_url}
          alt="Avatar"
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <div className="text-4xl text-white">
        {formData.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal to-cyan-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Profile Settings</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            <p className="text-white/90 mt-1">Update your personal information</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal to-cyan-500 flex items-center justify-center overflow-hidden">
                  {getAvatarDisplay()}
                </div>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <span className="text-white text-2xl">📷</span>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Click to upload profile picture</p>
              <p className="text-xs text-gray-400">Max 2MB, JPG or PNG</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                rows="4"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal focus:border-transparent outline-none transition-all resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.bio.length} characters
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+82 10-1234-5678"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Message */}
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {message.text}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-teal to-cyan-500 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProfileSettingsModal;
