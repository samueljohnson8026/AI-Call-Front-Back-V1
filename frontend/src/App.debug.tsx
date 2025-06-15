import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from './contexts/UserContext';
import { useAuth } from './hooks/useAuth';

// Import components one by one to identify the problematic one
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
// import AgentsPage from './pages/AgentsPage'
// import CallsPage from './pages/CallsPage'
// import AppointmentsPage from './pages/AppointmentsPage'
// import CampaignsPage from './pages/CampaignsPage'
// import AnalyticsPage from './pages/AnalyticsPage'
// import DNCPage from './pages/DNCPage'
// import WebhooksPage from './pages/WebhooksPage'
// import BillingPage from './pages/BillingPage'
// import StatusPage from './pages/StatusPage'
// import SettingsPage from './pages/SettingsPage'
// import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DashboardPage />;
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