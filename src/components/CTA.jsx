import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CTA = () => {
  const [code, setCode] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length === 6) {
      navigate(`/photo/${code.toUpperCase()}`);
    }
  };

  return (
    <section className="relative py-32 px-6 overflow-hidden gradient-navy-purple">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Were you snapped today?
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-12 font-light">
            No app needed. Just a code.
          </p>
        </motion.div>

        {/* Code Input Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <motion.div
              className="relative"
              animate={{
                scale: isFocused ? 1.05 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="ABC123"
                className="px-12 py-6 text-3xl font-bold text-center rounded-2xl bg-white text-navy shadow-2xl outline-none focus:ring-4 focus:ring-teal transition-all w-full md:w-96 tracking-widest"
              />
              {code.length === 6 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-3 -top-3 bg-teal text-white w-10 h-10 rounded-full flex items-center justify-center text-xl"
                >
                  ✓
                </motion.div>
              )}
            </motion.div>

            <motion.button
              type="submit"
              disabled={code.length !== 6}
              className={`px-10 py-6 font-bold text-xl rounded-2xl shadow-2xl transition-all ${
                code.length === 6
                  ? 'bg-teal text-white hover:bg-teal/90'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
              whileHover={code.length === 6 ? { scale: 1.1 } : {}}
              whileTap={code.length === 6 ? { scale: 0.95 } : {}}
            >
              Unlock Photo 🔓
            </motion.button>
          </div>

          {/* Helper Text */}
          <motion.p
            className="text-white/60 mt-6 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {code.length === 0
              ? 'Enter the 6-character code you received'
              : code.length < 6
              ? `${6 - code.length} more character${6 - code.length !== 1 ? 's' : ''}`
              : 'Ready to unlock!'}
          </motion.p>
        </motion.form>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
        >
          {[
            { icon: '⚡', text: 'Instant Access' },
            { icon: '🆓', text: 'Free Preview' },
            { icon: '💎', text: '$3 Full Quality' },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.05 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
            >
              <div className="text-4xl mb-3">{item.icon}</div>
              <p className="text-white font-semibold text-lg">{item.text}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Confetti Effect on Hover */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-white/70 text-lg italic">
            "Your memories are waiting to be discovered"
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
