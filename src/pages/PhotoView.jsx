import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PaymentModal from '../components/PaymentModal';

const PhotoView = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingUpload, setPendingUpload] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [allPhotos, setAllPhotos] = useState([]);
  const [codeData, setCodeData] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Stripe payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  // Mock payment mode (true = 실제 결제 없이 테스트, false = Stripe 실제 결제)
  // TODO: Stripe 키 설정 후 false로 변경
  const MOCK_PAYMENT = false;

  // Real-time countdown timer
  useEffect(() => {
    if (!codeData?.expires_at) return;

    const updateCountdown = () => {
      const now = new Date();
      const expiresAt = new Date(codeData.expires_at);
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // Helper function to pad numbers with leading zeros
      const pad = (num) => String(num).padStart(2, '0');

      // Digital clock format
      if (days > 0) {
        setTimeRemaining(`${days} day${days > 1 ? 's' : ''} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      } else if (hours > 0) {
        setTimeRemaining(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setTimeRemaining(`${pad(minutes)}:${pad(seconds)}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [codeData]);

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

      // 3. Get linked photos through code_photos table
      const { data: codePhotosData, error: codePhotosError } = await supabase
        .from('code_photos')
        .select(`
          photo_id,
          photos (
            *,
            photographer:photographer_profiles(
              id,
              user_id,
              profile:profiles(full_name, avatar_url)
            )
          )
        `)
        .eq('code_id', photoCodeData.id);

      console.log('[PhotoView] Code photos lookup result:', { codePhotosData, codePhotosError });

      if (codePhotosError) {
        console.error('[PhotoView] Code photos fetch error:', codePhotosError);
        setError(`Database error: ${codePhotosError.message || 'Photos not found'}`);
        setLoading(false);
        return;
      }

      if (!codePhotosData || codePhotosData.length === 0) {
        // Photos not uploaded yet - show pending state instead of error
        setPendingUpload(true);
        setLoading(false);
        return;
      }

      // Use all photos
      const photos = codePhotosData.map(cp => cp.photos);

      // 4. Get URLs and determine what to show (using signed URLs for private originals)
      const photosWithUrls = await Promise.all(photos.map(async (photo) => {
        // If it's a sample or already purchased, show original
        const showOriginal = photo.is_sample || photoCodeData.is_purchased;

        if (showOriginal) {
          // Use signed URL for private bucket (1 hour expiry)
          const { data: originalUrl, error } = await supabase.storage
            .from('photos-original')
            .createSignedUrl(photo.file_url, 60 * 60);

          if (error) {
            console.error('[PhotoView] Failed to create signed URL for original:', error);
            // Fallback to blurred version if signed URL fails
            const { data: blurredUrl } = supabase.storage
              .from('photos')
              .getPublicUrl(photo.watermarked_url);

            return {
              ...photo,
              display_url: blurredUrl.publicUrl,
              is_showing_original: false,
            };
          }

          return {
            ...photo,
            display_url: originalUrl.signedUrl,
            is_showing_original: true,
          };
        } else {
          // Show blurred version
          const { data: blurredUrl } = supabase.storage
            .from('photos')
            .getPublicUrl(photo.watermarked_url);

          return {
            ...photo,
            display_url: blurredUrl.publicUrl,
            is_showing_original: false,
          };
        }
      }));

      console.log('[PhotoView] Photos loaded successfully:', photosWithUrls);

      // Get all sample photos
      const samplePhotos = photosWithUrls.filter(photo => photo.is_sample);

      // Set the first sample photo or first photo as default
      const defaultPhoto = samplePhotos.length > 0 ? samplePhotos[0] : photosWithUrls[0];
      setPhotoData(defaultPhoto);
      setAllPhotos(photosWithUrls);

      setLoading(false);
    } catch (err) {
      console.error('[PhotoView] Unexpected error:', err);
      setError(`System error: ${err.message || 'Failed to load photo. Please try again.'}`);
      setLoading(false);
    }
  };

  const handleFreeDownload = async () => {
    if ((!photoData && allPhotos.length === 0) || !codeData) return;

    setDownloading(true);

    try {
      const samplePhoto = allPhotos.find(photo => photo.is_sample) || photoData;
      if (!samplePhoto) throw new Error('No sample photo found for download');

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
            views_count: (samplePhoto.views_count || 0) + 1,
          })
          .eq('id', samplePhoto.id);
      }

      // Download the dedicated sample image (or fallback to preview)
      // Fetch the image as a blob to ensure actual file download
      const response = await fetch(samplePhoto.display_url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `snappo-${code}-sample.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const lockedPhotos = allPhotos.filter(photo => !photo.is_sample);
  const lockedCount = lockedPhotos.length;

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
        const { data: originalUrl } = await supabase.storage
          .from('photos-original')
          .createSignedUrl(photoData.file_url, 60 * 60);

        if (originalUrl?.signedUrl) {
          // Fetch the image as a blob to ensure actual file download
          const response = await fetch(originalUrl.signedUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `snappo-${code}-original.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up the blob URL after a short delay
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        }

        setCodeData({ ...codeData, is_purchased: true });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        // 💳 REAL STRIPE PAYMENT
        // Create Payment Intent via Supabase Edge Function
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'create-payment-intent',
          {
            body: {
              amount: 3.0,
              photoCodeId: codeData.id,
              buyerId: user?.id || null,
              photographerId: photoData.photographer_id,
            },
          }
        );

        if (functionError || !functionData?.clientSecret) {
          throw new Error(functionError?.message || 'Failed to initialize payment');
        }

        // Set client secret and open payment modal
        setClientSecret(functionData.clientSecret);
        setShowPaymentModal(true);
        setPurchasing(false); // Reset purchasing state as modal will handle it
      }
    } catch (err) {
      console.error('Purchase error:', err);
      alert(`Payment failed: ${err.message || 'Please try again.'}`);
      setPurchasing(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      setPurchasing(true);
      setShowPaymentModal(false);

      // Create transaction record
      const { error: txError } = await supabase.from('transactions').insert([
        {
          photo_code_id: codeData.id,
          buyer_id: user?.id || null,
          photographer_id: photoData.photographer_id,
          amount: 3.0,
          photographer_earnings: 2.0,
          platform_fee: 1.0,
          payment_method: 'stripe',
          payment_status: 'completed',
          stripe_payment_id: paymentIntent.id,
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
      const { data: originalUrl } = await supabase.storage
        .from('photos-original')
        .createSignedUrl(photoData.file_url, 60 * 60);

      if (originalUrl?.signedUrl) {
        const response = await fetch(originalUrl.signedUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `snappo-${code}-original.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      }

      setCodeData({ ...codeData, is_purchased: true });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Post-payment error:', err);
      alert('Payment succeeded but failed to process. Please contact support.');
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

  if (pendingUpload) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream via-white to-peach/20 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            {/* Code Display */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-gradient-to-r from-teal to-cyan-500 text-white px-8 py-4 rounded-2xl shadow-lg"
              >
                <p className="text-sm font-semibold mb-1 opacity-90">YOUR CODE</p>
                <p className="font-mono text-4xl font-bold tracking-wider">{code}</p>
              </motion.div>

              {/* Expiry Timer */}
              {timeRemaining && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`px-6 py-2 rounded-full shadow-lg font-bold font-mono text-lg ${
                    timeRemaining === 'Expired'
                      ? 'bg-red-500 text-white'
                      : (timeRemaining.match(/:/g) || []).length === 1 && !timeRemaining.includes('day')
                      ? parseInt(timeRemaining.split(':')[0]) === 0
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  ⏰ Expires in {timeRemaining}
                </motion.div>
              )}
            </div>

            {/* Photographer Working Animation */}
            <div className="text-center mb-8">
              <motion.div
                animate={{
                  rotate: [0, -5, 5, -5, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
                className="text-8xl mb-6"
              >
                📸
              </motion.div>

              <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">
                Your Photos Are Being Prepared
              </h1>

              <p className="text-lg text-gray-600 mb-6">
                Your photographer is currently uploading your photos. This usually takes just a few moments.
              </p>

              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  className="w-3 h-3 bg-teal rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  className="w-3 h-3 bg-teal rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  className="w-3 h-3 bg-teal rounded-full"
                />
              </div>

              {/* Info Box */}
              <div className="bg-teal/5 border border-teal/20 rounded-2xl p-6 mb-6">
                <div className="flex items-start gap-3 text-left">
                  <div className="text-2xl">💡</div>
                  <div>
                    <p className="font-semibold text-gray-800 mb-2">What's happening?</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✓ Your code is valid and active</li>
                      <li>✓ Photographer is uploading your photos</li>
                      <li>✓ You'll be able to view them shortly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={() => window.location.reload()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold rounded-xl shadow-lg"
              >
                🔄 Refresh Page
              </motion.button>
              <motion.button
                onClick={() => navigate('/')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                ← Back to Home
              </motion.button>
            </div>
          </div>
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
          <div className="flex flex-col items-center gap-3">
            <div className="inline-block bg-white px-6 py-3 rounded-full shadow-lg">
              <span className="text-gray-600 font-semibold">Code: </span>
              <span className="font-mono text-2xl font-bold text-teal">{code}</span>
            </div>
            {timeRemaining && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`inline-block px-6 py-2 rounded-full shadow-lg font-bold font-mono text-lg ${
                  timeRemaining === 'Expired'
                    ? 'bg-red-500 text-white'
                    : (timeRemaining.match(/:/g) || []).length === 1 && !timeRemaining.includes('day')
                    ? parseInt(timeRemaining.split(':')[0]) === 0
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-orange-500 text-white'
                    : 'bg-gradient-to-r from-teal to-cyan-500 text-white'
                }`}
              >
                ⏰ {timeRemaining}
              </motion.div>
            )}
          </div>
        </motion.div>

        <div className="space-y-12">
          {/* Sample Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/70 rounded-3xl shadow-xl p-6 md:p-10"
          >
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={photoData?.display_url}
                  alt={photoData?.title || 'Your photo'}
                  className="w-full h-auto object-cover"
                />
                {!photoData?.is_showing_original && !codeData?.is_purchased && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-8">
                    <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full">
                      <p className="text-gray-800 font-semibold text-lg">
                        🔒 Blurred Preview
                      </p>
                    </div>
                  </div>
                )}
                {photoData?.is_sample && !codeData?.is_purchased && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-teal text-white px-4 py-2 rounded-full font-semibold shadow-lg">
                      ✨ Sample Preview
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">PREVIEW TITLE</p>
                  <h3 className="text-3xl font-bold text-navy">
                    {photoData?.title || 'Untitled'}
                  </h3>
                </div>

                {photoData?.description && (
                  <p className="text-gray-600 text-lg leading-relaxed">{photoData.description}</p>
                )}

                {photoData?.location && (
                  <p className="text-gray-500 flex items-center gap-2">
                    <span>📍</span>
                    {photoData.location}
                  </p>
                )}

                <div className="rounded-2xl bg-teal/5 border border-teal/15 p-4">
                  <p className="text-sm font-semibold text-teal mb-1">FREE PREVIEW</p>
                  <p className="text-gray-600">
                    Download this complimentary sample instantly. The rest of the gallery remains locked until purchase.
                  </p>
                </div>

                <motion.button
                  onClick={handleFreeDownload}
                  disabled={downloading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-4 py-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white font-bold text-lg rounded-2xl shadow-lg disabled:opacity-50 transition-all"
                >
                  {downloading ? 'Downloading...' : '⬇️ Download Free Preview'}
                </motion.button>
              </div>
            </div>

            {/* Sample Photo Gallery (if multiple samples) */}
            {allPhotos.filter(p => p.is_sample).length > 1 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-gray-500 mb-3 text-center">
                  📸 Sample Gallery ({allPhotos.filter(p => p.is_sample).length} photos)
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 justify-center">
                  {allPhotos
                    .filter(p => p.is_sample)
                    .map((photo, index) => (
                      <motion.div
                        key={photo.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPhotoData(photo)}
                        className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden cursor-pointer border-4 transition-all ${
                          photoData?.id === photo.id
                            ? 'border-teal shadow-lg'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={photo.display_url}
                          alt={`Sample ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {photoData?.id === photo.id && (
                          <div className="absolute inset-0 bg-teal/20 flex items-center justify-center">
                            <div className="w-6 h-6 bg-teal rounded-full flex items-center justify-center text-white font-bold text-xs">
                              ✓
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Locked Gallery / Purchase */}
          {codeData?.is_purchased ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-3xl p-8 text-center shadow-inner"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-3xl font-bold text-green-800 mb-2">Full Gallery Unlocked</h3>
              <p className="text-green-700 mb-6">
                Enjoy every moment in its original quality. Re-download anytime.
              </p>
              <motion.button
                onClick={handleFreeDownload}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-green-500 text-white font-bold rounded-2xl"
              >
                ⬇️ Download Again
              </motion.button>
            </motion.div>
          ) : lockedPhotos.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                <div>
                  <p className="text-sm font-semibold text-teal uppercase tracking-[0.3em]">
                    Locked Gallery
                  </p>
                  <h2 className="text-3xl font-bold text-navy mt-2">
                    {lockedCount} more moment{lockedCount === 1 ? '' : 's'} waiting
                  </h2>
                  <p className="text-gray-600 mt-2">
                    Unlock the rest of your gallery to reveal crystal-clear versions, remove watermarks, and download them forever.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-left">
                    <p className="font-semibold text-gray-800">What you get</p>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      <li>• All photos in original resolution</li>
                      <li>• No watermark, no limits</li>
                      <li>• Direct support for the photographer</li>
                    </ul>
                  </div>
                  {MOCK_PAYMENT && (
                    <p className="text-xs font-semibold text-yellow-700 text-center bg-yellow-100 rounded-full px-3 py-1">
                      🎭 Test mode — payment simulated
                    </p>
                  )}
                  <motion.button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-8 py-4 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold rounded-2xl shadow-lg disabled:opacity-50"
                  >
                    {purchasing ? 'Processing...' : `🔓 Unlock All Photos $3`}
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {lockedPhotos.map((photo, index) => (
                  <div
                    key={photo.id || `locked-${index}`}
                    className="relative rounded-2xl overflow-hidden shadow-lg group"
                  >
                    <img
                      src={photo.display_url}
                      alt={photo.title || `Locked photo ${index + 1}`}
                      className="w-full h-48 object-cover grayscale"
                    />
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                      <span className="text-3xl">🔒</span>
                      <p className="font-semibold">Locked Preview</p>
                      <p className="text-sm text-white/80">Purchase to reveal</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 shadow-lg text-center"
            >
              <h3 className="text-2xl font-bold text-navy mb-2">More photos coming soon</h3>
              <p className="text-gray-600">Your photographer will add the rest of your gallery shortly.</p>
            </motion.div>
          )}

          {/* Photographer Info */}
          {photoData?.photographer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-lg"
            >
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
            </motion.div>
          )}
        </div>

        {/* Stripe Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          clientSecret={clientSecret}
          amount={3.0}
        />
      </div>
    </div>
  );
};

export default PhotoView;
