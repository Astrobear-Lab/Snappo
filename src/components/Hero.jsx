import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const floatingPhotos = [
    { id: 1, rotation: -15, x: -20, y: 20, delay: 0 },
    { id: 2, rotation: 12, x: 30, y: -15, delay: 0.2 },
    { id: 3, rotation: -8, x: -15, y: -25, delay: 0.4 },
    { id: 4, rotation: 20, x: 25, y: 30, delay: 0.6 },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length === 6) {
      navigate(`/photo/${code.toUpperCase()}`);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-multi">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {floatingPhotos.map((photo) => (
          <motion.div
            key={photo.id}
            className="absolute w-32 h-32 bg-white/20 backdrop-blur-sm rounded-2xl shadow-2xl"
            style={{
              top: `${20 + photo.id * 15}%`,
              left: `${10 + photo.id * 20}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
              rotate: [photo.rotation, photo.rotation + 5, photo.rotation],
              x: [photo.x, photo.x + 10, photo.x],
              y: [photo.y, photo.y + 10, photo.y],
            }}
            transition={{
              duration: 4,
              delay: photo.delay,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="text-6xl md:text-8xl font-bold text-white mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Captured by chance.
            <br />
            <span className="text-navy bg-white/90 px-6 py-2 rounded-3xl inline-block mt-4">
              Owned by choice.
            </span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            A playful way to relive the memories you didn't know you'd captured.
          </motion.p>

          {/* Code Input */}
          <motion.form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <motion.input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter your 6-digit code"
              className="px-8 py-4 text-2xl font-semibold text-center rounded-full bg-white/95 text-navy shadow-2xl outline-none focus:ring-4 focus:ring-white/50 transition-all w-full md:w-96"
              whileFocus={{ scale: 1.05 }}
            />
            <motion.button
              type="submit"
              className="px-10 py-4 bg-navy text-white font-semibold text-lg rounded-full shadow-2xl hover:shadow-3xl transition-all"
              whileHover={{ scale: 1.1, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              Find My Photo 📸
            </motion.button>
          </motion.form>

          <motion.p
            className="text-white/70 mt-6 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Don't have a code yet? Explore how it works below ↓
          </motion.p>
        </motion.div>
      </div>

      {/* Camera Flash Effect */}
      <motion.div
        className="absolute inset-0 bg-white pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 5,
        }}
      />
    </section>
  );
};

export default Hero;
