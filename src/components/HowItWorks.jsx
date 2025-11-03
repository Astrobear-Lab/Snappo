import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const steps = [
    {
      icon: '📸',
      title: 'Camera Flash',
      description: 'A photographer captures your perfect moment',
      color: 'from-peach to-cream',
      emoji: '✨',
    },
    {
      icon: '🎟️',
      title: 'Get Your Code',
      description: 'Receive a unique 6-digit code on the spot',
      color: 'from-teal to-cyan-300',
      emoji: '🔑',
    },
    {
      icon: '⌨️',
      title: 'Enter & Unlock',
      description: 'Type your code on our website anytime',
      color: 'from-purple to-pink-400',
      emoji: '🎯',
    },
    {
      icon: '💾',
      title: 'Download',
      description: 'Get your photo - watermarked free or $3 for full quality',
      color: 'from-coral to-orange-400',
      emoji: '🎉',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        bounce: 0.4,
        duration: 0.8,
      },
    },
  };

  return (
    <section ref={ref} className="py-24 px-6 bg-gradient-to-b from-white to-cream">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-7xl font-bold text-navy mb-6">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Four simple steps from captured moment to cherished memory
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="relative"
            >
              <motion.div
                className={`bg-gradient-to-br ${step.color} p-8 rounded-3xl shadow-2xl h-full relative overflow-hidden`}
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {/* Background Emoji */}
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-10">
                  {step.emoji}
                </div>

                {/* Step Number */}
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/50 rounded-full flex items-center justify-center font-bold text-2xl text-navy">
                  {index + 1}
                </div>

                {/* Icon */}
                <motion.div
                  className="text-7xl mb-6"
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  {step.icon}
                </motion.div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-navy mb-4">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-700 text-lg leading-relaxed">
                  {step.description}
                </p>

                {/* Arrow to next step */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-12 top-1/2 transform -translate-y-1/2 text-4xl text-gray-300">
                    →
                  </div>
                )}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-2xl text-gray-600 font-light">
            It's that simple. No app, no login, just your code.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
