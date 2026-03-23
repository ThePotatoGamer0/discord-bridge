import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireVerified = false }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-dim)', fontSize: '0.9rem'
    }}>
      Loading...
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  // Use top-level verified which is normalized by AuthContext
  if (requireVerified && !user.verified) {
    return <Navigate to="/verify" replace />;
  }

  return children;
}