import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import ReCAPTCHA from 'react-google-recaptcha';

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { sanitizeInput } from '../utils/sanitize';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, verifyMfa } = useAuth();
  const recaptchaRef = useRef(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [isMfaSetup, setIsMfaSetup] = useState(true);
  const [secret, setSecret] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [setupUri, setSetupUri] = useState('');
  const [showManualSecret, setShowManualSecret] = useState(false);
  const [expiredAlert, setExpiredAlert] = useState(false);
  
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setExpiredAlert(true);
    }
  }, [searchParams]);

  const resetFlow = () => {
    setPassword('');
    setCode('');
    setTempToken('');
    setSecret('');
    setSetupUri('');
    setShowManualSecret(false);
    setIsMfaSetup(true);
    setStep(1);
    setError('');
    setInfo('');
    setCaptchaRequired(false);
    setCaptchaToken(null);
    if (recaptchaRef.current) {
        recaptchaRef.current.reset();
    }
  };


  const requestMfaSecret = async (token) => {
    try {
      const { data } = await api.post('/auth/mfa/setup', { temp_token: token });
      setSecret(data.secret);
      setSetupUri(data.uri);
      setInfo('Scan the QR code with your authenticator app.');
    } catch {
      setError('Failed to load MFA setup. Please try again.');
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      // Include captcha_token if required
      const cleanUsername = sanitizeInput(username.trim());
      const response = await login(cleanUsername, password, captchaToken);
      
      if (response.access_token) {
        const destination = response.role === 'admin' ? '/admin' : '/employee';
        navigate(destination, { replace: true });
        return;
      }

      setTempToken(response.temp_token);
      setIsMfaSetup(response.is_mfa_setup);
      setStep(2);

      if (!response.is_mfa_setup) {
        await requestMfaSecret(response.temp_token);
      } else {
        setInfo('Enter the 6-digit code from your authenticator app.');
      }
    } catch (err) {
      console.log("Login Error Response:", err.response?.data);
      
      let message = 'Unable to start login.';
      if (err.response?.data?.detail) {
          if (typeof err.response.data.detail === 'string') {
              message = err.response.data.detail;
          } else if (err.response.data.detail.message) {
              message = err.response.data.detail.message;
          }
      } else if (err.message) {
          message = err.message;
      }
      
      setError(message);
      
      if (err.response?.data?.detail?.captcha_required === true) {
          setCaptchaRequired(true);
          // If we already have a token but it failed, we should reset it to force re-verification
          // But if the user just triggered the requirement, we might not have a token yet.
          // If failure happened WITH a token, reset it.
          if (captchaToken) {
              setCaptchaToken(null);
              if (recaptchaRef.current) {
                  recaptchaRef.current.reset();
              }
          }
      }
    } finally {
      // Only reset loading if we didn't navigate away (navigating away unmounts)
      // But since we can't check unmount easily here, we'll just let it be or check response.access_token
      // Ideally, we shouldn't set state if unmounted, but React 18 is lenient.
      // For simplicity, we'll just call it.
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await verifyMfa(tempToken, code);
      const destination = response.role === 'admin' ? '/admin' : '/employee';
      navigate(destination, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.detail || err.message || 'Invalid MFA code.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Unified Security</h2>
          <p className="text-sm text-gray-600 mt-1">Secure Access Gateway</p>
        </div>

        {expiredAlert && (
          <div className="mb-4 p-3 bg-orange-50 border-l-4 border-orange-500 text-orange-700 text-sm rounded flex justify-between items-center">
            <span>Session expired due to inactivity. Please log in again.</span>
            <button 
              onClick={() => setExpiredAlert(false)}
              className="text-orange-700 hover:text-orange-900 font-bold ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700 text-sm rounded">
            {info}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || (captchaRequired && !captchaToken)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
            
            {captchaRequired && (
                <div className="mt-4 flex flex-col items-center">
                    <p className="text-xs text-red-600 mb-2 font-semibold text-center">
                        Too many failed attempts. Please verify you are human.
                    </p>
                    <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                        onChange={(val) => setCaptchaToken(val)}
                    />
                </div>
            )}
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerify} className="space-y-6">
            {!isMfaSetup && (
              <div className="space-y-4 text-center">
                <div className="flex justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {setupUri ? (
                    <QRCodeSVG value={setupUri} size={180} />
                  ) : (
                    <div className="h-44 w-44 animate-pulse bg-gray-200 rounded" />
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowManualSecret(!showManualSecret)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {showManualSecret ? 'Hide Secret' : 'Trouble scanning?'}
                </button>
                
                {showManualSecret && (
                  <div className="p-2 bg-gray-100 rounded font-mono text-xs break-all text-gray-800">
                    {secret}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="code">
                Authentication Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 text-center tracking-[0.5em] text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                placeholder="000000"
                required
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetFlow}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Verify'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
