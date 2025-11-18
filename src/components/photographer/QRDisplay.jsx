import { motion } from 'framer-motion';
import { useState } from 'react';

const QRDisplay = ({ code, size = 'medium', showCode = true }) => {
  const [copied, setCopied] = useState(false);

  const sizeClasses = {
    small: 'w-24 h-24',
    medium: 'w-40 h-40',
    large: 'w-64 h-64',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate QR code URL (using a free QR API)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${code}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className={`${sizeClasses[size]} bg-white p-3 rounded-2xl shadow-lg relative overflow-hidden`}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <img
          src={qrUrl}
          alt={`QR Code for ${code}`}
          className="w-full h-full object-contain"
        />
      </motion.div>

      {showCode && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl">
            <span className="font-mono text-2xl font-bold text-gray-800">{code}</span>
          </div>

          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-teal text-white hover:bg-teal/90'
            }`}
          >
            {copied ? '✓ Copied!' : '📋 Copy Code'}
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default QRDisplay;
