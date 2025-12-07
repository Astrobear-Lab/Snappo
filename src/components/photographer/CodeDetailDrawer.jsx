import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import QRDisplay from './QRDisplay';
import StatusPill from './StatusPill';
import PhotoMetadataAccordion from './PhotoMetadataAccordion';
import { supabase } from '../../lib/supabase';

const CodeDetailDrawer = ({ code, isOpen, onClose }) => {
  const { extendCode, invalidateCode, fetchCodes, deleteCode } = usePhotographer();
  const [localCode, setLocalCode] = useState(code);
  const [photos, setPhotos] = useState(code?.photos || []);
  const [loadingPhotoId, setLoadingPhotoId] = useState(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedNote, setEditedNote] = useState(code?.note || '');
  const [editedTags, setEditedTags] = useState(code?.tags?.join(', ') || '');

  useEffect(() => {
    if (code) {
      setLocalCode(code);
      setPhotos(code?.photos || []);
      setEditedNote(code?.note || '');
      setEditedTags(code?.tags?.join(', ') || '');
      setIsEditingMetadata(false);
    }
  }, [code]);

  if (!code) return null;

  // Toggle sample status for a photo
  const togglePhotoSample = async (photoId, currentStatus) => {
    console.log('[CodeDetailDrawer] togglePhotoSample called:', { photoId, currentStatus, newStatus: !currentStatus });

    setLoadingPhotoId(photoId);

    try {
      const { data, error } = await supabase
        .from('photos')
        .update({ is_sample: !currentStatus })
        .eq('id', photoId)
        .select();

      console.log('[CodeDetailDrawer] Supabase update result:', { data, error });

      if (error) throw error;

      // Refresh codes to get updated data
      console.log('[CodeDetailDrawer] Calling fetchCodes...');
      await fetchCodes();

      console.log('[CodeDetailDrawer] Updating local photos state...');
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId ? { ...photo, isSample: !currentStatus } : photo
        )
      );

      console.log('[CodeDetailDrawer] Sample status updated successfully!');
    } catch (err) {
      console.error('[CodeDetailDrawer] Failed to update sample status:', err);
      alert('Failed to update sample status. Please try again.');
    } finally {
      setLoadingPhotoId(null);
    }
  };

  // Helper to get photo URL (handles both paths and full URLs)
  const getPhotoUrl = (photo) =>
    photo?.preview_url || photo?.original_url || photo?.blurred_url || '';

  const timeline = [
    {
      label: 'Created',
      time: localCode.createdAt,
      icon: '✨',
      active: true,
    },
    {
      label: 'Shared',
      time: localCode.sharedAt,
      icon: '📤',
      active: !!localCode.sharedAt,
    },
    {
      label: 'Uploaded',
      time: localCode.uploadedAt,
      icon: '📸',
      active: !!localCode.uploadedAt,
    },
    {
      label: 'Published',
      time: localCode.publishedAt,
      icon: '✓',
      active: !!localCode.publishedAt,
    },
    {
      label: 'Viewed',
      time: localCode.views > 0 ? localCode.createdAt : null,
      icon: '👁',
      active: localCode.views > 0,
    },
    {
      label: 'Unlocked',
      time: localCode.unlockedAt || null,
      icon: '🔓',
      active: localCode.status === 'unlocked',
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

  const shareUrl = `${window.location.origin}/photo/${localCode.code}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Photo Code',
        text: `Check out my photos! Use code: ${localCode.code}`,
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
      await deleteCode(localCode.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete code:', error);
      alert('Failed to delete code. Please try again.');
    }
  };

  const handleSaveMetadata = async () => {
    try {
      const tags = editedTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('photo_codes')
        .update({
          note: editedNote.trim() || null,
          tags: tags.length > 0 ? tags : null,
        })
        .eq('id', localCode.id);

      if (error) throw error;

      // Update local code state immediately
      setLocalCode({
        ...localCode,
        note: editedNote.trim() || '',
        tags: tags,
      });

      await fetchCodes();
      setIsEditingMetadata(false);
    } catch (error) {
      console.error('Failed to update metadata:', error);
      alert('Failed to update metadata. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditedNote(localCode?.note || '');
    setEditedTags(localCode?.tags?.join(', ') || '');
    setIsEditingMetadata(false);
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
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-mono text-3xl font-bold text-gray-800">
                      {localCode.code}
                    </h2>
                    <StatusPill status={localCode.status} />
                  </div>

                  {/* Metadata Display/Edit */}
                  {!isEditingMetadata ? (
                    <div className="space-y-2">
                      {localCode.note && (
                        <p className="text-gray-600">{localCode.note}</p>
                      )}
                      {localCode.tags && localCode.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {localCode.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-teal/10 text-teal text-xs font-semibold rounded-lg"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <motion.button
                        onClick={() => setIsEditingMetadata(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="text-sm text-teal hover:text-teal/80 font-semibold mt-2"
                      >
                        ✏️ Edit note & tags
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-3">
                      {/* Note Edit */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Note
                        </label>
                        <input
                          type="text"
                          value={editedNote}
                          onChange={(e) => setEditedNote(e.target.value)}
                          placeholder="e.g., Sarah & Tom wedding"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all text-sm"
                        />
                      </div>

                      {/* Tags Edit */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Tags
                        </label>
                        <input
                          type="text"
                          value={editedTags}
                          onChange={(e) => setEditedTags(e.target.value)}
                          placeholder="e.g., wedding, outdoor, portrait"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Separate tags with commas
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <motion.button
                          onClick={handleSaveMetadata}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1 px-4 py-2 bg-teal text-white font-semibold rounded-lg hover:bg-teal/90 transition-colors text-sm"
                        >
                          💾 Save
                        </motion.button>
                        <motion.button
                          onClick={handleCancelEdit}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors text-sm"
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0 ml-4"
                >
                  <span className="text-2xl text-gray-600">×</span>
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-800">
                    {localCode.photos.length}
                  </div>
                  <div className="text-xs text-gray-600">Photos</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-800">
                    {localCode.views}
                  </div>
                  <div className="text-xs text-gray-600">Views</div>
                </div>
                <div className="text-center p-3 bg-teal/10 rounded-xl">
                  <div className="text-2xl font-bold text-teal">
                    {localCode.unlocks}
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
                  code={localCode.code}
                  link={`${window.location.origin}/photo/${localCode.code}`}
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
                      onClick={() => window.open(shareUrl, '_blank')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                      title="Open link"
                    >
                      🔗
                    </motion.button>
                    <motion.button
                      onClick={handleShare}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-teal text-white font-semibold rounded-lg hover:bg-teal/90 transition-colors"
                      title="Share"
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
                            disabled={loadingPhotoId === photo.id}
                            whileHover={{ scale: loadingPhotoId === photo.id ? 1 : 1.05 }}
                            whileTap={{ scale: loadingPhotoId === photo.id ? 1 : 0.95 }}
                            className={`absolute top-2 right-2 px-3 py-1 rounded-full font-semibold text-xs shadow-lg transition-all flex items-center gap-1 ${
                              photo.isSample
                                ? 'bg-teal text-white'
                                : 'bg-white/90 text-gray-700 hover:bg-white'
                            } ${loadingPhotoId === photo.id ? 'opacity-70 cursor-wait' : ''}`}
                          >
                            {loadingPhotoId === photo.id ? (
                              <>
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Updating...</span>
                              </>
                            ) : (
                              <span>{photo.isSample ? '✨ Sample' : 'Mark as Sample'}</span>
                            )}
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
                  {localCode.views > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <div className="text-2xl">👁</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">
                          Viewed {localCode.views} time{localCode.views > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          Last viewed 5m ago
                        </div>
                      </div>
                    </div>
                  )}

                  {localCode.status === 'unlocked' && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                      <div className="text-2xl">🔓</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">
                          Unlocked
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(localCode.unlockedAt)} - Payout pending
                        </div>
                      </div>
                    </div>
                  )}

                  {localCode.photos.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-teal/10 rounded-xl">
                      <div className="text-2xl">📸</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">
                          {localCode.photos.length} photo{localCode.photos.length > 1 ? 's' : ''} added
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(localCode.createdAt)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {localCode.status !== 'expired' && (
                  <motion.button
                    onClick={() => extendCode(localCode.id, 24)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 transition-colors"
                  >
                    ⏱ Extend by 24 hours
                  </motion.button>
                )}

                <motion.button
                  onClick={() => {
                    invalidateCode(localCode.id);
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
