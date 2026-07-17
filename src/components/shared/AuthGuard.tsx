import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function AuthGuard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If a user object exists, they are logged in
      setIsAuthenticated(!!user);
    });
    
    return () => unsubscribe();
  }, []);

  // Show a blank/loading screen while checking Firebase Auth status
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212', color: 'white' }}>
        Verifying Command Center Credentials...
      </div>
    );
  }

  // If logged in, render the protected routes (Dashboard, Upload, etc.)
  // If not logged in, kick them back to the /login screen
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}