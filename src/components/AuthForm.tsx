import React, { useState } from 'react';
console.log('AuthForm rendered');
import { Eye, EyeOff, User, Lock, UserPlus, LogIn, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login.css';

interface AuthFormProps {
  onSuccess?: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ username: false, password: false });
  
  const { login, register, validateCredentials } = useAuth();

  // Real-time validation
  const validation = validateCredentials(username, password);
  const showValidation = (touched.username || touched.password) && !isLogin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark fields as touched
    setTouched({ username: true, password: true });

    // Client-side validation
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Use validation from AuthContext
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    setLoading(true);

    try {
      const result = isLogin 
        ? await login(username, password)
        : await register(username, password);

      if (!result.success) {
        // Use setTimeout to ensure error persists like rate limiting errors
        setTimeout(() => {
          setError(result.error || 'Authentication failed');
        }, 0);
        // Keep password field intact like rate limiting errors do
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
      // Keep password field intact like rate limiting errors do
    } finally {
      setLoading(false); // Always reset loading state
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'username') {
      setUsername(value);
    } else if (name === 'password') {
      setPassword(value);
    }
    
    // Error clearing logic removed to make all errors sticky
    // DO NOT clear error here - this is what makes rate limiting errors work
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setUsername('');
    setPassword('');
    setTouched({ username: false, password: false });
  };

  const handleFieldBlur = (field: 'username' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Disable form inputs while loading
  const isDisabled = loading;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 login-form">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-900 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
            {isLogin ? (
              <LogIn className="text-white" size={20} />
            ) : (
              <UserPlus className="text-white" size={20} />
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-light text-gray-900">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 px-2">
            {isLogin 
              ? 'Sign in to continue tracking your nutrition'
              : 'Join thousands tracking their nutrition goals'
            }
          </p>
        </div>

        {/* Form */}
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('username')}
                  className="block w-full pl-9 sm:pl-10 pr-3 py-3 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm sm:text-base transition-all touch-manipulation"
                  placeholder="Enter your username"
                  disabled={isDisabled}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                {/* Validation indicator */}
                {touched.username && username && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {username.length >= 3 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {/* Username validation message */}
              {touched.username && username && username.length < 3 && (
                <p className="mt-1 text-xs text-red-600">Username must be at least 3 characters</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('password')}
                  className="block w-full pl-9 sm:pl-10 pr-12 py-3 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm sm:text-base transition-all touch-manipulation"
                  placeholder="Enter your password"
                  disabled={isDisabled}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center touch-manipulation min-w-[44px] min-h-[44px] justify-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isDisabled}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {/* Password validation message */}
              {touched.password && password && password.length < 6 && (
                <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters</p>
              )}
            </div>
          </div>

          {/* Real-time validation for registration */}
          {showValidation && !validation.valid && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium mb-1">Please fix the following:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isDisabled || (!isLogin && !validation.valid)}
            className="w-full flex justify-center py-3 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation min-h-[48px]"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors touch-manipulation min-h-[44px] px-2"
              disabled={isDisabled}
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </form>

        {/* Requirements */}
        {!isLogin && (
          <div className="mt-4 sm:mt-6 text-xs text-gray-500 bg-gray-50 p-3 sm:p-4 rounded-lg">
            <p className="font-medium mb-2">Requirements:</p>
            <div className="space-y-1">
              <div className="flex items-center">
                {username.length >= 3 ? (
                  <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-gray-400 mr-2" />
                )}
                <span className={username.length >= 3 ? 'text-green-600' : ''}>
                  Username: at least 3 characters
                </span>
              </div>
              <div className="flex items-center">
                {password.length >= 6 ? (
                  <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-gray-400 mr-2" />
                )}
                <span className={password.length >= 6 ? 'text-green-600' : ''}>
                  Password: at least 6 characters
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthForm; 