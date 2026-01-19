'use client';

import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';

interface CourseEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
}

export default function CourseEditor({
  content,
  onUpdate,
  placeholder = 'Start writing...',
}: CourseEditorProps) {
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
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
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
        // Try to wrap it in a doc structure
        editor.commands.setContent({ type: 'doc', content: [parsed] }, { emitUpdate: false });
        lastAppliedContentRef.current = content;
      }
      return;
    } catch (error) {
      // If it's not JSON, treat as plain text
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
    <div className="border border-amber-900/30 rounded-lg bg-zinc-800/50 overflow-visible">
      <div className="border-b border-amber-900/30 bg-zinc-900/50 p-2 flex items-center gap-1 flex-wrap">
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

