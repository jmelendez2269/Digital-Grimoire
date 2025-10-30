import { Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { Editor } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { ReactRenderer } from '@tiptap/react';
import React, { useEffect, useMemo, useState } from 'react';

type CommandItem = {
  title: string;
  keywords?: string[];
  icon?: React.ReactNode;
  action: (editor: Editor) => void;
};

function getDefaultCommands(): CommandItem[] {
  return [
    {
      title: 'Heading 1',
      keywords: ['h1', 'title'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: 'Heading 2',
      keywords: ['h2', 'subtitle'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'Heading 3',
      keywords: ['h3'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: 'Bullet List',
      keywords: ['list', 'ul'],
      action: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Numbered List',
      keywords: ['list', 'ol'],
      action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: 'Quote',
      keywords: ['blockquote'],
      action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: 'Code Block',
      keywords: ['code'],
      action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: 'Image',
      keywords: ['media', 'photo'],
      action: (editor) => {
        // Notify the host editor to open an upload dialog
        document.dispatchEvent(new CustomEvent('tiptap-image-upload'));
      },
    },
    {
      title: 'Divider',
      keywords: ['hr', 'separator'],
      action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
  ];
}

function SlashCommandList({
  items,
  command,
}: {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.title, ...(i.keywords || [])].some((t) => t.toLowerCase().includes(q))
    );
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="w-72 bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-md shadow-lg overflow-hidden">
      <div className="p-2 border-b border-zinc-700">
        <input
          autoFocus
          className="w-full bg-zinc-800 text-zinc-100 placeholder-zinc-400 text-sm px-2 py-1 rounded outline-none"
          placeholder="Search commands…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul className="max-h-64 overflow-auto py-1">
        {filtered.map((item, idx) => (
          <li
            key={idx}
            className="px-3 py-2 text-sm hover:bg-zinc-800 cursor-pointer"
            onMouseDown={(e) => {
              e.preventDefault();
              command(item);
            }}
          >
            {item.title}
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-3 text-sm text-zinc-400">No results</li>
        )}
      </ul>
    </div>
  );
}

export interface SlashMenuOptions {
  items?: CommandItem[];
  suggestion?: Partial<SuggestionOptions<any>>;
}

export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: 'slashMenu',

  addOptions() {
    return {
      items: getDefaultCommands(),
      suggestion: {},
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    const items = extension.options.items || getDefaultCommands();

    return [
      Suggestion({
        char: '/',
        allowSpaces: false,
        startOfLine: true,
        items: () => items,
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandList, {
                props: {
                  items,
                  command: (item: CommandItem) => {
                    props.editor.commands.command(({ editor }) => {
                      item.action(props.editor as unknown as Editor);
                      return true;
                    });
                    popup?.[0]?.hide();
                  },
                },
                editor: props.editor as any,
              });

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as any,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                theme: 'light',
              });
            },
            onUpdate(props) {
              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as any,
              });
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                return true;
              }
              return false;
            },
            onExit() {
              popup?.[0]?.destroy();
              popup = null;
              component?.destroy();
              component = null;
            },
          };
        },
      }) as any,
    ];
  },
});

export default SlashMenu;


