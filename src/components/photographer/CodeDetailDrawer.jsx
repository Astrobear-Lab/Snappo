import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import QRDisplay from './QRDisplay';
import StatusPill from './StatusPill';
import PhotoMetadataAccordion from './PhotoMetadataAccordion';
import { supabase } from '../../lib/supabase';

const CodeDetailDrawer = ({ code, isOpen, onClose }) => {
  const { extendCode, invalidateCode, fetchCodes, deleteCode } = usePhotographer();
  const [photos, setPhotos] = useState(code?.photos || []);

  useEffect(() => {
    setPhotos(code?.photos || []);
  }, [code]);

  if (!code) return null;

  // Toggle sample status for a photo
  const togglePhotoSample = async (photoId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ is_sample: !currentStatus })
        .eq('id', photoId);

      if (error) throw error;

      // Refresh codes to get updated data
      await fetchCodes();
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId ? { ...photo, isSample: !currentStatus } : photo
        )
      );
    } catch (err) {
      console.error('Failed to update sample status:', err);
      alert('Failed to update sample status. Please try again.');
    }
  };

  // Helper to get photo URL (handles both paths and full URLs)
  const getPhotoUrl = (photo) =>
    photo?.preview_url || photo?.original_url || photo?.blurred_url || '';

  const timeline = [
    {
      label: 'Created',
      time: code.createdAt,
      icon: '✨',
      active: true,
    },
    {
      label: 'Shared',
      time: code.sharedAt,
      icon: '📤',
      active: !!code.sharedAt,
    },
    {
      label: 'Uploaded',
      time: code.uploadedAt,
      icon: '📸',
      active: !!code.uploadedAt,
    },
    {
      label: 'Published',
      time: code.publishedAt,
      icon: '✓',
      active: !!code.publishedAt,
    },
    {
      label: 'Viewed',
      time: code.views > 0 ? code.createdAt : null,
      icon: '👁',
      active: code.views > 0,
    },
    {
      label: 'Unlocked',
      time: code.unlockedAt || null,
      icon: '🔓',
      active: code.status === 'unlocked',
    },
  ];

  const formatTime = (date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const shareUrl = `${window.location.origin}/photo/${code.code}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Photo Code',
        text: `Check out my photos! Use code: ${code.code}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleDeleteCode = async () => {
    if (!window.confirm('Are you sure you want to delete this code? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCode(code.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete code:', error);
      alert('Failed to delete code. Please try again.');
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

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-mono text-3xl font-bold text-gray-800">
                      {code.code}
                    </h2>
                    <StatusPill status={code.status} />
                  </div>
                  {code.note && (
                    <p className="text-gray-600">{code.note}</p>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <span className="text-2xl text-gray-600">×</span>
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-800">
                    {code.photos.length}
                  </div>
                  <div className="text-xs text-gray-600">Photos</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-800">
                    {code.views}
                  </div>
                  <div className="text-xs text-gray-600">Views</div>
                </div>
                <div className="text-center p-3 bg-teal/10 rounded-xl">
                  <div className="text-2xl font-bold text-teal">
                    {code.unlocks}
                  </div>
                  <div className="text-xs text-teal">Unlocks</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* QR Code Section */}
              <div className="bg-gradient-to-br from-teal/5 to-cyan-500/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                  Share this code
                </h3>
                <QRDisplay
                  code={code.code}
                  link={`${window.location.origin}/photo/${code.code}`}
                  size="large"
                />

                <div className="mt-4 p-3 bg-white rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Share Link</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700"
                    />
                    <motion.button
                      onClick={handleShare}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-teal text-white font-semibold rounded-lg hover:bg-teal/90 transition-colors"
                    >
                      📤
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Timeline
                </h3>
                <div className="space-y-3">
                  {timeline.map((event, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 ${
                        event.active ? '' : 'opacity-40'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                          event.active
                            ? 'bg-teal text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {event.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">
                          {event.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(event.time)}
                        </div>
                      </div>
                      {event.active && event.time && (
                        <div className="text-sm text-gray-500">
                          {formatTimeAgo(event.time)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              {photos.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Photos ({photos.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {photos.map((photo) => (
                      <div key={photo.id} className="flex flex-col">
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                          <img
                            src={getPhotoUrl(photo)}
                            alt="Photo"
                            className="w-full h-full object-cover"
                          />
                          {photo.watermarked && !photo.original_url && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white font-semibold text-sm bg-black/50 px-3 py-1 rounded-lg">
                                🔒 Blurred
                              </span>
                            </div>
                          )}

                          {/* Sample toggle button */}
                          <motion.button
                            onClick={() => togglePhotoSample(photo.id, photo.isSample)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`absolute top-2 right-2 px-3 py-1 rounded-full font-semibold text-xs shadow-lg transition-all ${
                              photo.isSample
                                ? 'bg-teal text-white'
                                : 'bg-white/90 text-gray-700 hover:bg-white'
                            }`}
                          >
                            {photo.isSample ? '✨ Sample' : 'Mark as Sample'}
                          </motion.button>
                        </div>

                        {/* Photo Metadata Accordion */}
                        <PhotoMetadataAccordion photo={photo} exif={photo.exif} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Feed */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {code.views > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <div className="text-2xl">👁</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">
                          Viewed {code.views} time{code.views > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          Last viewed 5m ago
                        </div>
                      </div>
                    </div>
                  )}

                  {code.status === 'unlocked' && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                      <div className="text-2xl">🔓</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">
                          Unlocked
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(code.unlockedAt)} - Payout pending
                        </div>
                      </div>
                    </div>
                  )}

                  {code.photos.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-teal/10 rounded-xl">
                      <div className="text-2xl">📸</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">
                          {code.photos.length} photo{code.photos.length > 1 ? 's' : ''} added
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(code.createdAt)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {code.status !== 'expired' && (
                  <motion.button
                    onClick={() => extendCode(code.id, 24)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 transition-colors"
                  >
                    ⏱ Extend by 24 hours
                  </motion.button>
                )}

                <motion.button
                  onClick={() => {
                    invalidateCode(code.id);
                    onClose();
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Mark as Invalid
                </motion.button>

                <motion.button
                  onClick={handleDeleteCode}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
                >
                  🗑 Delete Code
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CodeDetailDrawer;
