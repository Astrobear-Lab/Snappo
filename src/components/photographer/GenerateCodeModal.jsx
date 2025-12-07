import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { supabase } from '../../lib/supabase';
import QRDisplay from './QRDisplay';

const GenerateCodeModal = ({ isOpen, onClose }) => {
  const { createCode, fetchCodes } = usePhotographer();
  const [step, setStep] = useState(1); // 1: form, 2: success
  const [generatedCode, setGeneratedCode] = useState(null);
  const [formData, setFormData] = useState({
    note: '',
    tags: '',
  });

  const handleGenerate = async () => {
    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Generate actual code using Supabase RPC
      const { data: codeData, error: codeError } = await supabase.rpc(
        'generate_photo_code'
      );

      if (codeError) throw codeError;

      // Create photo code record (without photo_id for now)
      const { data: photoCodeData, error: photoCodeError } = await supabase
        .from('photo_codes')
        .insert([
          {
            code: codeData,
            note: formData.note.trim() || null,
            tags: tags.length > 0 ? tags : null,
            expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
            shared_at: new Date().toISOString(), // Set shared_at immediately as code is shareable
          },
        ])
        .select()
        .single();

      if (photoCodeError) throw photoCodeError;

      // Refresh codes from database
      await fetchCodes();

      // Create code object for UI
      const code = {
        id: photoCodeData.id,
        code: codeData,
        status: 'pending_upload',
        createdAt: new Date(photoCodeData.created_at),
        expiresAt: new Date(photoCodeData.expires_at),
        tags,
        note: formData.note,
        photos: [],
        views: 0,
        unlocks: 0,
      };

      setGeneratedCode(code);
      setStep(2);
    } catch (error) {
      console.error('Failed to generate code:', error);
      alert('Failed to generate code. Please try again.');
    }
  };

  const handleClose = () => {
    setStep(1);
    setGeneratedCode(null);
    setFormData({ note: '', tags: '' });
    onClose();
  };

  const handleShare = () => {
    const shareText = `Check out my photos! Use code: ${generatedCode.code}`;
    if (navigator.share) {
      navigator.share({
        title: 'Photo Code',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
              >
                <span className="text-2xl text-gray-600">×</span>
              </button>

              {step === 1 ? (
                <>
                  {/* Header */}
                  <div className="gradient-multi p-8 text-center">
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-white"
                    >
                      <div className="text-6xl mb-4">✨</div>
                      <h2 className="text-4xl font-bold mb-2">Generate Code</h2>
                      <p className="text-white/90 text-lg">
                        Create a unique code for your next photoshoot
                      </p>
                    </motion.div>
                  </div>

                  {/* Form */}
                  <div className="p-8">
                    <div className="space-y-6">
                      {/* Note */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.note}
                          onChange={(e) =>
                            setFormData({ ...formData, note: e.target.value })
                          }
                          placeholder="e.g., Sarah & Tom wedding"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all"
                        />
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Tags (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) =>
                            setFormData({ ...formData, tags: e.target.value })
                          }
                          placeholder="e.g., wedding, outdoor, portrait"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Separate tags with commas
                        </p>
                      </div>

                      {/* Info Box */}
                      <div className="p-4 bg-teal/10 border border-teal/20 rounded-xl">
                        <p className="text-sm text-gray-700">
                          💡 <strong>Tip:</strong> Show the QR code to clients on-site,
                          then upload photos later and match them to this code.
                        </p>
                      </div>

                      {/* Generate Button */}
                      <motion.button
                        onClick={handleGenerate}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold text-lg rounded-xl shadow-lg transition-all"
                      >
                        Generate Code 🚀
                      </motion.button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Success Screen */}
                  <div className="p-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="text-center mb-6"
                    >
                      <div className="text-6xl mb-4">🎉</div>
                      <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Code Created!
                      </h2>
                      <p className="text-gray-600">
                        Share this code with your client
                      </p>
                    </motion.div>

                    {/* QR Display */}
                    <div className="mb-6">
                      <QRDisplay
                        code={generatedCode.code}
                        link={`${window.location.origin}/photo/${generatedCode.code}`}
                        size="large"
                      />
                    </div>

                    {/* Code Details */}
                    {generatedCode.note && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                        <div className="text-sm text-gray-500 mb-1">Note</div>
                        <div className="font-semibold text-gray-800">
                          {generatedCode.note}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                      <motion.button
                        onClick={handleShare}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 bg-teal text-white font-semibold rounded-xl shadow-md hover:bg-teal/90 transition-colors"
                      >
                        📤 Share Code
                      </motion.button>

                      <motion.button
                        onClick={handleClose}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Done
                      </motion.button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GenerateCodeModal;
