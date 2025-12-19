'use client';

import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { WikiLink } from '../tiptap/extensions/WikiLinkExtension';
import { SlashMenu } from '../tiptap/extensions/SlashMenu';
import { DragHandle as DragHandleExtension } from '@tiptap/extension-drag-handle';
import { NodeRange } from '@tiptap/extension-node-range';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
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
      DragHandleExtension,
      SlashMenu,
      WikiLink,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
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
      console.log('JournalEditor: Setting content from JSON', {
        hasType: !!parsed.type,
        type: parsed.type,
        hasContent: !!parsed.content,
        contentLength: parsed.content?.length,
        firstNode: parsed.content?.[0]
      });
      
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
      <div className="flex items-center justify-center min-h-[200px] text-zinc-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="border border-zinc-700 rounded-lg bg-zinc-900/50 overflow-visible">
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
      </div>

      <div className="relative">
        <EditorContent editor={editor} />
        <DragHandle editor={editor}>
          <div className="flex items-center justify-center w-6 h-6 text-zinc-400 hover:text-amber-400 cursor-grab active:cursor-grabbing text-lg leading-none">
            ⋮⋮
          </div>
        </DragHandle>
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
      className={`p-2 rounded transition-colors ${
        active ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700 cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

