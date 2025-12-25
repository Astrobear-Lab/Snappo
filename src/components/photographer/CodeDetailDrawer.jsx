import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useAuth } from '../../contexts/AuthContext';
import QRDisplay from './QRDisplay';
import StatusPill from './StatusPill';
import PhotoMetadataAccordion from './PhotoMetadataAccordion';
import NotificationModal from '../NotificationModal';
import { supabase } from '../../lib/supabase';
import { blurImage } from '../../lib/imageUtils';
import exifr from 'exifr';

const CodeDetailDrawer = ({ code, isOpen, onClose }) => {
  const { user } = useAuth();
  const { extendCode, invalidateCode, fetchCodes, deleteCode } = usePhotographer();
  const [localCode, setLocalCode] = useState(code);
  const [photos, setPhotos] = useState(code?.photos || []);
  const [loadingPhotoId, setLoadingPhotoId] = useState(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedNote, setEditedNote] = useState(code?.note || '');
  const [editedTags, setEditedTags] = useState(code?.tags?.join(', ') || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Notification modal state
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    if (code) {
      setLocalCode(code);
      setPhotos(code?.photos || []);
      setEditedNote(code?.note || '');
      setEditedTags(code?.tags?.join(', ') || '');
      setIsEditingMetadata(false);
    }
  }, [code]);

  // Auto-close drawer if code becomes invalid
  useEffect(() => {
    if (isOpen && !code) {
      onClose();
    }
  }, [code, isOpen, onClose]);

  if (!code || !localCode) return null;

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

  // Debug log for timeline
  if (localCode) {
    console.log('[CodeDetailDrawer] Timeline data:', {
      code: localCode.code,
      createdAt: localCode.createdAt,
      uploadedAt: localCode.uploadedAt,
      unlockedAt: localCode.unlockedAt,
      unlocks: localCode.unlocks,
    });
  }

  const timeline = [
    {
      label: 'Created',
      time: localCode?.createdAt || null,
      icon: '✨',
      active: true,
    },
    {
      label: 'Uploaded',
      time: localCode?.uploadedAt || null,
      icon: '📸',
      active: !!localCode?.uploadedAt,
    },
    {
      label: 'Redeemed',
      time: localCode?.unlockedAt || null,
      icon: '🔓',
      active: !!(localCode?.unlocks && localCode.unlocks > 0),
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
    if (!date) return '-';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const shareUrl = `${window.location.origin}/photo/${localCode?.code || ''}`;

  const handleDeleteCode = async () => {
    if (!localCode?.id) return;

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
    if (!localCode?.id) return;

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      // Get photographer profile
      const { data: profile, error: profileError } = await supabase
        .from('photographer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Photographer profile not found');
      }

      // Check if this is the first photo for this code
      const { data: existingPhotos } = await supabase
        .from('code_photos')
        .select('id')
        .eq('code_id', localCode.id)
        .limit(1);

      const isFirstPhoto = !existingPhotos || existingPhotos.length === 0;

      // Upload each file
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const filePath = `user-${user.id}/${fileName}`;

        // Upload original to private storage
        const { data: originalData, error: originalError } = await supabase.storage
          .from('photos-original')
          .upload(`${filePath}.${fileExt}`, file);

        if (originalError) throw originalError;

        // Create blurred version
        const blurredBlob = await blurImage(file, 40);

        // Upload blurred version to public storage
        const { data: blurredData, error: blurredError } = await supabase.storage
          .from('photos')
          .upload(`${filePath}-blurred.${fileExt}`, blurredBlob);

        if (blurredError) throw blurredError;

        // Extract EXIF data
        const exif = await exifr.parse(file).catch(() => null);
        const capturedAt = exif?.DateTimeOriginal
          ? new Date(exif.DateTimeOriginal).toISOString()
          : null;
        const exifMetadata = exif ? JSON.parse(JSON.stringify(exif, (key, value) =>
          value instanceof Date ? value.toISOString() : value
        )) : null;

        // Create photo record
        const { data: photoData, error: photoError } = await supabase
          .from('photos')
          .insert([
            {
              photographer_id: profile.id,
              file_url: originalData.path,
              watermarked_url: blurredData.path,
              title: file.name,
              file_size: file.size,
              status: 'approved',
              is_sample: false,
              captured_at: capturedAt,
              exif_metadata: exifMetadata,
            },
          ])
          .select()
          .single();

        if (photoError) throw photoError;

        // Link to code
        const { error: linkError } = await supabase
          .from('code_photos')
          .insert([
            {
              code_id: localCode.id,
              photo_id: photoData.id,
            },
          ]);

        if (linkError) throw linkError;
      }

      // Set uploaded_at and published_at timestamps if this is the first photo
      if (isFirstPhoto) {
        console.log('[CodeDetailDrawer] Setting uploaded_at for first photo upload...');
        const now = new Date().toISOString();
        const { data: updateData, error: updateError } = await supabase
          .from('photo_codes')
          .update({
            uploaded_at: now,
            published_at: now
          })
          .eq('id', localCode.id)
          .select('id, uploaded_at, published_at');

        if (updateError) {
          console.error('[CodeDetailDrawer] Failed to update uploaded_at:', updateError);
        } else {
          console.log('[CodeDetailDrawer] Successfully set uploaded_at:', now);
          console.log('[CodeDetailDrawer] DB returned:', updateData);
        }
      }

      // Refresh codes
      await fetchCodes();
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Upload Successful!',
        message: `${files.length} photo${files.length > 1 ? 's' : ''} uploaded successfully`
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Upload Failed',
        message: error.message || 'Failed to upload photos. Please try again.'
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="font-mono text-2xl font-bold text-gray-800">
                      {localCode?.code || 'N/A'}
                    </h2>
                    <StatusPill status={localCode?.status || 'unknown'} />
                  </div>

                  {/* Metadata Display/Edit */}
                  {!isEditingMetadata ? (
                    <div className="space-y-1.5">
                      {/* Note Display */}
                      {localCode?.note && (
                        <p className="text-sm text-gray-600">{localCode.note}</p>
                      )}

                      {/* Tags Display */}
                      {localCode?.tags && localCode.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {localCode.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-teal/10 text-teal text-xs font-semibold rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Edit Button */}
                      <motion.button
                        onClick={() => setIsEditingMetadata(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors text-xs"
                        title="Edit Details"
                      >
                        <span>✏️</span>
                        <span className="text-xs">Edit</span>
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
                          Save
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

              {/* Quick Stats - Compact */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-800">
                    {localCode?.photos?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">Photos</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-800">
                    {localCode?.views || 0}
                  </div>
                  <div className="text-xs text-gray-600">Views</div>
                </div>
                <div className="text-center p-2 bg-teal/10 rounded-lg">
                  <div className="text-xl font-bold text-teal">
                    {localCode?.unlocks || 0}
                  </div>
                  <div className="text-xs text-teal">Unlocks</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* QR Code Section - Collapsed by default */}
              <details className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      <span className="text-sm font-semibold text-gray-700">QR Code & Share Link</span>
                    </div>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </div>
                </summary>
                <div className="mt-3 p-4 bg-gradient-to-br from-teal/5 to-cyan-500/5 rounded-lg">
                  <QRDisplay
                    code={localCode?.code || ''}
                    link={`${window.location.origin}/photo/${localCode?.code || ''}`}
                    size="medium"
                  />

                  <div className="mt-3 p-2 bg-white rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Share Link</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-xs text-gray-700"
                      />
                      <motion.a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 bg-teal text-white font-semibold rounded text-xs hover:bg-teal/90 transition-colors flex items-center"
                        title="Visit photo page"
                      >
                        🔗 Visit
                      </motion.a>
                    </div>
                  </div>
                </div>
              </details>

              {/* Timeline - Compact */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">Timeline</h3>
                <div className="flex items-center gap-2">
                  {timeline.map((event, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 text-center ${event.active ? '' : 'opacity-40'}`}
                      title={`${event.label}: ${formatTime(event.time)}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mx-auto mb-1 ${
                          event.active
                            ? 'bg-teal text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {event.icon}
                      </div>
                      <div className="text-xs font-medium text-gray-700">{event.label}</div>
                      {event.active && event.time && (
                        <div className="text-xs text-gray-500">{formatTimeAgo(event.time)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    Photos ({photos.length})
                  </h3>

                  {/* Upload Button */}
                  {(localCode?.status === 'pending_upload' || localCode?.status === 'published') && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUploadClick}
                      disabled={uploading}
                      className={`px-4 py-2 ${uploading ? 'bg-gray-400' : 'bg-teal hover:bg-teal/90'} text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2`}
                    >
                      {uploading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <span>📸</span>
                          <span>Add Photos</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Sample Warning - Show if no samples */}
                {photos.length > 0 && !photos.some(p => p.isSample) && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-yellow-800">No sample photos</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Mark at least one photo as sample so buyers can preview before purchasing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="space-y-6">
                    {/* Sample Photos Section */}
                    {photos.filter(p => p.isSample).length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-teal mb-3 flex items-center gap-2">
                          <span>✨</span>
                          <span>Sample Photos ({photos.filter(p => p.isSample).length})</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {photos.filter(p => p.isSample).map((photo) => (
                            <div key={photo.id} className="flex flex-col">
                              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group border-2 border-teal">
                                <img
                                  src={getPhotoUrl(photo)}
                                  alt="Photo"
                                  className="w-full h-full object-cover"
                                />

                                {/* Sample badge */}
                                <div className="absolute top-2 left-2 px-2 py-1 bg-teal text-white rounded-full text-xs font-bold">
                                  ✨ Sample
                                </div>

                                {/* Remove sample button */}
                                <motion.button
                                  onClick={() => togglePhotoSample(photo.id, photo.isSample)}
                                  disabled={loadingPhotoId === photo.id}
                                  whileHover={{ scale: loadingPhotoId === photo.id ? 1 : 1.05 }}
                                  whileTap={{ scale: loadingPhotoId === photo.id ? 1 : 0.95 }}
                                  className="absolute top-2 right-2 px-2 py-1 rounded-full font-semibold text-xs shadow-lg transition-all flex items-center gap-1 bg-white/90 text-gray-700 hover:bg-white opacity-0 group-hover:opacity-100"
                                >
                                  {loadingPhotoId === photo.id ? (
                                    <>
                                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      <span>...</span>
                                    </>
                                  ) : (
                                    <span>Remove</span>
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

                    {/* Locked Photos Section */}
                    {photos.filter(p => !p.isSample).length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <span>🔒</span>
                          <span>Locked Photos ({photos.filter(p => !p.isSample).length})</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {photos.filter(p => !p.isSample).map((photo) => (
                            <div key={photo.id} className="flex flex-col">
                              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                                <img
                                  src={getPhotoUrl(photo)}
                                  alt="Photo"
                                  className="w-full h-full object-cover"
                                />

                                {/* Blurred overlay */}
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm bg-black/50 px-3 py-1 rounded-lg">
                                    🔒 Blurred
                                  </span>
                                </div>

                                {/* Mark as sample button */}
                                <motion.button
                                  onClick={() => togglePhotoSample(photo.id, photo.isSample)}
                                  disabled={loadingPhotoId === photo.id}
                                  whileHover={{ scale: loadingPhotoId === photo.id ? 1 : 1.05 }}
                                  whileTap={{ scale: loadingPhotoId === photo.id ? 1 : 0.95 }}
                                  className="absolute top-2 right-2 px-2 py-1 rounded-full font-semibold text-xs shadow-lg transition-all flex items-center gap-1 bg-white/90 text-gray-700 hover:bg-white"
                                >
                                  {loadingPhotoId === photo.id ? (
                                    <>
                                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      <span>...</span>
                                    </>
                                  ) : (
                                    <span>Set Sample</span>
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
                  </div>
                )}
              </div>


              {/* Actions - Compact */}
              <div className="space-y-2 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                  {localCode?.status !== 'expired' && (
                    <motion.button
                      onClick={() => extendCode(localCode?.id, 24)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors text-xs"
                    >
                      ⏱ Extend 24h
                    </motion.button>
                  )}

                  <motion.button
                    onClick={() => {
                      invalidateCode(localCode?.id);
                      onClose();
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors text-xs"
                  >
                    Invalidate
                  </motion.button>
                </div>

                <motion.button
                  onClick={handleDeleteCode}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors text-xs"
                >
                  🗑 Delete Code
                </motion.button>
              </div>
            </div>

            {/* Notification Modal */}
            <NotificationModal
              isOpen={notification.isOpen}
              onClose={() => setNotification({ ...notification, isOpen: false })}
              type={notification.type}
              title={notification.title}
              message={notification.message}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CodeDetailDrawer;
