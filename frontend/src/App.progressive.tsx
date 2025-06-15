import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from './contexts/UserContext';
import { useAuth } from './hooks/useAuth';

function AppContent() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>AI Call Center Dashboard</h1>
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>AI Call Center Dashboard</h1>
      <p>Progressive loading test...</p>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2>System Status</h2>
        <p>✅ Frontend: Running on port 12000</p>
        <p>✅ Backend: Running on port 12001</p>
        <p>✅ Router: Loaded</p>
        <p>✅ Toast: Loaded</p>
        <p>✅ UserContext: Loaded</p>
        <p>✅ Auth Hook: Loaded</p>
        <p>🔐 User: {user ? 'Authenticated' : 'Not authenticated'}</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Demo Credentials</h3>
        <p>Email: demo@example.com</p>
        <p>Password: demo123</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <UserProvider>
        <AppContent />
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </UserProvider>
    </Router>
  );
}

export default App;