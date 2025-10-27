'use client';

/**
 * TTS Settings Component
 * Modal for configuring text-to-speech preferences
 */

import { useState } from 'react';
import { X, Sparkles, Info } from 'lucide-react';
import { TTSEngine } from '@/lib/services/tts-service';

export interface TTSSettingsProps {
  currentEngine: TTSEngine;
  onEngineChange: (engine: TTSEngine) => void;
  onAzureCredentials: (key: string, region: string) => void;
  onClose: () => void;
}

export default function TTSSettings({
  currentEngine,
  onEngineChange,
  onAzureCredentials,
  onClose,
}: TTSSettingsProps) {
  const [selectedEngine, setSelectedEngine] = useState<TTSEngine>(currentEngine);
  const [azureKey, setAzureKey] = useState('');
  const [azureRegion, setAzureRegion] = useState('eastus');
  const [showAzureForm, setShowAzureForm] = useState(false);

  const handleSave = () => {
    onEngineChange(selectedEngine);
    
    if (selectedEngine === 'azure' && azureKey && azureRegion) {
      onAzureCredentials(azureKey, azureRegion);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <h2 className="text-2xl font-bold text-amber-100">
            Text-to-Speech Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-amber-100/60 hover:text-amber-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Engine Selection */}
          <div>
            <h3 className="text-lg font-semibold text-amber-100 mb-4">
              Voice Engine
            </h3>

            {/* Standard Voice Option */}
            <label
              className={`block p-4 rounded-lg border-2 cursor-pointer transition-all mb-4 ${
                selectedEngine === 'web-speech'
                  ? 'border-amber-600 bg-amber-600/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="engine"
                  value="web-speech"
                  checked={selectedEngine === 'web-speech'}
                  onChange={() => setSelectedEngine('web-speech')}
                  className="mt-1 accent-amber-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-amber-100 mb-1">
                    Standard Voices (Free)
                  </div>
                  <p className="text-sm text-amber-100/60 mb-2">
                    Browser-based text-to-speech with system voices
                  </p>
                  <ul className="text-xs text-amber-100/50 space-y-1">
                    <li>✓ Completely free, no limits</li>
                    <li>✓ Works offline</li>
                    <li>✓ Multiple voices (OS-dependent)</li>
                    <li>✓ Good quality for most use cases</li>
                  </ul>
                </div>
              </div>
            </label>

            {/* Premium Voice Option */}
            <label
              className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedEngine === 'azure'
                  ? 'border-amber-600 bg-amber-600/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="engine"
                  value="azure"
                  checked={selectedEngine === 'azure'}
                  onChange={() => {
                    setSelectedEngine('azure');
                    setShowAzureForm(true);
                  }}
                  className="mt-1 accent-amber-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-amber-100 mb-1">
                    <span>Premium Neural Voices</span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-sm text-amber-100/60 mb-2">
                    Azure Cognitive Services with high-quality neural voices
                  </p>
                  <ul className="text-xs text-amber-100/50 space-y-1">
                    <li>✓ 400+ natural-sounding voices</li>
                    <li>✓ 140+ languages and dialects</li>
                    <li>✓ First 5 million characters FREE/month (~4 books)</li>
                    <li>✓ Then just $1 per million characters</li>
                  </ul>
                </div>
              </div>
            </label>

            {/* Upgrade Banner */}
            {selectedEngine === 'web-speech' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-600/20 to-amber-700/20 border border-amber-600/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-100 mb-1">
                      Upgrade to Premium Voices
                    </h4>
                    <p className="text-sm text-amber-100/70 mb-3">
                      Experience incredibly natural-sounding speech with Azure's neural voices. 
                      Perfect for long reading sessions with 400+ voices to choose from.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedEngine('azure');
                        setShowAzureForm(true);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Upgrade Now - FREE for 5M chars/month
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Azure Configuration Form */}
            {selectedEngine === 'azure' && showAzureForm && (
              <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg space-y-4">
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-blue-300">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Azure Account Required</p>
                    <p className="text-xs text-blue-300/70">
                      You'll need an Azure account to use premium voices. 
                      <a 
                        href="https://azure.microsoft.com/en-us/free/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-200 ml-1"
                      >
                        Sign up for free
                      </a>
                      , then create a Speech Services resource to get your API key.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-100 mb-2">
                    Azure Speech API Key
                  </label>
                  <input
                    type="password"
                    value={azureKey}
                    onChange={(e) => setAzureKey(e.target.value)}
                    placeholder="Enter your Azure Speech API key"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-amber-100 placeholder:text-amber-100/30 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-100 mb-2">
                    Azure Region
                  </label>
                  <select
                    value={azureRegion}
                    onChange={(e) => setAzureRegion(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-amber-100 focus:border-amber-600 focus:outline-none"
                  >
                    <option value="eastus">East US</option>
                    <option value="westus">West US</option>
                    <option value="westus2">West US 2</option>
                    <option value="centralus">Central US</option>
                    <option value="northeurope">North Europe</option>
                    <option value="westeurope">West Europe</option>
                    <option value="southeastasia">Southeast Asia</option>
                    <option value="eastasia">East Asia</option>
                    <option value="australiaeast">Australia East</option>
                  </select>
                </div>

                <div className="text-xs text-amber-100/50">
                  <p className="mb-1">💡 <strong>Cost Estimate:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• First 5 million characters per month: FREE</li>
                    <li>• Average book: ~1 million characters</li>
                    <li>• Beyond free tier: $1 per million characters</li>
                    <li>• Most users: $0-5/month</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <h4 className="text-sm font-medium text-amber-100 mb-2">
              📖 Reading Experience Features
            </h4>
            <ul className="text-xs text-amber-100/60 space-y-1.5">
              <li>• Adjustable playback speed (0.5x to 2x)</li>
              <li>• Volume control</li>
              <li>• Reading position bookmarking (auto-saves your place)</li>
              <li>• Text highlighting sync (coming soon)</li>
              <li>• Choose between OCR text or PDF extraction</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 p-6">
          <button
            onClick={onClose}
            className="px-6 py-2 text-amber-100/60 hover:text-amber-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

