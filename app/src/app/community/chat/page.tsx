"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Smile } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const MAX_LENGTH = 1000;

type Reaction = { emoji: string; count: number; reactedByMe: boolean };

type ChatMessage = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { name: string; avatar_url: string | null };
  reactions: Reaction[];
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function initial(name: string) {
  return (name.trim()[0] || "?").toUpperCase();
}

function Avatar({ author }: { author: { name: string; avatar_url: string | null } }) {
  if (author.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={author.avatar_url} alt={author.name} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0" />;
  }
  return (
    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-cyan-900/40 flex items-center justify-center text-[10px] font-bold text-cyan-500 ring-1 ring-cyan-500/30">
      {initial(author.name)}
    </div>
  );
}

export default function CommunityChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/community/messages")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const initialMessages: ChatMessage[] = data.messages ?? [];
        initialMessages.forEach((m) => seenIds.current.add(m.id));
        setMessages(initialMessages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("community_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        (payload) => {
          const row = payload.new as { id: string; user_id: string; body: string; created_at: string; is_deleted?: boolean };
          if (row.is_deleted) return;
          if (seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);
          const isMe = row.user_id === user?.id;
          const author = isMe
            ? {
                name: user?.user_metadata?.display_name?.trim() || user?.user_metadata?.username?.trim() || `Member ${row.user_id.slice(0, 8)}`,
                avatar_url: user?.user_metadata?.avatar_url ?? null,
              }
            : { name: `Member ${row.user_id.slice(0, 8)}`, avatar_url: null };
          setMessages((prev) => [...prev, { ...row, author, reactions: [] }]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_message_reactions" },
        (payload) => {
          const row = payload.new as { message_id: string; user_id: string; emoji: string };
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== row.message_id) return m;
              const existing = m.reactions.find((r) => r.emoji === row.emoji);
              const reactions = existing
                ? m.reactions.map((r) =>
                    r.emoji === row.emoji
                      ? { ...r, count: r.count + 1, reactedByMe: r.reactedByMe || row.user_id === user?.id }
                      : r
                  )
                : [...m.reactions, { emoji: row.emoji, count: 1, reactedByMe: row.user_id === user?.id }];
              return { ...m, reactions };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_message_reactions" },
        (payload) => {
          const row = payload.old as { message_id: string; user_id: string; emoji: string };
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== row.message_id) return m;
              const reactions = m.reactions
                .map((r) =>
                  r.emoji === row.emoji
                    ? { ...r, count: r.count - 1, reactedByMe: r.reactedByMe && row.user_id !== user?.id }
                    : r
                )
                .filter((r) => r.count > 0);
              return { ...m, reactions };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.user_metadata]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const rows = useMemo(() => {
    const items: { message: ChatMessage; showHeader: boolean; dayDivider: string | null }[] = [];
    let lastUserId: string | null = null;
    let lastTime = 0;
    let lastDay: Date | null = null;

    for (const message of messages) {
      const created = new Date(message.created_at);
      const dividerNeeded = !lastDay || !isSameDay(created, lastDay);
      const showHeader = dividerNeeded || message.user_id !== lastUserId || created.getTime() - lastTime > GROUP_WINDOW_MS;

      items.push({
        message,
        showHeader,
        dayDivider: dividerNeeded ? dayLabel(message.created_at) : null,
      });

      lastUserId = message.user_id;
      lastTime = created.getTime();
      lastDay = created;
    }
    return items;
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/community/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send message");
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    setPickerFor(null);
    try {
      await fetch(`/api/community/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.error("Failed to toggle reaction", err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-6">
        <p className="text-xs font-mono text-cyan-500/70 uppercase tracking-widest mb-3">Community</p>
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">Chat</h1>
        <p className="text-sm text-zinc-500 max-w-xl leading-relaxed">
          A shared room for practitioners to talk. Be kind — this is a small community.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-900/30 border border-white/5 rounded-lg p-4 space-y-1 mb-4">
        {loading && (
          <div className="space-y-4 py-4 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
                <div className="h-8 w-8 rounded-full bg-white/5 flex-shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-white/5" />
                  <div className="h-9 w-48 rounded-lg bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-8">
            No messages yet. Be the first to say something.
          </p>
        )}

        {rows.map(({ message, showHeader, dayDivider }) => {
          const isOwn = message.user_id === user?.id;
          return (
            <div key={message.id}>
              {dayDivider && (
                <div className="flex items-center justify-center py-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 bg-white/5 rounded-full px-3 py-1">
                    {dayDivider}
                  </span>
                </div>
              )}
              <div className={`group flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""} ${showHeader ? "mt-3" : "mt-0.5"}`}>
                <div className="w-8 flex-shrink-0">
                  {showHeader && <Avatar author={message.author} />}
                </div>

                <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                  {showHeader && (
                    <span className="text-xs text-zinc-500 font-medium mb-1 px-1">
                      {isOwn ? "You" : message.author.name} ·{" "}
                      <span className="font-mono text-zinc-600">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                  )}

                  <div className="relative">
                    <div
                      className={`rounded-lg px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isOwn
                          ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-100"
                          : "bg-white/5 border border-white/5 text-zinc-300"
                      }`}
                    >
                      {message.body}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPickerFor(pickerFor === message.id ? null : message.id)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-cyan-300 transition-opacity`}
                      aria-label="Add reaction"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    {pickerFor === message.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setPickerFor(null)} />
                        <div className={`absolute z-50 top-full mt-2 ${isOwn ? "right-0" : "left-0"}`}>
                          <EmojiPicker
                            theme={Theme.DARK}
                            width={300}
                            height={360}
                            onEmojiClick={(data: EmojiClickData) => handleReact(message.id, data.emoji)}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {message.reactions.length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                      {message.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          onClick={() => handleReact(message.id, r.emoji)}
                          className={`text-xs rounded-full px-2 py-0.5 border transition-colors ${
                            r.reactedByMe
                              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                              : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20"
                          }`}
                        >
                          {r.emoji} {r.count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            maxLength={MAX_LENGTH}
            placeholder="Say something… (Shift+Enter for a new line)"
            className="w-full resize-none bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 max-h-32 overflow-y-auto"
            disabled={sending}
          />
          {input.length > MAX_LENGTH - 200 && (
            <span className={`absolute bottom-1.5 right-3 text-[10px] font-mono ${input.length >= MAX_LENGTH ? "text-red-400" : "text-zinc-600"}`}>
              {input.length}/{MAX_LENGTH}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white transition-all flex-shrink-0"
          aria-label="Send message"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
