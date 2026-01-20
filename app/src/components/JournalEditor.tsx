'use client';

import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { WikiLink } from '../tiptap/extensions/WikiLinkExtension';
import { SlashMenu } from '../tiptap/extensions/SlashMenu';
import { NodeRange } from '@tiptap/extension-node-range';
import { DragHandle as DragHandleExtension } from '@tiptap/extension-drag-handle';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2
} from 'lucide-react';

interface JournalEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
}

export default function JournalEditor({
  content,
  onUpdate,
  placeholder = 'Start writing...',
}: JournalEditorProps) {
  const lastAppliedContentRef = useRef<string>('');

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
      NodeRange,
      SlashMenu,
      WikiLink,
      DragHandleExtension,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] px-8 py-6 font-mono',
      },
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      lastAppliedContentRef.current = json;
      onUpdate(json);
    },
  });


  useEffect(() => {
    if (!editor) return;

    if (content === lastAppliedContentRef.current) {
      return;
    }

    if (!content || content.trim() === '') {
      editor.commands.setContent('', { emitUpdate: false });
      lastAppliedContentRef.current = '';
      return;
    }

    try {
      const parsed = JSON.parse(content);
      // Validate it's a valid Tiptap doc structure
      if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
        editor.commands.setContent(parsed, { emitUpdate: false });
        lastAppliedContentRef.current = content;
      } else {
        console.warn('JournalEditor: Invalid Tiptap structure', parsed);
        // Try to wrap it in a doc structure
        editor.commands.setContent({ type: 'doc', content: [parsed] }, { emitUpdate: false });
        lastAppliedContentRef.current = content;
      }
      return;
    } catch (error) {
      console.warn('JournalEditor: Failed to parse content as JSON, treating as plain text', error);
      editor.commands.setContent(content, { emitUpdate: false });
      lastAppliedContentRef.current = content;
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-zinc-500 font-mono animate-pulse">
        INITIALIZING_EDITOR_CORE...
      </div>
    );
  }

  return (
    <div className="relative min-h-[60vh] flex flex-col bg-black border border-white/5 rounded-lg overflow-hidden">

      {/* Fixed Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-zinc-900/50 border-b border-white/5 overflow-x-auto">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Code"
        >
          <Code className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-white/10 mx-1"></div>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="H1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="H2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-white/10 mx-1"></div>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="flex-1 relative bg-black">
        <EditorContent editor={editor} />
        {editor && (
          <DragHandle editor={editor} pluginKey="dragHandle$">
            <div className="flex items-center justify-center w-6 h-6 text-zinc-600 hover:text-amber-500 cursor-grab active:cursor-grabbing text-lg leading-none transition-colors">
              ⋮⋮
            </div>
          </DragHandle>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="border-t border-white/10 bg-black/50 backdrop-blur px-4 py-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-600 uppercase tracking-wider select-none">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-900 border border-emerald-500/50"></span>
            SYSTEM_READY
          </span>
          <span>WORDS: {editor.storage.characterCount.words()}</span>
          <span>CHARS: {editor.storage.characterCount.characters()}</span>
        </div>
        <div>
          {/* Right side status items if needed */}
        </div>
      </div>

    </div>
  );
}


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
  children: ReactNode;
  title?: string;
}) {
  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-sm transition-colors ${active ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}
