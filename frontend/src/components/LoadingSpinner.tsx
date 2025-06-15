import { PhoneIcon, MicrophoneIcon } from '@heroicons/react/24/outline';

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="flex space-x-1">
              <PhoneIcon className="h-6 w-6 text-white" />
              <MicrophoneIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="absolute inset-0 h-16 w-16 mx-auto border-4 border-blue-200 border-t-blue-500 rounded-xl animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">AI Call Center</h2>
        <p className="text-slate-600">Loading your dashboard...</p>
      </div>
    </div>
  );
}