import { useState } from 'react';
import { PhoneIcon, MicrophoneIcon } from '@heroicons/react/24/outline';

interface AuthPageProps {
  onLogin: () => void
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (email === 'demo@callcenter.ai' && password === 'demo123') {
      setLoading(true);
      setTimeout(() => {
        onLogin();
        setLoading(false);
      }, 1000);
    } else {
      alert('Invalid credentials. Use demo@callcenter.ai / demo123');
    }
  };

  const handleDemoLogin = () => {
    setEmail('demo@callcenter.ai');
    setPassword('demo123');
    setTimeout(() => handleLogin(), 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
            <div className="flex space-x-1">
              <PhoneIcon className="h-6 w-6 text-white" />
              <MicrophoneIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            AI CALL CENTER
          </h1>
          <p className="text-xl text-blue-200 mb-2">
            Intelligent Calling Platform
          </p>
          <p className="text-sm text-slate-300">
            Advanced AI-Powered Communications
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                placeholder="Enter your password"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="border-t border-white/20 pt-6">
              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full bg-white/10 text-white py-3 px-4 rounded-lg font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-white/20"
              >
                Try Demo Account
              </button>
              <p className="mt-3 text-xs text-slate-300 text-center">
                Email: demo@callcenter.ai • Password: demo123
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="text-center space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <PhoneIcon className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <div>Real-time Calls</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <MicrophoneIcon className="h-5 w-5 text-purple-400 mx-auto mb-1" />
              <div>AI Conversations</div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Enterprise-Grade AI Communications
          </p>
        </div>
      </div>
    </div>
  );
}