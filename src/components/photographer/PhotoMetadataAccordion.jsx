import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const PhotoMetadataAccordion = ({ photo, exif }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Format EXIF data
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(date);
    }
  };

  const formatExposureTime = (time) => {
    if (!time) return 'N/A';
    if (time < 1) {
      return `1/${Math.round(1 / time)}s`;
    }
    return `${time}s`;
  };

  const formatAperture = (fNumber) => {
    if (!fNumber) return 'N/A';
    return `f/${fNumber}`;
  };

  const formatFocalLength = (length) => {
    if (!length) return 'N/A';
    return `${length}mm`;
  };

  const formatGPS = (lat, lon) => {
    if (!lat || !lon) return null;
    return {
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
      mapsUrl: `https://www.google.com/maps?q=${lat},${lon}`,
    };
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  if (!exif) {
    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-center">
        <p className="text-xs text-gray-500">
          No metadata available for this photo
        </p>
      </div>
    );
  }

  const gps = formatGPS(exif.latitude, exif.longitude);
  const hasAnyData = exif.Make || exif.Model || exif.DateTimeOriginal || exif.ISO || gps;

  if (!hasAnyData) {
    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-center">
        <p className="text-xs text-gray-500">
          Limited metadata available for this photo
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between"
      >
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span>📊</span>
          <span>Photo Details</span>
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-500"
        >
          ▼
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg space-y-4">
              {/* Camera Info */}
              {(exif.Make || exif.Model) && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <span>📷</span>
                    <span>Camera</span>
                  </h4>
                  <div className="space-y-1">
                    {exif.Make && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Make:</span>
                        <span className="font-semibold text-gray-800">
                          {exif.Make}
                        </span>
                      </div>
                    )}
                    {exif.Model && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Model:</span>
                        <span className="font-semibold text-gray-800">
                          {exif.Model}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Date/Time */}
              {exif.DateTimeOriginal && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <span>📅</span>
                    <span>Captured</span>
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-semibold text-gray-800">
                      {formatDate(exif.DateTimeOriginal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Settings */}
              {(exif.ISO || exif.FNumber || exif.ExposureTime || exif.FocalLength) && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <span>⚙️</span>
                    <span>Settings</span>
                  </h4>
                  <div className="space-y-1">
                    {exif.ISO && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">ISO:</span>
                        <span className="font-semibold text-gray-800">
                          {exif.ISO}
                        </span>
                      </div>
                    )}
                    {exif.FNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Aperture:</span>
                        <span className="font-semibold text-gray-800">
                          {formatAperture(exif.FNumber)}
                        </span>
                      </div>
                    )}
                    {exif.ExposureTime && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shutter:</span>
                        <span className="font-semibold text-gray-800">
                          {formatExposureTime(exif.ExposureTime)}
                        </span>
                      </div>
                    )}
                    {exif.FocalLength && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Focal Length:</span>
                        <span className="font-semibold text-gray-800">
                          {formatFocalLength(exif.FocalLength)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lens Info */}
              {exif.LensModel && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <span>🔍</span>
                    <span>Lens</span>
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-semibold text-gray-800">
                      {exif.LensModel}
                    </span>
                  </div>
                </div>
              )}

              {/* Image Info */}
              {(exif.ImageWidth || exif.ImageHeight || photo?.file?.size) && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <span>📐</span>
                    <span>Image</span>
                  </h4>
                  <div className="space-y-1">
                    {exif.ImageWidth && exif.ImageHeight && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Resolution:</span>
                        <span className="font-semibold text-gray-800">
                          {exif.ImageWidth} × {exif.ImageHeight}
                        </span>
                      </div>
                    )}
                    {photo?.file?.size && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">File Size:</span>
                        <span className="font-semibold text-gray-800">
                          {formatFileSize(photo.file.size)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GPS Info */}
              {gps && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <span>📍</span>
                    <span>Location</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Latitude:</span>
                        <span className="font-mono text-xs text-gray-800">
                          {gps.lat}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Longitude:</span>
                        <span className="font-mono text-xs text-gray-800">
                          {gps.lon}
                        </span>
                      </div>
                    </div>
                    <a
                      href={gps.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      📍 View on Google Maps
                    </a>
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {(exif.WhiteBalance || exif.Flash || exif.ColorSpace) && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <span>ℹ️</span>
                    <span>Other</span>
                  </h4>
                  <div className="space-y-1">
                    {exif.WhiteBalance !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">White Balance:</span>
                        <span className="font-semibold text-gray-800">
                          {exif.WhiteBalance === 0 ? 'Auto' : 'Manual'}
                        </span>
                      </div>
                    )}
                    {exif.Flash !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Flash:</span>
                        <span className="font-semibold text-gray-800">
                          {exif.Flash === 0 ? 'No Flash' : 'Flash Fired'}
                        </span>
                      </div>
                    )}
                    {exif.ColorSpace && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Color Space:</span>
                        <span className="font-semibold text-gray-800">
                          {exif.ColorSpace === 1 ? 'sRGB' : 'Adobe RGB'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotoMetadataAccordion;
