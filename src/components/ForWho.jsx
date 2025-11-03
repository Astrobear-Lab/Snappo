import { motion } from 'framer-motion';
import { useState } from 'react';

const ForWho = () => {
  const [flippedCard, setFlippedCard] = useState(null);

  const cards = [
    {
      id: 'photographer',
      front: {
        icon: '📷',
        title: 'For Photographers',
        subtitle: 'Turn your passion into profit',
        color: 'from-purple to-pink-500',
      },
      back: {
        title: 'Earn While Sharing Moments',
        points: [
          '💰 Earn $2 per photo sold',
          '🎨 Build your portfolio naturally',
          '🌍 Connect with people worldwide',
          '⚡ Instant code generation',
          '📊 Track your earnings in real-time',
        ],
        cta: 'Become a Photographer',
      },
    },
    {
      id: 'user',
      front: {
        icon: '🎭',
        title: 'For Users',
        subtitle: 'Find your hidden memories',
        color: 'from-teal to-cyan-500',
      },
      back: {
        title: 'Discover Your Best Moments',
        points: [
          '✨ Spontaneous, authentic photos',
          '🆓 Free watermarked preview',
          '💎 $3 for full quality',
          '📱 No app installation needed',
          '🔒 Secure and private',
        ],
        cta: 'Enter Your Code',
      },
    },
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-white via-cream to-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-7xl font-bold text-navy mb-6">
            Made For Everyone
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Whether you're capturing moments or looking for yours
          </p>
        </motion.div>

        {/* Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              className="relative h-[500px] perspective-1000"
              onMouseEnter={() => setFlippedCard(card.id)}
              onMouseLeave={() => setFlippedCard(null)}
            >
              <motion.div
                className="relative w-full h-full"
                animate={{
                  rotateY: flippedCard === card.id ? 180 : 0,
                }}
                transition={{ duration: 0.6 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front of Card */}
                <div
                  className={`absolute w-full h-full bg-gradient-to-br ${card.front.color} rounded-3xl shadow-2xl p-12 flex flex-col items-center justify-center text-center`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <motion.div
                    className="text-9xl mb-6"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  >
                    {card.front.icon}
                  </motion.div>
                  <h3 className="text-4xl font-bold text-white mb-4">
                    {card.front.title}
                  </h3>
                  <p className="text-xl text-white/90 font-light">
                    {card.front.subtitle}
                  </p>
                  <motion.div
                    className="mt-8 text-white/70 text-sm"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Hover to learn more →
                  </motion.div>
                </div>

                {/* Back of Card */}
                <div
                  className="absolute w-full h-full bg-white rounded-3xl shadow-2xl p-12 flex flex-col"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <h3 className="text-3xl font-bold text-navy mb-8">
                    {card.back.title}
                  </h3>
                  <ul className="space-y-4 flex-grow">
                    {card.back.points.map((point, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={
                          flippedCard === card.id
                            ? { opacity: 1, x: 0 }
                            : { opacity: 0, x: -20 }
                        }
                        transition={{ delay: i * 0.1 }}
                        className="text-lg text-gray-700 flex items-start"
                      >
                        <span className="mr-3">{point}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <motion.button
                    className={`mt-8 w-full py-4 bg-gradient-to-r ${card.front.color} text-white font-bold text-lg rounded-full shadow-lg`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {card.back.cta}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-20"
        >
          <p className="text-2xl text-gray-600 font-light max-w-3xl mx-auto">
            Join a community that believes every moment deserves to be remembered
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ForWho;
