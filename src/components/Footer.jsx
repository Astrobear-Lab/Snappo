import { motion } from 'framer-motion';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: 'Instagram', icon: '📷', url: '#' },
    { name: 'Twitter', icon: '🐦', url: '#' },
    { name: 'TikTok', icon: '🎵', url: '#' },
  ];

  const links = [
    { title: 'About', url: '#' },
    { title: 'How It Works', url: '#' },
    { title: 'For Photographers', url: '#' },
    { title: 'FAQ', url: '#' },
    { title: 'Privacy', url: '#' },
    { title: 'Terms', url: '#' },
  ];

  return (
    <footer className="relative overflow-hidden gradient-teal-coral">
      {/* Wave Animation */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
        <svg
          className="relative block w-full h-24"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            fill="currentColor"
            className="text-navy opacity-20"
            animate={{
              d: [
                "M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z",
                "M321.39,70c58-10.79,114.16-20,172-30,82.39-16.72,168.19-17.73,250.45-.39C823.78,50,906.67,80,985.66,100c70.05,18.48,146.53,26.09,214.34,10V0H0V40A600.21,600.21,0,0,0,321.39,70Z",
                "M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z",
              ],
            }}
            transition={{
              repeat: Infinity,
              duration: 8,
              ease: 'easeInOut',
            }}
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-4xl font-bold text-white mb-4">Snappo</h3>
            <p className="text-white/80 text-lg font-light leading-relaxed">
              Made for the spontaneous,
              <br />
              by creators who love moments.
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h4 className="text-xl font-semibold text-white mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {links.map((link, index) => (
                <motion.li
                  key={index}
                  whileHover={{ x: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <a
                    href={link.url}
                    className="text-white/70 hover:text-white transition-colors text-lg"
                  >
                    {link.title}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Social & Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h4 className="text-xl font-semibold text-white mb-6">Stay Connected</h4>
            <div className="flex gap-4 mb-6">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.url}
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl hover:bg-white/30 transition-all"
                  title={social.name}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
            <p className="text-white/70 text-sm mb-4">
              Get notified about new features and special offers
            </p>
            <motion.div
              className="flex gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-grow px-4 py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-white/50"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-white text-teal font-semibold rounded-xl hover:bg-white/90 transition-all"
              >
                Join
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 my-8" />

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="flex flex-col md:flex-row justify-between items-center gap-4 text-white/70"
        >
          <p className="text-sm">
            © {currentYear} Snappo. All rights reserved. Built with ❤️ and ☕
          </p>
          <p className="text-sm italic">
            Every moment matters. Every code tells a story.
          </p>
        </motion.div>

        {/* Floating Elements */}
        <div className="absolute bottom-10 left-10 opacity-10">
          <motion.div
            className="text-8xl"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            📸
          </motion.div>
        </div>
        <div className="absolute top-20 right-10 opacity-10">
          <motion.div
            className="text-6xl"
            animate={{
              y: [0, -20, 0],
              rotate: [0, -360],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            ✨
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
