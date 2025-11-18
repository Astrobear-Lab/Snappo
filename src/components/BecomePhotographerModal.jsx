import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BecomePhotographerModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    bio: '',
    location: '',
    portfolio_url: '',
    terms_accepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.terms_accepted) {
      setError('Please accept the terms and conditions');
      return;
    }

    if (formData.bio.length < 20) {
      setError('Bio must be at least 20 characters');
      return;
    }

    setLoading(true);

    try {
      // First, ensure user profile exists in public.profiles
      const { data: existingUserProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create it
      if (!existingUserProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || null,
              avatar_url: user.user_metadata?.avatar_url || null,
            },
          ]);

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          throw new Error('Failed to create user profile');
        }
      }

      // Check if user already has a photographer profile
      const { data: existingProfile } = await supabase
        .from('photographer_profiles')
        .select('id, status')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        setError('You already have a photographer profile');
        setLoading(false);
        return;
      }

      // Create photographer profile
      const { data, error: insertError } = await supabase
        .from('photographer_profiles')
        .insert([
          {
            user_id: user.id,
            bio: formData.bio,
            location: formData.location || null,
            portfolio_url: formData.portfolio_url || null,
            status: 'pending',
            verified: false,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Success!
      onSuccess && onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Error creating photographer profile:', err);
      setError(err.message || 'Failed to create photographer profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
              >
                <span className="text-2xl text-gray-600">×</span>
              </button>

              {/* Header */}
              <div className="gradient-multi p-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white"
                >
                  <div className="text-6xl mb-4">📸</div>
                  <h2 className="text-4xl font-bold mb-2">Become a Photographer</h2>
                  <p className="text-white/90 text-lg">
                    Share your passion, earn from your craft
                  </p>
                </motion.div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Info Box */}
                <div className="mb-6 p-6 bg-teal/10 border border-teal/20 rounded-2xl">
                  <h3 className="text-lg font-bold text-navy mb-3">
                    🚀 How it works:
                  </h3>
                  <ol className="space-y-2 text-gray-700">
                    <li>1️⃣ Submit your application below</li>
                    <li>2️⃣ Upload your first 3 photos</li>
                    <li>3️⃣ Once approved, earn $2 per photo sold!</li>
                    <li>4️⃣ Get verified and unlock unlimited uploads</li>
                  </ol>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tell us about yourself *
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="I'm a passionate photographer who loves capturing spontaneous moments..."
                      required
                      minLength={20}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.bio.length}/20 characters minimum
                    </p>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., New York, USA"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all"
                    />
                  </div>

                  {/* Portfolio URL */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Portfolio URL (Optional)
                    </label>
                    <input
                      type="url"
                      name="portfolio_url"
                      value={formData.portfolio_url}
                      onChange={handleChange}
                      placeholder="https://yourportfolio.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all"
                    />
                  </div>

                  {/* Terms and Conditions */}
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      name="terms_accepted"
                      checked={formData.terms_accepted}
                      onChange={handleChange}
                      required
                      className="mt-1 w-5 h-5 text-teal border-gray-300 rounded focus:ring-2 focus:ring-teal/20"
                    />
                    <label className="text-sm text-gray-700 leading-relaxed">
                      I agree to the{' '}
                      <a href="#" className="text-teal font-semibold hover:underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#" className="text-teal font-semibold hover:underline">
                        Community Guidelines
                      </a>
                      . I understand that I will earn $2 per photo sold and that my first
                      3 photos will be reviewed for verification.
                    </label>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Submitting...' : 'Submit Application 🚀'}
                  </motion.button>
                </form>

                {/* Footer Note */}
                <p className="text-center text-sm text-gray-500 mt-6">
                  You'll be able to upload photos immediately after approval
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BecomePhotographerModal;
