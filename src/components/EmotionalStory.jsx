import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const EmotionalStory = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.8, 1, 1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section
      ref={ref}
      className="relative py-32 px-6 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FFF5E6 0%, #FFB7A8 50%, #4FD1C5 100%)',
      }}
    >
      {/* Parallax Background Shapes */}
      <motion.div
        className="absolute top-20 left-10 w-64 h-64 bg-white/20 rounded-full blur-3xl"
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 200]) }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-coral/20 rounded-full blur-3xl"
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, -200]) }}
      />

      <motion.div
        style={{ opacity, scale }}
        className="max-w-4xl mx-auto text-center relative z-10"
      >
        {/* Main Quote */}
        <motion.div
          style={{ y }}
          className="mb-16"
        >
          <h2 className="text-5xl md:text-7xl font-bold text-navy mb-8 leading-tight">
            Some moments are too beautiful
            <br />
            <span className="text-white bg-navy px-8 py-3 rounded-3xl inline-block mt-4">
              to disappear
            </span>
          </h2>
        </motion.div>

        {/* Story Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {[
            {
              emoji: '🌅',
              title: 'Spontaneous',
              text: 'The best photos happen when you least expect them',
            },
            {
              emoji: '💫',
              title: 'Authentic',
              text: 'Real moments, captured by real people',
            },
            {
              emoji: '❤️',
              title: 'Yours Forever',
              text: 'A memory worth keeping, a story worth telling',
            },
          ].map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              whileHover={{ y: -10, scale: 1.05 }}
              className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-xl"
            >
              <div className="text-6xl mb-4">{card.emoji}</div>
              <h3 className="text-2xl font-bold text-navy mb-3">{card.title}</h3>
              <p className="text-gray-600 text-lg">{card.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Photo Montage Simulation */}
        <motion.div
          className="mt-20 relative h-64"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-white/40 backdrop-blur-md rounded-2xl shadow-2xl"
              style={{
                width: `${120 + i * 20}px`,
                height: `${150 + i * 25}px`,
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 2) * 30}px`,
                rotate: `${-15 + i * 7}deg`,
              }}
              initial={{ opacity: 0, scale: 0, rotate: 0 }}
              whileInView={{
                opacity: 0.6,
                scale: 1,
                rotate: -15 + i * 7,
              }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                type: 'spring',
              }}
              whileHover={{
                scale: 1.1,
                zIndex: 10,
                rotate: 0,
                opacity: 1,
              }}
            />
          ))}
        </motion.div>

        {/* Bottom Text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="text-white text-2xl font-light mt-16 italic"
        >
          "Every photo tells a story. Every code unlocks a memory."
        </motion.p>
      </motion.div>
    </section>
  );
};

export default EmotionalStory;
