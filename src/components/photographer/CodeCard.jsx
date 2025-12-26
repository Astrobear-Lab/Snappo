import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import StatusPill from './StatusPill';
import QRDisplay from './QRDisplay';

const CodeCard = ({ code, onDetailClick }) => {
  const [showQR, setShowQR] = useState(false);

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

      {/* Customer Email */}
      <div className={`mb-4 p-3 rounded-lg ${code.customer_email ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📧</span>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-semibold mb-1 ${code.customer_email ? 'text-blue-600' : 'text-gray-500'}`}>
              Customer Email
            </div>
            {code.customer_email ? (
              <div className="text-sm text-gray-800 font-medium truncate" title={code.customer_email}>
                {code.customer_email}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Not collected yet
              </div>
            )}
          </div>
          {code.email_sent && (
            <span className="flex-shrink-0 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold border border-green-300">
              ✓ Sent
            </span>
          )}
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

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onDetailClick(code)}
          className="flex-1 py-2.5 px-4 bg-teal hover:bg-teal/90 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          View Details →
        </motion.button>
        <motion.a
          href={`/photo/${code.code}`}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center"
          title="Open photo link in new tab"
        >
          🔗
        </motion.a>
      </div>
    </motion.div>
  );
};

export default CodeCard;
