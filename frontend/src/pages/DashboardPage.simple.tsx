import { useUser } from '../contexts/UserContext';

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '30px'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#1f2937',
          marginBottom: '10px'
        }}>
          🎉 Welcome to AI Call Center Dashboard!
        </h1>
        
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#6b7280',
          marginBottom: '30px'
        }}>
          Authentication successful! You're now logged into the system.
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#059669', marginBottom: '10px' }}>✅ System Status</h3>
            <p>Frontend: Running on port 12000</p>
            <p>Backend: Running on port 12001</p>
            <p>Authentication: Active</p>
            <p>Demo Mode: Enabled</p>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '10px' }}>👤 User Information</h3>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Plan:</strong> {user?.plan_name}</p>
            <p><strong>Status:</strong> {user?.is_active ? 'Active' : 'Inactive'}</p>
            <p><strong>Minutes Used:</strong> {user?.minutes_used || 0} / {user?.monthly_minute_limit || 0}</p>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '10px' }}>🚀 Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button style={{
                padding: '10px 15px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}>
                Create AI Agent
              </button>
              <button style={{
                padding: '10px 15px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}>
                Start Campaign
              </button>
              <button style={{
                padding: '10px 15px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}>
                View Call Logs
              </button>
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>📊 Platform Features</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🤖</div>
              <p><strong>AI Agents</strong></p>
              <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Intelligent call handling</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '5px' }}>📞</div>
              <p><strong>Call Management</strong></p>
              <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Inbound & outbound calls</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '5px' }}>📈</div>
              <p><strong>Analytics</strong></p>
              <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Real-time insights</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '5px' }}>🎯</div>
              <p><strong>Campaigns</strong></p>
              <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Automated outreach</p>
            </div>
          </div>
        </div>

        <div style={{ 
          marginTop: '30px', 
          textAlign: 'center',
          padding: '20px',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe'
        }}>
          <h4 style={{ color: '#1e40af', marginBottom: '10px' }}>🎯 Next Steps</h4>
          <p style={{ color: '#1e40af' }}>
            Your AI Call Center is ready! Start by creating your first AI agent or setting up a campaign.
          </p>
        </div>
      </div>
    </div>
  );
}