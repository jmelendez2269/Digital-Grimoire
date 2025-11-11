'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface JournalNamePreferenceProps {
  onSave?: () => void;
}

export default function JournalNamePreference({ onSave }: JournalNamePreferenceProps) {
  const { user, supabase } = useAuth();
  const [journalName, setJournalName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setJournalName(user.user_metadata?.journal_name || 'Digital Grimoire');
    }
  }, [user]);

  async function handleSave() {
    if (!user || !journalName.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          journal_name: journalName.trim(),
        },
      });

      if (error) {
        throw error;
      }

      toast.success('Journal name updated successfully!');
      if (onSave) {
        onSave();
      }
    } catch (err: any) {
      toast.error('Error updating journal name: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label htmlFor="journalName" className="block text-sm font-medium text-amber-100">
        Journal Name
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="journalName"
          type="text"
          value={journalName}
          onChange={(e) => setJournalName(e.target.value)}
          maxLength={50}
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          placeholder="Digital Grimoire"
        />
        <button
          onClick={handleSave}
          disabled={saving || !journalName.trim()}
          className="rounded-md bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Customize what you call your personal collection of insights and discoveries
      </p>
    </div>
  );
}

