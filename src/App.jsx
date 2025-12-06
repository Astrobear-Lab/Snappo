import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import ProtectedRoute from './components/ProtectedRoute';

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

// Layout wrapper to conditionally show Navbar
const Layout = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <div className="min-h-screen">
      {!isDashboard && <Navbar />}
      <div className={!isDashboard ? 'pt-20' : ''}>
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <PhotographerProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <PhotographerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/photo/:code" element={<PhotoView />} />
            </Routes>
          </Layout>
        </PhotographerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
