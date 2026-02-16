'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface JournalNameSetupModalProps {
  onComplete: () => void;
}

const PRESET_OPTIONS = [
  { value: 'Project Parallax', description: 'Modern meets ancient - a personal collection of knowing' },
  { value: 'Study Journal', description: 'A scholarly approach to learning and reflection' },
  { value: 'Wisdom Journal', description: 'Where insights and discoveries converge' },
  { value: 'Personal Journal', description: 'Your private space for thoughts and notes' },
];

export default function JournalNameSetupModal({ onComplete }: JournalNameSetupModalProps) {
  const { user, supabase } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user) return;

    const nameToSave = useCustom ? customName.trim() : selectedOption;
    if (!nameToSave) {
      toast.error('Please select or enter a journal name');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          journal_name: nameToSave,
        },
      });

      if (error) {
        throw error;
      }

      toast.success(`Your journal "${nameToSave}" is ready!`);
      onComplete();
    } catch (err: any) {
      toast.error('Error saving journal name: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  const canSave = (useCustom && customName.trim()) || (!useCustom && selectedOption);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <button
          onClick={onComplete}
          className="absolute right-4 top-4 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-2">
            What would you like to call your journal?
          </h2>
          <p className="text-zinc-400">
            Choose a name that resonates with you, or create your own. You can change this anytime in your profile.
          </p>
        </div>

        {/* Preset Options */}
        {!useCustom && (
          <div className="space-y-3 mb-6">
            {PRESET_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedOption(option.value)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${selectedOption === option.value
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
              >
                <div className="font-medium text-amber-100 mb-1">{option.value}</div>
                <div className="text-sm text-zinc-400">{option.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Custom Input */}
        {useCustom && (
          <div className="mb-6">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter your custom journal name..."
              maxLength={50}
              className="w-full px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-950 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              autoFocus
            />
          </div>
        )}

        {/* Toggle Custom */}
        <div className="mb-6">
          <button
            onClick={() => {
              setUseCustom(!useCustom);
              setSelectedOption(null);
              setCustomName('');
            }}
            className="text-sm text-amber-400 hover:text-amber-300 underline"
          >
            {useCustom ? 'Choose from presets' : 'Or create your own'}
          </button>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onComplete}
            className="px-4 py-2 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

