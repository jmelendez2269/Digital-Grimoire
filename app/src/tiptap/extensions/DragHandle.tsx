import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from 'prosemirror-state';

function moveCurrentBlock(editor: Editor, direction: 'up' | 'down') {
  const { state, view } = editor;
  const { $from } = state.selection;
  const depth = $from.depth;
  const nodePos = $from.before(depth);
  const node = state.doc.nodeAt(nodePos);
  if (!node) return false;

  // Find the parent and index of current node
  const parent = $from.node(depth - 1) ?? state.doc;
  const index = parent.childAfter(nodePos - (depth > 0 ? $from.before(depth - 1) + 1 : 0)).index;

  const parentPos = depth > 0 ? $from.before(depth - 1) : 0;

  // Determine target index
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= parent.childCount) return false;

  const tr = state.tr;

  // Remove the current node
  const from = nodePos;
  const to = nodePos + node.nodeSize;
  const removed = node.copy(node.content);
  tr.delete(from, to);

  // Compute insertion position at target index after deletion
  const resolvedParent = tr.doc.resolve(parentPos + 1);
  let insertPos = parentPos + 1;
  for (let i = 0; i < parent.childCount; i++) {
    const child = tr.doc.nodeAt(insertPos);
    if (i === targetIndex) break;
    if (!child) break;
    insertPos += child.nodeSize;
  }

  tr.insert(insertPos, removed);
  view.dispatch(tr);
  return true;
}

export const DragHandle = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    const editor = this.editor as Editor;
    const key = new PluginKey('drag-handle');

    return [
      new Plugin({
        key,
        view(view) {
          const handle = document.createElement('div');
          handle.setAttribute('data-drag-handle', 'true');
          handle.className = 'absolute -ml-8 mt-1 text-zinc-400 hover:text-amber-400 cursor-grab select-none';
          handle.innerText = '⋮⋮';
          handle.style.display = 'none';

          // Position the handle next to the current block selection cursor
          const updatePosition = () => {
            const { state } = view;
            const { $from } = state.selection;
            const coords = view.coordsAtPos($from.pos);
            const editorRect = (view.dom as HTMLElement).getBoundingClientRect();
            handle.style.left = `${coords.left - editorRect.left}px`;
            handle.style.top = `${coords.top - editorRect.top}px`;
          };

          // Up/Down buttons on right-click for quick reorder
          handle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Toggle small bubble with up/down
            const bubble = document.createElement('div');
            bubble.className = 'absolute z-50 -ml-2 mt-6 bg-zinc-900 text-zinc-100 border border-zinc-700 rounded shadow';
            const up = document.createElement('button');
            up.className = 'block px-3 py-1 text-sm hover:bg-zinc-800 w-full text-left';
            up.textContent = 'Move up';
            const down = document.createElement('button');
            down.className = 'block px-3 py-1 text-sm hover:bg-zinc-800 w-full text-left';
            down.textContent = 'Move down';
            bubble.appendChild(up);
            bubble.appendChild(down);
            handle.parentElement?.appendChild(bubble);
            const cleanup = () => bubble.remove();
            setTimeout(() => document.addEventListener('click', cleanup, { once: true }));

            up.addEventListener('click', (ev) => {
              ev.preventDefault();
              moveCurrentBlock(editor, 'up');
              cleanup();
            });
            down.addEventListener('click', (ev) => {
              ev.preventDefault();
              moveCurrentBlock(editor, 'down');
              cleanup();
            });
          });

          // Basic drag visual (no HTML5 DnD for simplicity here)
          handle.addEventListener('mousedown', () => {
            handle.classList.remove('cursor-grab');
            handle.classList.add('cursor-grabbing');
          });
          document.addEventListener('mouseup', () => {
            handle.classList.add('cursor-grab');
            handle.classList.remove('cursor-grabbing');
          });

          (view.dom as HTMLElement).style.position = 'relative';
          (view.dom as HTMLElement).appendChild(handle);

          return {
            update() {
              const { state } = view;
              const { $from } = state.selection;
              if (!$from) return;
              handle.style.display = 'block';
              updatePosition();
            },
            destroy() {
              handle.remove();
            },
          };
        },
      }),
    ];
  },
});

export default DragHandle;


