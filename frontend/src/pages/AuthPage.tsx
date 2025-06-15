import { useState } from 'react';
import { PhoneIcon, MicrophoneIcon, EyeIcon, EyeSlashIcon, CogIcon } from '@heroicons/react/24/outline';
import { AuthService } from '../services/auth';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const { mode, toggleMode, isDemo, isLive } = useApp();
  const [isAdminSetup, setIsAdminSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    clientName: '',
    companyName: '',
    phoneNumber: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isAdminSetup) {
        // One-time admin setup
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }

        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters long');
          return;
        }

        const { user, error } = await AuthService.signUp({
          email: formData.email,
          password: formData.password,
          clientName: formData.clientName,
          companyName: formData.companyName,
          phoneNumber: formData.phoneNumber
        });

        if (error) {
          toast.error(error.message);
        } else if (user) {
          toast.success('Admin account created successfully!');
        }
      } else {
        const { user, error } = await AuthService.signIn({
          email: formData.email,
          password: formData.password
        });

        if (error) {
          toast.error(error.message);
        } else if (user) {
          toast.success('Signed in successfully!');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDemoLogin = async () => {
    const demoCredentials = AuthService.getDemoCredentials();
    setFormData({
      ...formData,
      email: demoCredentials.email,
      password: demoCredentials.password
    });
    
    setIsLoading(true);
    try {
      const { user, error } = await AuthService.signIn(demoCredentials);
      
      if (error) {
        toast.error(error.message);
      } else if (user) {
        toast.success('Demo login successful!');
      }
    } catch (error) {
      console.error('Demo login error:', error);
      toast.error('Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Please enter your email address first');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await AuthService.resetPassword({ email: formData.email });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset email sent! Check your inbox.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to send password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  // Removed unused function

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Mode Toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleMode}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            isDemo 
              ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' 
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          <CogIcon className="h-4 w-4" />
          <span>{mode.toUpperCase()} MODE</span>
        </button>
      </div>

      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="flex space-x-1">
              <PhoneIcon className="h-6 w-6 text-white" />
              <MicrophoneIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900">AI Call Center</h2>
          <p className="mt-2 text-sm text-slate-600">
            {isAdminSetup ? 'Setup admin account' : 'Sign in to your account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isAdminSetup && (
              <>
                <div>
                  <label htmlFor="clientName" className="block text-sm font-medium text-slate-700">
                    Full Name *
                  </label>
                  <input
                    id="clientName"
                    name="clientName"
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isAdminSetup ? 'new-password' : 'current-password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 pr-10 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-slate-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </div>
              {isAdminSetup && (
                <p className="mt-1 text-xs text-slate-500">
                  Must be at least 6 characters long
                </p>
              )}
            </div>

            {isAdminSetup && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                  Confirm Password *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 pr-10 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isAdminSetup ? 'Creating Admin Account...' : 'Signing In...'}
                </div>
              ) : (
                isAdminSetup ? 'Create Admin Account' : 'Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsAdminSetup(!isAdminSetup)}
              className="text-xs text-gray-500 hover:text-gray-400"
              disabled={isLoading}
            >
              {isAdminSetup ? 'Back to Login' : 'First Time Setup'}
            </button>
          </div>

          {!isAdminSetup && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-slate-600 hover:text-slate-500"
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            </div>
          )}

          {isDemo && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800 font-medium">Demo Access</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Try the platform with demo data
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
                >
                  Demo Login
                </button>
              </div>
            </div>
          )}

          {isLive && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-green-800 font-medium">Live Mode</p>
                <p className="text-xs text-green-600 mt-1">
                  Connected to live Supabase database
                </p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}