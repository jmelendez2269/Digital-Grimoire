'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatModalProps {
  model: 'claude' | 'gpt' | 'gemini';
  initialQuery?: string;
  onClose: () => void;
}

export default function AIChatModal({ model, initialQuery = '', onClose }: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with initial query if provided
  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (!isMinimized) {
      inputRef.current?.focus();
    }
  }, [isMinimized]);

  async function handleSend(query?: string) {
    const messageText = query || input.trim();
    if (!messageText) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Set loading state
    setIsLoading(true);

    try {
      // Call appropriate API endpoint
      const endpoint = `/api/ai/${model}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.message || 'No response received',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend();
  }

  function getModelDisplayName() {
    return model.charAt(0).toUpperCase() + model.slice(1);
  }

  function getModelColor() {
    switch (model) {
      case 'claude':
        return 'text-orange-400';
      case 'gpt':
        return 'text-green-400';
      case 'gemini':
        return 'text-blue-400';
      default:
        return 'text-amber-400';
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-zinc-900 border-2 border-amber-900/20 rounded-lg shadow-2xl max-w-sm">
        <div className="flex items-center justify-between p-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${getModelColor()}`}>
              {getModelDisplayName()}
            </span>
            <span className="text-xs text-amber-100/60">
              {messages.length > 0 && `${messages.length} message${messages.length > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              aria-label="Maximize"
            >
              <Maximize2 className="w-4 h-4 text-amber-100/60" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-amber-100/60" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="bg-zinc-900 border-2 border-amber-900/20 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className={`text-lg font-semibold ${getModelColor()}`}>
              {getModelDisplayName()} Chat
            </span>
            {messages.length > 0 && (
              <span className="text-xs text-amber-100/60">
                {messages.length} message{messages.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-zinc-800 rounded transition-colors"
              aria-label="Minimize"
            >
              <Minimize2 className="w-4 h-4 text-amber-100/60" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-amber-100/60" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-amber-100/60 py-8">
              <p className="text-lg mb-2">Start a conversation with {getModelDisplayName()}</p>
              <p className="text-sm">Ask a question to get started</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-800 text-amber-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-lg px-4 py-2">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              rows={3}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

