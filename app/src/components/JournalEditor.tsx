'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { SlashMenu } from '../tiptap/extensions/SlashMenu';
import { DragHandle } from '../tiptap/extensions/DragHandle';
import Image from '@tiptap/extension-image';
import { createClient as createSbClient } from '@/lib/supabase/client';
import { WikiLink } from '../tiptap/extensions/WikiLinkExtension';
import { useCallback, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';

interface JournalEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
  autoSave?: boolean;
}

export default function JournalEditor({
  content,
  onUpdate,
  placeholder = 'Start writing...',
  autoSave = true,
}: JournalEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      HorizontalRule,
      SlashMenu,
      DragHandle,
      Image,
      WikiLink,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      const text = editor.getText();
      
      // Update word/char counts
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
      setCharCount(text.length);
      
      if (autoSave) {
        setSaveStatus('unsaved');
        debouncedUpdate(json);
      } else {
        onUpdate(json);
      }
    },
  });

  // Debounced auto-save
  const debouncedUpdate = useCallback(
    debounce((content: string) => {
      setSaveStatus('saving');
      onUpdate(content);
      setTimeout(() => setSaveStatus('saved'), 500);
    }, 2000),
    [onUpdate]
  );

  // Update editor when content prop changes (e.g., loading new page)
  useEffect(() => {
    if (editor && content !== JSON.stringify(editor.getJSON())) {
      try {
        const parsed = JSON.parse(content);
        editor.commands.setContent(parsed);
      } catch (e) {
        // If content isn't valid JSON, treat as plain text
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-zinc-400">
        Loading editor...
      </div>
    );
  }

  // Image upload handler
  useEffect(() => {
    const onUpload = async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const supabase = createSbClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `${user.id}/${Date.now()}-${sanitized}`;
        const { error: uploadError } = await supabase.storage
          .from('journal-images')
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) {
          console.error(uploadError);
          return;
        }
        const { data: signed } = await supabase.storage
          .from('journal-images')
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        const url = signed?.signedUrl;
        if (url) {
          editor.chain().focus().setImage({ src: url, alt: sanitized }).run();
        }
      };
      input.click();
    };
    document.addEventListener('tiptap-image-upload', onUpload);
    return () => document.removeEventListener('tiptap-image-upload', onUpload);
  }, [editor]);

  return (
    <div className="border border-zinc-700 rounded-lg bg-zinc-900/50 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-zinc-700 bg-zinc-800/50 p-2 flex items-center gap-1 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        {/* Auto-save status */}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="text-zinc-400">
            {wordCount} words · {charCount} characters
          </div>
          {autoSave && (
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-amber-400">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-green-400">Saved</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <div className="w-2 h-2 bg-zinc-500 rounded-full" />
                  <span className="text-zinc-400">Unsaved</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}

// Toolbar button component
function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded hover:bg-zinc-700 transition-colors
        ${active ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

