import { useUser } from '../contexts/UserContext';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function UsageTracker() {
  const { user } = useUser();

  if (!user) return null;

  const usagePercentage = (user.minutes_used / user.monthly_minute_limit) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isOverLimit = usagePercentage >= 100;

  const getProgressBarColor = () => {
    if (isOverLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (isOverLimit) return 'text-red-600';
    if (isNearLimit) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-900">Monthly Usage</h3>
        </div>
        {isNearLimit && (
          <div className="flex items-center space-x-1 text-yellow-600">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isOverLimit ? 'Limit Exceeded' : 'Near Limit'}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Minutes Used</span>
          <span className={`text-sm font-medium ${getTextColor()}`}>
            {user.minutes_used.toLocaleString()} / {user.monthly_minute_limit.toLocaleString()}
          </span>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>0 min</span>
          <span className={`font-medium ${getTextColor()}`}>
            {usagePercentage.toFixed(1)}% used
          </span>
          <span>{user.monthly_minute_limit.toLocaleString()} min</span>
        </div>

        {isOverLimit && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Usage limit exceeded!</strong> New calls will be blocked until your plan is upgraded or the next billing cycle begins.
            </p>
          </div>
        )}

        {isNearLimit && !isOverLimit && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>Approaching usage limit.</strong> Consider upgrading your plan to avoid service interruption.
            </p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Plan</span>
            <span className="font-medium text-slate-900 capitalize">{user.plan_name}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-600">Remaining</span>
            <span className="font-medium text-slate-900">
              {Math.max(0, user.monthly_minute_limit - user.minutes_used).toLocaleString()} minutes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}