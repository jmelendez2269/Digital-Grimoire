import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

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

// Simple slash menu component
interface SlashMenuProps {
  items: CommandItem[];
  query: string;
  position: { top: number; left: number };
  onSelect: (item: CommandItem) => void;
  onClose: () => void;
}

function SlashMenuComponent({ items, query, position, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter items based on query
  const filtered = items.filter((item) => {
    if (!query) return true;
    const searchText = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchText) ||
      item.keywords?.some((k) => k.toLowerCase().includes(searchText))
    );
  });

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selected = menuRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return createPortal(
      <div
        ref={menuRef}
        className="fixed w-72 bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-md shadow-xl overflow-hidden z-50"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <div className="px-3 py-3 text-sm text-zinc-400">No commands found</div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed w-72 bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-md shadow-xl overflow-hidden z-50"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {query && (
        <div className="px-3 py-2 border-b border-zinc-700 text-xs text-zinc-400">
          Searching: <span className="text-zinc-200">{query}</span>
        </div>
      )}
      <div className="max-h-64 overflow-auto py-1">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            data-index={idx}
            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
              idx === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800'
            }`}
            onMouseEnter={() => setSelectedIndex(idx)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
          >
            <div className="font-medium">{item.title}</div>
            {item.keywords && item.keywords.length > 0 && (
              <div className="text-xs opacity-60 mt-0.5">
                {item.keywords.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

export interface SlashMenuOptions {
  items?: CommandItem[];
}

export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: 'slashMenu',

  addOptions() {
    return {
      items: getDefaultCommands(),
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const items = this.options.items || getDefaultCommands();
    
    const pluginKey = new PluginKey('slashMenu');

    return [
      new Plugin({
        key: pluginKey,
        
        state: {
          init() {
            return {
              active: false,
              range: { from: 0, to: 0 },
              query: '',
            };
          },
          
          apply(tr, state) {
            // Check if we should activate the slash menu
            const { selection } = tr;
            const { $from } = selection;
            
            // Get text before cursor
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
            
            // Check if we just typed "/"
            const slashMatch = textBefore.match(/\/(\w*)$/);
            
            if (slashMatch) {
              const from = $from.pos - slashMatch[0].length;
              const to = $from.pos;
              const query = slashMatch[1] || '';
              
              return {
                active: true,
                range: { from, to },
                query,
              };
            }
            
            return { active: false, range: { from: 0, to: 0 }, query: '' };
          },
        },
        
        props: {
          decorations(state) {
            return DecorationSet.empty;
          },
          
          handleKeyDown(view, event) {
            const pluginState = pluginKey.getState(view.state);
            
            // If menu is not active, don't handle
            if (!pluginState?.active) return false;
            
            // Let the React component handle arrow keys, Enter, and Escape
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
              // The React component will handle these via its own event listener
              return false;
            }
            
            return false;
          },
        },
        
        view() {
          let menuRoot: HTMLDivElement | null = null;
          let reactRoot: any = null;

          return {
            update(view, prevState) {
              const pluginState = pluginKey.getState(view.state);
              
              if (pluginState?.active) {
                // Calculate position
                const { from } = pluginState.range;
                const start = view.coordsAtPos(from);
                
                const position = {
                  top: start.bottom + 8,
                  left: start.left,
                };
                
                // Render menu
                if (!menuRoot) {
                  menuRoot = document.createElement('div');
                  menuRoot.id = 'slash-menu-root';
                  document.body.appendChild(menuRoot);
                }
                
                // Use React 18 createRoot if available, otherwise legacy render
                const React = require('react');
                const ReactDOM = require('react-dom/client');
                
                const handleSelect = (item: CommandItem) => {
                  const { from, to } = pluginState.range;
                  
                  // Delete the slash command
                  view.dispatch(
                    view.state.tr.deleteRange(from, to)
                  );
                  
                  // Clean up menu first
                  if (menuRoot) {
                    if (reactRoot) {
                      reactRoot.unmount();
                      reactRoot = null;
                    }
                    menuRoot.remove();
                    menuRoot = null;
                  }
                  
                  // Use setTimeout to ensure the deletion transaction is fully processed
                  // before executing the command
                  setTimeout(() => {
                    // Ensure editor is focused
                    editor.view.focus();
                    // Execute the command
                    item.action(editor as Editor);
                  }, 0);
                };
                
                const handleClose = () => {
                  if (menuRoot) {
                    if (reactRoot) {
                      reactRoot.unmount();
                      reactRoot = null;
                    }
                    menuRoot.remove();
                    menuRoot = null;
                  }
                };
                
                if (!reactRoot) {
                  reactRoot = ReactDOM.createRoot(menuRoot);
                }
                
                reactRoot.render(
                  React.createElement(SlashMenuComponent, {
                    items,
                    query: pluginState.query,
                    position,
                    onSelect: handleSelect,
                    onClose: handleClose,
                  })
                );
              } else {
                // Clean up menu if it exists
                if (menuRoot) {
                  if (reactRoot) {
                    reactRoot.unmount();
                    reactRoot = null;
                  }
                  menuRoot.remove();
                  menuRoot = null;
                }
              }
            },
            
            destroy() {
              if (menuRoot) {
                if (reactRoot) {
                  reactRoot.unmount();
                }
                menuRoot.remove();
              }
            },
          };
        },
      }),
    ];
  },
});

export default SlashMenu;


