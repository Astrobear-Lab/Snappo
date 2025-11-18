import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import PhotoMetadataAccordion from './PhotoMetadataAccordion';

const UploadMatchPanel = ({ preselectedCode = null }) => {
  const {
    uploads,
    codes,
    uploadPhotos,
    matchPhotosToCode,
    getAutoMatchSuggestions,
  } = usePhotographer();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedCode, setSelectedCode] = useState(preselectedCode?.id || '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const unmatchedUploads = uploads.filter((u) => !u.matched);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );

      if (files.length > 0) {
        uploadPhotos(files);
      }
    },
    [uploadPhotos]
  );

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      uploadPhotos(files);
    }
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleMatch = () => {
    if (selectedPhotos.length > 0 && selectedCode) {
      matchPhotosToCode(selectedPhotos, selectedCode);
      setSelectedPhotos([]);
      setSelectedCode(preselectedCode?.id || '');
    }
  };

  const handleAutoMatch = (upload) => {
    const suggestions = getAutoMatchSuggestions(upload);
    if (suggestions.length > 0) {
      matchPhotosToCode([upload.id], suggestions[0].id);
    }
  };

  const availableCodes = codes.filter(
    (c) => c.status !== 'expired' && c.status !== 'unlocked'
  );

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Upload & Match
        </h2>
        <p className="text-gray-600">
          Upload photos and match them to your codes
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative mb-6 border-2 border-dashed rounded-2xl p-8 transition-all ${
          isDragging
            ? 'border-teal bg-teal/5 scale-105'
            : 'border-gray-300 hover:border-teal/50'
        }`}
      >
        <div className="text-center">
          <motion.div
            animate={{ scale: isDragging ? 1.1 : 1 }}
            className="text-6xl mb-4"
          >
            📸
          </motion.div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Drop photos here
          </h3>
          <p className="text-gray-600 mb-4">or click to browse</p>

          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="photo-upload"
          />
          <label htmlFor="photo-upload">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block px-6 py-3 bg-teal text-white font-semibold rounded-xl cursor-pointer hover:bg-teal/90 transition-colors"
            >
              Browse Files
            </motion.div>
          </label>
        </div>
      </div>

      {/* Unmatched Photos */}
      {unmatchedUploads.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              Unmatched Photos ({unmatchedUploads.length})
            </h3>
            {selectedPhotos.length > 0 && (
              <span className="text-sm text-teal font-semibold">
                {selectedPhotos.length} selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
            {unmatchedUploads.map((upload) => {
              const isSelected = selectedPhotos.includes(upload.id);
              const suggestions = getAutoMatchSuggestions(upload);

              return (
                <motion.div
                  key={upload.id}
                  layout
                  className="flex flex-col"
                >
                  <div className="relative group">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      onClick={() => togglePhotoSelection(upload.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-4 transition-all ${
                        isSelected
                          ? 'border-teal shadow-lg'
                          : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <img
                        src={upload.url}
                        alt="Upload"
                        className="w-full h-full object-cover"
                      />

                      {isSelected && (
                        <div className="absolute inset-0 bg-teal/20 flex items-center justify-center">
                          <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center text-white font-bold">
                            ✓
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* Auto-match suggestion */}
                    {suggestions.length > 0 && (
                      <motion.button
                        onClick={() => handleAutoMatch(upload)}
                        whileHover={{ scale: 1.05 }}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
                      >
                        → {suggestions[0].code}
                      </motion.button>
                    )}
                  </div>

                  {/* Photo Metadata Accordion */}
                  <PhotoMetadataAccordion photo={upload} exif={upload.exif} />
                </motion.div>
              );
            })}
          </div>

          {/* Match Controls */}
          {selectedPhotos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gray-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Match to code:
                  </label>
                  <select
                    value={selectedCode}
                    onChange={(e) => setSelectedCode(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none"
                  >
                    <option value="">Select a code...</option>
                    {availableCodes.map((code) => (
                      <option key={code.id} value={code.id}>
                        {code.code}
                        {code.note ? ` - ${code.note}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <motion.button
                  onClick={handleMatch}
                  disabled={!selectedCode}
                  whileHover={{ scale: selectedCode ? 1.05 : 1 }}
                  whileTap={{ scale: selectedCode ? 0.95 : 1 }}
                  className="px-6 py-2 bg-teal text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal/90 transition-colors self-end"
                >
                  Match {selectedPhotos.length}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Empty State */}
      {unmatchedUploads.length === 0 && (
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-gray-600">
            Upload photos to get started
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadMatchPanel;
