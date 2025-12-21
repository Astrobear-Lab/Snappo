import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePhotographer } from '../../contexts/PhotographerContext';

const StripeConnectButton = () => {
  const { user } = useAuth();
  const { photographerProfile, refreshPhotographerProfile } = usePhotographer();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setError('');

    try {
      // Call Edge Function to create Stripe Connect account
      const { data, error: functionError } = await supabase.functions.invoke('create-connect-account', {
        body: {
          photographerId: photographerProfile.id,
          email: user.email,
          country: 'US', // TODO: Get from user profile or add country selector
        },
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to create Stripe account');
      }

      if (!data?.onboardingUrl) {
        throw new Error('No onboarding URL received');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    } catch (err) {
      console.error('Stripe Connect error:', err);
      setError(err.message || 'Failed to connect Stripe account. Please try again.');
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setLoading(true);
    try {
      await refreshPhotographerProfile();
      alert('Status refreshed successfully!');
    } catch (err) {
      console.error('Refresh error:', err);
      alert('Failed to refresh status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if Stripe Connect is fully set up
  const isConnected = photographerProfile?.stripe_account_id &&
                      photographerProfile?.stripe_onboarding_completed &&
                      photographerProfile?.stripe_charges_enabled;

  const isPending = photographerProfile?.stripe_account_id &&
                    (!photographerProfile?.stripe_onboarding_completed ||
                     !photographerProfile?.stripe_charges_enabled);

  return (
    <div className="space-y-4">
      {isConnected ? (
        // Fully connected
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">✓</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-800 mb-1">
                Stripe Connected
              </h3>
              <p className="text-green-700 mb-3">
                Your earnings will be automatically transferred to your bank account after each sale.
              </p>
              <div className="bg-white/50 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Your earnings per sale:</span>
                  <span className="font-bold text-green-700">$2.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform fee:</span>
                  <span className="text-gray-500">$1.00</span>
                </div>
                <div className="h-px bg-green-200 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Photo price:</span>
                  <span className="font-bold text-gray-700">$3.00</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : isPending ? (
        // Onboarding started but not completed
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">⏳</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-yellow-800 mb-1">
                Setup Incomplete
              </h3>
              <p className="text-yellow-700 mb-4">
                Complete your Stripe onboarding to start receiving payments.
              </p>
              <div className="flex gap-3">
                <motion.button
                  onClick={handleConnect}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 bg-yellow-600 text-white font-semibold rounded-xl hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Loading...' : 'Complete Setup'}
                </motion.button>
                <motion.button
                  onClick={handleRefreshStatus}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 bg-white border border-yellow-300 text-yellow-700 font-semibold rounded-xl hover:bg-yellow-50 disabled:opacity-50 transition-colors"
                >
                  Refresh Status
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        // Not connected yet
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">💳</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-blue-800 mb-1">
                Connect Stripe to Receive Payments
              </h3>
              <p className="text-blue-700 mb-2">
                Set up your Stripe account to receive $2.00 for each photo sold.
              </p>
              <ul className="text-sm text-blue-600 space-y-1 mb-4">
                <li>✓ Automatic transfers to your bank account</li>
                <li>✓ Secure payment processing by Stripe</li>
                <li>✓ Takes only 2-3 minutes to set up</li>
              </ul>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}
              <motion.button
                onClick={handleConnect}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Connecting...
                  </span>
                ) : (
                  '🔗 Connect Stripe Account'
                )}
              </motion.button>
              <p className="text-xs text-blue-500 text-center mt-3">
                Powered by Stripe Connect • Secure & Trusted
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Earnings info */}
      {photographerProfile && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <h4 className="font-semibold text-gray-700 mb-2">Your Earnings</h4>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Earned (Database):</span>
            <span className="text-2xl font-bold text-teal">
              ${(photographerProfile.total_earnings || 0).toFixed(2)}
            </span>
          </div>
          {!isConnected && photographerProfile.total_earnings > 0 && (
            <p className="text-xs text-yellow-600 mt-2">
              ⚠️ Connect Stripe to receive future payments automatically
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StripeConnectButton;
