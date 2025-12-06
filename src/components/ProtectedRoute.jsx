import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal/5 to-cyan-500/5">
        <div className="text-center">
          {/* Large Snappo Logo/Text */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-teal to-cyan-500 bg-clip-text text-transparent mb-2">
              Snappo
            </h1>
            <p className="text-gray-500 text-sm">Photographer Dashboard</p>
          </div>

          {/* Animated Spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal/20"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal border-t-transparent absolute top-0"></div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="space-y-2">
            <p className="text-xl font-semibold text-gray-800">로딩 중...</p>
            <p className="text-sm text-gray-500">인증 상태를 확인하고 있습니다</p>
          </div>

          {/* Animated Dots */}
          <div className="flex justify-center gap-2 mt-4">
            <div className="w-2 h-2 bg-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to home page if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;
