import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { supabase } from '../../lib/supabase';
import { blurImage } from '../../lib/imageUtils';
import exifr from 'exifr';
import StatusPill from './StatusPill';
import QRDisplay from './QRDisplay';

const CodeCard = ({ code, onUploadClick, onDetailClick }) => {
  const { user } = useAuth();
  const { fetchCodes } = usePhotographer();
  const [showQR, setShowQR] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Helper to get photo URL (handles both paths and full URLs)
  const getPhotoUrl = (photo) =>
    photo?.preview_url || photo?.original_url || photo?.blurred_url || '';

  const formatTimeAgo = (date) => {
    if (!date) return '-';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatTimeRemaining = (date) => {
    if (!date) return '-';
    const ms = new Date(date) - new Date();
    if (ms < 0) return 'Expired';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h left`;
    const days = Math.floor(hours / 24);
    return `${days}d left`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code.code);
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
        .eq('code_id', code.id)
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
              code_id: code.id,
              photo_id: photoData.id,
            },
          ]);

        if (linkError) throw linkError;
      }

      // Set uploaded_at and published_at timestamps if this is the first photo
      if (isFirstPhoto) {
        const now = new Date().toISOString();
        await supabase
          .from('photo_codes')
          .update({
            uploaded_at: now,
            published_at: now
          })
          .eq('id', code.id);
      }

      // Refresh codes
      await fetchCodes();
      alert(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded successfully!`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload photos: ' + error.message);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-5 border border-gray-100"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-mono text-2xl font-bold text-gray-800">
              {code.code}
            </h3>
            <StatusPill status={code.status} />
            {code.unlocks > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-300">
                <span>🔓</span>
                <span>Unlocked</span>
              </span>
            )}
          </div>

          {code.note && (
            <p className="text-sm text-gray-600 mb-2">{code.note}</p>
          )}

          {code.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {code.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowQR(!showQR)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="text-2xl">{showQR ? '✕' : '📱'}</span>
        </button>
      </div>

      {/* QR Code Expansion */}
      <AnimatePresence initial={false}>
        {showQR && (
          <motion.div
            key="qr-panel"
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-4 pt-4 border-t border-gray-100"
          >
            <QRDisplay
              code={code.code}
              link={`${window.location.origin}/photo/${code.code}`}
              size="medium"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 py-3 border-t border-b border-gray-100">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Photos</div>
          <div className="font-bold text-gray-800">{code.photos.length}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Views</div>
          <div className="font-bold text-gray-800">{code.views}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Unlocks</div>
          <div className="font-bold text-teal">{code.unlocks}</div>
        </div>
      </div>

      {/* Photo Thumbnails */}
      {code.photos.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {code.photos.slice(0, 4).map((photo) => (
            <div
              key={photo.id}
              className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100"
            >
              <img
                src={getPhotoUrl(photo)}
                alt="Photo"
                className="w-full h-full object-cover"
              />
              {photo.watermarked && !photo.original_url && (
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                  <span className="text-xs text-white drop-shadow">🔒</span>
                </div>
              )}
            </div>
          ))}
          {code.photos.length > 4 && (
            <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500">
              +{code.photos.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>Created {formatTimeAgo(code.createdAt)}</span>
        <span
          className={
            code.status === 'expired' ? 'text-red-500 font-semibold' : ''
          }
        >
          {formatTimeRemaining(code.expiresAt)}
        </span>
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

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopy}
          className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors"
        >
          📋 Copy
        </motion.button>

        {(code.status === 'pending_upload' || code.status === 'published') && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUploadClick}
            disabled={uploading}
            className={`flex-1 py-2 px-3 ${uploading ? 'bg-gray-400' : 'bg-teal hover:bg-teal/90'} text-white font-semibold rounded-lg text-sm transition-colors`}
          >
            {uploading ? '⏳ Uploading...' : `📸 ${code.status === 'pending_upload' ? 'Upload' : 'Add Photos'}`}
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onDetailClick(code)}
          className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors"
        >
          →
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CodeCard;
