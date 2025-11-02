import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactDOM from 'react-dom/client';

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
      console.log('[SlashMenu Component] Keydown:', e.key, 'selectedIndex:', selectedIndex, 'filtered length:', filtered.length);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        console.log('[SlashMenu Component] Enter pressed, calling onSelect');
        e.preventDefault();
        if (filtered[selectedIndex]) {
          console.log('[SlashMenu Component] Selected item:', filtered[selectedIndex].title);
          onSelect(filtered[selectedIndex]);
        } else {
          console.log('[SlashMenu Component] No item at selectedIndex:', selectedIndex);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    // Use capture phase to ensure we get the event before ProseMirror
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
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
    // Guard against SSR
    if (typeof window === 'undefined') return [];
    
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
            console.log('[SlashMenu] handleKeyDown:', event.key, 'Menu active:', pluginState?.active);
            
            // If menu is not active, don't handle
            if (!pluginState?.active) return false;
            
            // For Enter key, don't handle it here - let React component handle it
            // But prevent default to stop ProseMirror from creating a new line
            if (event.key === 'Enter') {
              console.log('[SlashMenu] Enter key pressed, preventing default but letting React handle');
              event.preventDefault();
              // Don't stop propagation - let React component's document listener catch it
              // Return false so ProseMirror doesn't handle it
              return false;
            }
            
            // Prevent default for other navigation keys
            if (['ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) {
              event.preventDefault();
              return false; // Let React component handle
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
              console.log('[SlashMenu] Plugin update, state:', pluginState);
              
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
                
                const handleSelect = (item: CommandItem) => {
                  console.log('[SlashMenu] handleSelect called with item:', item.title);
                  
                  // Get fresh plugin state
                  const currentState = pluginKey.getState(view.state);
                  console.log('[SlashMenu] Current plugin state:', currentState);
                  
                  if (!currentState?.active) {
                    console.log('[SlashMenu] Menu not active, returning');
                    return;
                  }
                  
                  const { from, to } = currentState.range;
                  console.log('[SlashMenu] Deleting range:', { from, to });
                  
                  // Clean up menu first (before state changes)
                  if (menuRoot) {
                    console.log('[SlashMenu] Cleaning up menu');
                    if (reactRoot) {
                      reactRoot.unmount();
                      reactRoot = null;
                    }
                    menuRoot.remove();
                    menuRoot = null;
                  }
                  
                  // Execute delete + command in the same transaction chain
                  // This ensures atomic execution
                  console.log('[SlashMenu] Executing deleteRange');
                  editor.chain()
                    .focus()
                    .deleteRange({ from, to })
                    .run();
                  
                  // Execute command immediately after deletion (sync execution)
                  // Use setTimeout with 0ms to let ProseMirror process the deletion first
                  setTimeout(() => {
                    console.log('[SlashMenu] Executing command action:', item.title);
                    item.action(editor as Editor);
                    console.log('[SlashMenu] Command executed');
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


