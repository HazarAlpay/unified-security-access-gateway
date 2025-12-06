import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
          <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">403</h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
          You do not have permission to access this resource. If you believe this is an error, please contact your administrator.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;

