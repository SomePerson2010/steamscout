import React, { useState } from 'react';
import { Key, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSubmit: (apiKey: string, provider: 'openai' | 'gemini') => void;
}

export function ApiKeyModal({ isOpen, onSubmit }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSubmit(apiKey.trim(), provider);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 max-w-md w-full">
        <div className="flex items-center mb-6">
          <Key className="w-6 h-6 text-blue-400 mr-3" />
          <h2 className="text-2xl font-bold text-white">API Key Required</h2>
        </div>
        
        <p className="text-slate-300 mb-6">
          To use the AI-powered game recommendations, please enter your API key from either OpenAI or Google Gemini.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Choose AI Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`p-3 rounded-lg border transition-all ${
                  provider === 'openai'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                OpenAI
              </button>
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`p-3 rounded-lg border transition-all ${
                  provider === 'gemini'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                Google Gemini
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'} API key`}
                className="w-full px-4 py-3 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Help Links */}
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Need an API key?</p>
            <div className="flex flex-col space-y-1">
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center"
              >
                Get OpenAI API Key <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center"
              >
                Get Google Gemini API Key <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={!apiKey.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            Start Using SteamScout
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-4">
          Your API key is stored locally and never sent to our servers. It's only used to make requests directly to the AI provider.
        </p>
      </div>
    </div>
  );
}