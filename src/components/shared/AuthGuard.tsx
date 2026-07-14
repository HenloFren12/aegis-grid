import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authSlice';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { staffId, role } = useAuthStore();
  
  // Strict check: Must have an ID and a valid role
  if (!staffId || !['organizer', 'staff'].includes(role ?? '')) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}