'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface JournalEditorProps {
  content: string;
  onUpdate: (content: string) => void;
}

export default function JournalEditor({ content, onUpdate }: JournalEditorProps) {
  const lastAppliedContentRef = useRef<string>('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
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

    if (!content) {
      editor.commands.setContent('', false);
      lastAppliedContentRef.current = '';
      return;
    }

    try {
      const parsed = JSON.parse(content);
      editor.commands.setContent(parsed, false);
      lastAppliedContentRef.current = content;
      return;
    } catch {
      editor.commands.setContent(content, false);
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
    <div className="border border-zinc-700 rounded-lg bg-zinc-900/50 overflow-hidden">
      <EditorContent editor={editor} />
    </div>
  );
}

