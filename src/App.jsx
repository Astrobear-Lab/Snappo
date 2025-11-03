import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import EmotionalStory from './components/EmotionalStory';
import ForWho from './components/ForWho';
import CTA from './components/CTA';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen">
      <Hero />
      <HowItWorks />
      <EmotionalStory />
      <ForWho />
      <CTA />
      <Footer />
    </div>
  );
}

export default App;
