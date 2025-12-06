import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Wand2, Save, X, Trash2, AlertTriangle, CheckCircle, Ban } from 'lucide-react';
import api from '../api/axios';
import ThemeToggle from '../components/ThemeToggle';
import { sanitizeInput } from '../utils/sanitize';

const SecurityRules = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [generatedRule, setGeneratedRule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data } = await api.get('/rules');
      setRules(data);
    } catch (err) {
      console.error("Failed to fetch rules", err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setGeneratedRule(null);
    
    try {
      const cleanPrompt = sanitizeInput(prompt);
      const { data } = await api.post('/rules/generate', { prompt: cleanPrompt });
      setGeneratedRule(data);
    } catch (err) {
      console.error("Generation failed", err);
      setError("Failed to generate rule. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedRule) return;
    try {
      await api.post('/rules', generatedRule);
      setGeneratedRule(null);
      setPrompt('');
      fetchRules();
    } catch (err) {
      console.error("Failed to save rule", err);
      setError("Failed to save rule.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
    try {
      await api.delete(`/rules/${id}`);
      fetchRules();
    } catch (err) {
      console.error("Failed to delete rule", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                Security Rules Manager
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
        
        {/* AI Generator Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Wand2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">AI Rule Generator</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Describe the security rule you want to create
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Block all traffic from North Korea or Alert if browser contains 'Kali'"
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 p-3 h-24"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate Rule
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Generated Rule Preview */}
          {generatedRule && (
            <div className="mt-6 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900/20">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 uppercase tracking-wide">
                  Preview Generated Rule
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  generatedRule.action === 'BLOCK' ? 'bg-red-100 text-red-800' :
                  generatedRule.action === 'MFA' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {generatedRule.action}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="block text-gray-500 dark:text-gray-400 text-xs">Rule Name</span>
                  <span className="font-medium dark:text-white">{generatedRule.name}</span>
                </div>
                <div>
                  <span className="block text-gray-500 dark:text-gray-400 text-xs">Condition</span>
                  <span className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded dark:text-gray-200">
                    {generatedRule.field} {generatedRule.operator} "{generatedRule.value}"
                  </span>
                </div>
                <div>
                  <span className="block text-gray-500 dark:text-gray-400 text-xs">Severity</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-indigo-500 h-1.5 rounded-full" 
                        style={{ width: `${generatedRule.severity}%` }}
                      />
                    </div>
                    <span className="font-medium dark:text-white">{generatedRule.severity}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm & Save
                </button>
                <button
                  onClick={() => setGeneratedRule(null)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Rules List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Security Rules</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Logic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{rule.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {rule.field} {rule.operator} "{rule.value}"
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.action === 'BLOCK' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        rule.action === 'MFA' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {rule.action === 'BLOCK' && <Ban className="w-3 h-3 mr-1" />}
                        {rule.action === 'MFA' && <Shield className="w-3 h-3 mr-1" />}
                        {rule.action === 'ALERT' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {rule.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              rule.severity > 70 ? 'bg-red-500' : 
                              rule.severity > 30 ? 'bg-yellow-500' : 'bg-green-500'
                            }`} 
                            style={{ width: `${rule.severity}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{rule.severity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete Rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                   <tr>
                     <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                       No security rules defined. Use the AI Generator above to create one.
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SecurityRules;

