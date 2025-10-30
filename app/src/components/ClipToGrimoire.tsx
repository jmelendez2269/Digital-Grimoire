import { useState } from 'react';

interface Props {
  pageId: string;
  sourceId: string;
  sourceTitle: string;
  selectionText: string;
  sourceLocation?: string;
}

export default function ClipToGrimoire({ pageId, sourceId, sourceTitle, selectionText, sourceLocation }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onClip = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/journal/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, text: selectionText, sourceId, sourceTitle, sourceLocation }),
      });
      if (res.ok) setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onClip}
      disabled={loading || !selectionText}
      className={`px-3 py-1.5 rounded border ${done ? 'border-green-600 text-green-400' : 'border-amber-600 text-amber-400'} hover:bg-zinc-800 disabled:opacity-50`}
      title={!selectionText ? 'Select a passage to clip' : 'Clip to Grimoire'}
    >
      {done ? 'Clipped' : loading ? 'Clipping…' : 'Clip to Grimoire'}
    </button>
  );
}


