import { motion } from 'framer-motion';
import { useState } from 'react';
import StatusPill from './StatusPill';
import QRDisplay from './QRDisplay';

const CodeCard = ({ code, onUploadClick, onDetailClick }) => {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate photo link
  const photoLink = `${window.location.origin}/photo/${code.code}`;

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

  const formatTimeRemaining = (date) => {
    const ms = date - new Date();
    if (ms < 0) return 'Expired';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h left`;
    const days = Math.floor(hours / 24);
    return `${days}d left`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(photoLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-mono text-2xl font-bold text-gray-800">
              {code.code}
            </h3>
            <StatusPill status={code.status} />
          </div>

          {/* Shareable Link */}
          <div className="mb-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Share Link</span>
            </div>
            <a
              href={photoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-teal hover:text-teal/80 underline break-all"
            >
              {photoLink}
            </a>
            <div className="flex gap-2 mt-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyLink}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  copiedLink
                    ? 'bg-green-500 text-white'
                    : 'bg-teal text-white hover:bg-teal/90'
                }`}
              >
                {copiedLink ? '✓ Copied!' : '🔗 Copy Link'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.open(photoLink, '_blank')}
                className="py-1.5 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
              >
                👁️ Preview
              </motion.button>
            </div>
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
      {showQR && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 pt-4 border-t border-gray-100"
        >
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-3">Scan to view photo</p>
            <QRDisplay code={code.code} link={photoLink} size="medium" />
          </div>
        </motion.div>
      )}

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
                src={photo.url}
                alt="Photo"
                className="w-full h-full object-cover"
              />
              {photo.watermarked && (
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
          onClick={handleCopyCode}
          className={`flex-1 py-2 px-3 font-semibold rounded-lg text-sm transition-colors ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy Code'}
        </motion.button>

        {code.status === 'pending_upload' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onUploadClick(code)}
            className="flex-1 py-2 px-3 bg-teal hover:bg-teal/90 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            📸 Upload
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
