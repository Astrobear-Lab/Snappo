import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PhotoView = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [codeData, setCodeData] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Mock payment mode (true = 실제 결제 없이 테스트)
  const MOCK_PAYMENT = true;

  useEffect(() => {
    if (code) {
      fetchPhotoByCode();
    }
  }, [code]);

  const fetchPhotoByCode = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('[PhotoView] Fetching photo with code:', code);

      // 1. Find photo code
      const { data: photoCodeData, error: codeError } = await supabase
        .from('photo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      console.log('[PhotoView] Photo code lookup result:', { photoCodeData, codeError });

      if (codeError) {
        console.error('[PhotoView] Supabase error:', codeError);

        // Check if Supabase is configured
        if (codeError.message?.includes('Failed to fetch') || codeError.message?.includes('URL')) {
          setError('⚠️ Database not configured. Please set up Supabase or use mock data.');
        } else {
          setError(`Database error: ${codeError.message || 'Unknown error'}`);
        }
        setLoading(false);
        return;
      }

      if (!photoCodeData) {
        console.log('[PhotoView] Code not found in database');
        setError('Code not found. This code may not exist yet or has been deleted.');
        setLoading(false);
        return;
      }

      // 2. Check if expired
      if (photoCodeData.expires_at && new Date(photoCodeData.expires_at) < new Date()) {
        console.log('[PhotoView] Code expired:', photoCodeData.expires_at);
        setError('This code has expired.');
        setLoading(false);
        return;
      }

      setCodeData(photoCodeData);
      console.log('[PhotoView] Code data loaded:', photoCodeData);

      // 3. Get photo details
      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .select(`
          *,
          photographer:photographer_profiles(
            id,
            user_id,
            profile:profiles(full_name, avatar_url)
          )
        `)
        .eq('id', photoCodeData.photo_id)
        .single();

      console.log('[PhotoView] Photo lookup result:', { photo, photoError });

      if (photoError) {
        console.error('[PhotoView] Photo fetch error:', photoError);
        setError(`Photo error: ${photoError.message || 'Photo not found'}`);
        setLoading(false);
        return;
      }

      if (!photo) {
        setError('Photo not found.');
        setLoading(false);
        return;
      }

      // 4. Get public URLs
      const { data: watermarkedUrl } = supabase.storage
        .from('photos')
        .getPublicUrl(photo.watermarked_url);

      console.log('[PhotoView] Photo loaded successfully');

      setPhotoData({
        ...photo,
        watermarked_public_url: watermarkedUrl.publicUrl,
      });

      setLoading(false);
    } catch (err) {
      console.error('[PhotoView] Unexpected error:', err);
      setError(`System error: ${err.message || 'Failed to load photo. Please try again.'}`);
      setLoading(false);
    }
  };

  const handleFreeDownload = async () => {
    if (!photoData || !codeData) return;

    setDownloading(true);

    try {
      // Update redemption status
      if (!codeData.is_redeemed) {
        await supabase
          .from('photo_codes')
          .update({
            is_redeemed: true,
            redeemed_by: user?.id || null,
            redeemed_at: new Date().toISOString(),
          })
          .eq('id', codeData.id);

        // Update views count
        await supabase
          .from('photos')
          .update({
            views_count: (photoData.views_count || 0) + 1,
          })
          .eq('id', photoData.id);
      }

      // Download watermarked version
      const link = document.createElement('a');
      link.href = photoData.watermarked_public_url;
      link.download = `snappo-${code}-watermarked.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePurchase = async () => {
    if (!photoData || !codeData) return;

    setPurchasing(true);

    try {
      if (MOCK_PAYMENT) {
        // 🎭 MOCK PAYMENT - 테스트용 (실제 결제 없음)
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 결제 시뮬레이션

        // Create transaction record
        const { error: txError } = await supabase.from('transactions').insert([
          {
            photo_code_id: codeData.id,
            buyer_id: user?.id || null,
            photographer_id: photoData.photographer_id,
            amount: 3.0,
            photographer_earnings: 2.0,
            platform_fee: 1.0,
            payment_method: 'mock_test',
            payment_status: 'completed',
            stripe_payment_id: `mock_${Date.now()}`,
          },
        ]);

        if (txError) throw txError;

        // Update photo code as purchased
        await supabase
          .from('photo_codes')
          .update({
            is_purchased: true,
            purchased_by: user?.id || null,
            purchased_at: new Date().toISOString(),
          })
          .eq('id', codeData.id);

        // Update photographer earnings
        await supabase.rpc('increment_photographer_earnings', {
          p_photographer_id: photoData.photographer_id,
          p_amount: 2.0,
        });

        // Update photo status and counts
        await supabase
          .from('photos')
          .update({
            status: 'sold',
            downloads_count: (photoData.downloads_count || 0) + 1,
          })
          .eq('id', photoData.id);

        // Download original
        const { data: originalUrl } = supabase.storage
          .from('photos-original')
          .getPublicUrl(photoData.file_url);

        const link = document.createElement('a');
        link.href = originalUrl.publicUrl;
        link.download = `snappo-${code}-original.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setCodeData({ ...codeData, is_purchased: true });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        // TODO: Real Stripe payment integration
        alert('Real payment integration coming soon!');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      alert('Payment failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">📸</div>
          <p className="text-2xl font-semibold text-navy">Loading your photo...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream to-white flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <div className="text-6xl mb-6">😕</div>
          <h1 className="text-3xl font-bold text-navy mb-4">Oops!</h1>
          <p className="text-xl text-gray-600 mb-8">{error}</p>
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold rounded-xl"
          >
            Back to Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-peach/20 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Success Toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-6 right-6 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3"
            >
              <span className="text-2xl">✓</span>
              <span className="font-semibold">
                {codeData?.is_purchased ? 'Purchase complete! Download started.' : 'Download started!'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-navy mb-4">
            Your Snappo Moment 📸
          </h1>
          <div className="inline-block bg-white px-6 py-3 rounded-full shadow-lg">
            <span className="text-gray-600 font-semibold">Code: </span>
            <span className="font-mono text-2xl font-bold text-teal">{code}</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Photo Preview */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={photoData?.watermarked_public_url}
                alt={photoData?.title || 'Your photo'}
                className="w-full h-auto object-cover"
              />
              {!codeData?.is_purchased && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-8">
                  <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full">
                    <p className="text-gray-800 font-semibold text-lg">
                      🔒 Watermark Version
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Photo Info */}
            <div className="mt-6 bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-2xl font-bold text-navy mb-2">
                {photoData?.title || 'Untitled'}
              </h3>
              {photoData?.description && (
                <p className="text-gray-600 mb-4">{photoData.description}</p>
              )}
              {photoData?.location && (
                <p className="text-gray-500 flex items-center gap-2">
                  <span>📍</span>
                  {photoData.location}
                </p>
              )}
            </div>
          </motion.div>

          {/* Purchase Options */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Free Download */}
            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-navy mb-2">Free Download</h3>
                  <p className="text-gray-600">Get the watermarked version</p>
                </div>
                <div className="text-4xl">🆓</div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="text-green-500 text-xl">✓</span>
                  Instant download
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="text-green-500 text-xl">✓</span>
                  High quality (with watermark)
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="text-green-500 text-xl">✓</span>
                  Perfect for social media
                </li>
              </ul>

              <motion.button
                onClick={handleFreeDownload}
                disabled={downloading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 transition-all"
              >
                {downloading ? 'Downloading...' : '⬇️ Download Free Version'}
              </motion.button>
            </div>

            {/* Purchase Full Quality */}
            {!codeData?.is_purchased ? (
              <div className="bg-gradient-to-br from-teal to-cyan-500 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute -right-10 -top-10 text-9xl opacity-10">💎</div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Full Quality</h3>
                      <p className="text-white/90">No watermark, pure perfection</p>
                    </div>
                    <div className="text-4xl">💎</div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-3">
                      <span className="text-white text-xl">✓</span>
                      Original quality (no watermark)
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-white text-xl">✓</span>
                      Full resolution
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-white text-xl">✓</span>
                      Support the photographer ($2)
                    </li>
                  </ul>

                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-lg">One-time payment</span>
                      <span className="text-4xl font-bold">$3</span>
                    </div>
                  </div>

                  {MOCK_PAYMENT && (
                    <div className="bg-yellow-400 text-yellow-900 rounded-lg px-4 py-2 mb-4 text-sm font-semibold text-center">
                      🎭 TEST MODE - No real payment required
                    </div>
                  )}

                  <motion.button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-white text-teal font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 transition-all"
                  >
                    {purchasing ? 'Processing...' : '🔓 Unlock Full Quality $3'}
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border-2 border-green-500 rounded-3xl p-8 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">
                  Already Purchased!
                </h3>
                <p className="text-green-700 mb-6">
                  You own the full quality version of this photo
                </p>
                <motion.button
                  onClick={handleFreeDownload}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-green-500 text-white font-bold rounded-xl"
                >
                  ⬇️ Download Again
                </motion.button>
              </div>
            )}

            {/* Photographer Info */}
            {photoData?.photographer && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h4 className="text-sm font-semibold text-gray-500 mb-3">PHOTOGRAPHED BY</h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal to-purple rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {photoData.photographer.profile?.full_name?.[0] || '📷'}
                  </div>
                  <div>
                    <p className="font-semibold text-navy">
                      {photoData.photographer.profile?.full_name || 'Snappo Photographer'}
                    </p>
                    <p className="text-sm text-gray-500">Professional Photographer</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PhotoView;
