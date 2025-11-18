import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PhotographerProvider } from './contexts/PhotographerContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import EmotionalStory from './components/EmotionalStory';
import ForWho from './components/ForWho';
import CTA from './components/CTA';
import Footer from './components/Footer';
import PhotographerDashboard from './components/PhotographerDashboard';
import PhotoView from './pages/PhotoView';

// Home Page Component
const HomePage = () => (
  <>
    <Hero />
    <HowItWorks />
    <EmotionalStory />
    <ForWho />
    <CTA />
    <Footer />
  </>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <PhotographerProvider>
          <div className="min-h-screen">
            <Navbar />
            <div className="pt-20">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<PhotographerDashboard />} />
                <Route path="/photo/:code" element={<PhotoView />} />
              </Routes>
            </div>
          </div>
        </PhotographerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
