import { useEffect, useState } from 'react';

type Backlink = { id: string; title: string | null; slug: string | null; excerpt: string };

export default function BacklinksPanel({ slug }: { slug: string }) {
  const [data, setData] = useState<Backlink[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/journal/backlinks?slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (mounted) setData(json.backlinks || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <div className="border border-zinc-700 rounded-md p-3 bg-zinc-900/50">
      <div className="font-semibold text-zinc-200 mb-2">Backlinks</div>
      {loading && <div className="text-sm text-zinc-400">Loading…</div>}
      {!loading && (!data || data.length === 0) && (
        <div className="text-sm text-zinc-400">No backlinks yet.</div>
      )}
      <ul className="space-y-2">
        {data?.map((b) => (
          <li key={b.id} className="text-sm">
            <div className="text-amber-400">{b.title || b.slug || 'Untitled page'}</div>
            <div className="text-zinc-400 line-clamp-2">…{b.excerpt}…</div>
          </li>
        ))}
      </ul>
    </div>
  );
}


