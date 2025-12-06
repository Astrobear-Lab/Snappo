import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PhotoUpload = ({ photographerProfile, onUploadSuccess }) => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
  });

  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    handleFile(selectedFile);
  };

  const handleFile = (selectedFile) => {
    setError('');

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const filePath = `user-${user.id}/${fileName}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload original photo
      const { data: originalData, error: originalError } = await supabase.storage
        .from('photos-original')
        .upload(`${filePath}.${fileExt}`, file);

      if (originalError) throw originalError;

      // Upload watermarked version (for now, same file - add watermark later)
      const { data: watermarkedData, error: watermarkedError } = await supabase.storage
        .from('photos')
        .upload(`${filePath}-watermarked.${fileExt}`, file);

      if (watermarkedError) throw watermarkedError;

      clearInterval(progressInterval);
      setProgress(95);

      // Get public URL for watermarked version
      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(`${filePath}-watermarked.${fileExt}`);

      // Create photo record
      const { data: photoData, error: photoError } = await supabase
        .from('photos')
        .insert([
          {
            photographer_id: photographerProfile.id,
            file_url: originalData.path,
            watermarked_url: watermarkedData.path,
            title: formData.title,
            description: formData.description || null,
            location: formData.location || null,
            status: 'pending', // Will be auto-approved after moderation
            file_size: file.size,
          },
        ])
        .select()
        .single();

      if (photoError) throw photoError;

      // For now, create a new code for each photo
      // TODO: In the future, use existing codes from GenerateCodeModal
      const { data: codeData, error: codeError } = await supabase.rpc(
        'generate_photo_code'
      );

      if (codeError) throw codeError;

      // Create photo code record (without photo_id)
      const { data: photoCodeData, error: photoCodeError } = await supabase
        .from('photo_codes')
        .insert([
          {
            code: codeData,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          },
        ])
        .select()
        .single();

      if (photoCodeError) throw photoCodeError;

      // Link photo to code in code_photos table
      const { error: linkError } = await supabase
        .from('code_photos')
        .insert([
          {
            code_id: photoCodeData.id,
            photo_id: photoData.id,
          },
        ]);

      if (linkError) throw linkError;

      setProgress(100);

      // Auto-approve for now (in production, add moderation)
      await supabase
        .from('photos')
        .update({ status: 'approved' })
        .eq('id', photoData.id);

      // Reset form
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setFormData({ title: '', description: '', location: '' });
        setProgress(0);
        onUploadSuccess &&
          onUploadSuccess({ ...photoData, code: codeData });
      }, 1000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload photo');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setFormData({ title: '', description: '', location: '' });
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {!preview ? (
        // Upload Area
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-teal bg-teal/5 scale-105'
              : 'border-gray-300 hover:border-teal hover:bg-gray-50'
          }`}
          whileHover={{ scale: 1.01 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-2xl font-bold text-navy mb-2">
            {isDragging ? 'Drop your photo here' : 'Upload a Photo'}
          </h3>
          <p className="text-gray-600 mb-6">
            Drag & drop or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Supports: JPG, PNG, WebP • Max 10MB
          </p>
        </motion.div>
      ) : (
        // Preview & Form
        <div className="space-y-6">
          {/* Preview */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-96 object-cover"
            />
            <div className="absolute top-4 right-4">
              <motion.button
                onClick={handleReset}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full font-semibold text-gray-700 shadow-lg"
              >
                Change Photo
              </motion.button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <div className="bg-white rounded-3xl shadow-lg p-8 space-y-6">
            <h3 className="text-2xl font-bold text-navy">Photo Details</h3>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Sunset at Central Park"
                required
                disabled={uploading}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all disabled:opacity-50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add details about this photo..."
                rows={3}
                disabled={uploading}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all resize-none disabled:opacity-50"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Central Park, NYC"
                disabled={uploading}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all disabled:opacity-50"
              />
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-teal to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Uploading... {progress}%
                </p>
              </div>
            )}

            {/* Upload Button */}
            <motion.button
              onClick={handleUpload}
              disabled={uploading || !file}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploading ? 'Uploading...' : 'Upload Photo & Generate Code 🚀'}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
