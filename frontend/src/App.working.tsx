import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from './contexts/UserContext';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
// Temporarily comment out imports to test
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
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Temporary placeholder components
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
    <p className="text-gray-600">This page is under development.</p>
  </div>
);

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/agents" element={<PlaceholderPage title="AI Agents" />} />
        <Route path="/calls" element={<PlaceholderPage title="Call History" />} />
        <Route path="/appointments" element={<PlaceholderPage title="Appointments" />} />
        <Route path="/campaigns" element={<PlaceholderPage title="Campaigns" />} />
        <Route path="/analytics" element={<PlaceholderPage title="Analytics" />} />
        <Route path="/dnc" element={<PlaceholderPage title="DNC List" />} />
        <Route path="/webhooks" element={<PlaceholderPage title="Webhooks" />} />
        <Route path="/billing" element={<PlaceholderPage title="Billing" />} />
        <Route path="/status" element={<PlaceholderPage title="Status" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
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