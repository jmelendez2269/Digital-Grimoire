import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';

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
    // Guard against SSR
    if (typeof window === 'undefined') return [];
    
    const editor = this.editor as Editor;
    const key = new PluginKey('drag-handle');

    return [
      new Plugin({
        key,
        view(view) {
          console.log('[DragHandle] Plugin view initializing');
          const handle = document.createElement('div');
          handle.setAttribute('data-drag-handle', 'true');
          handle.className = 'absolute text-zinc-400 hover:text-amber-400 cursor-pointer select-none flex items-center justify-center';
          handle.innerText = '⋮⋮';
          handle.style.zIndex = '50';
          handle.style.width = '24px';
          handle.style.height = '24px';
          handle.style.display = 'none';
          handle.style.position = 'absolute'; // Ensure absolute positioning
          handle.style.fontSize = '18px';
          handle.style.lineHeight = '1';
          handle.style.pointerEvents = 'auto';
          handle.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Temporary: make it visible for debugging

          let isHoveringEditor = false;
          let currentBlockElement: HTMLElement | null = null;
          let parentContainer: HTMLElement | null = null;

          // Position the handle next to a specific block element
          const updatePosition = (blockElement: HTMLElement, container: HTMLElement) => {
            const containerRect = container.getBoundingClientRect();
            const blockRect = blockElement.getBoundingClientRect();
            
            // Calculate position accounting for container's padding (px-4 = 16px)
            // Position handle 8px to the left of the block start
            const leftPos = blockRect.left - containerRect.left - 24; // 16px padding + 8px spacing
            const topPos = blockRect.top - containerRect.top + 2; // Small offset for alignment
            
            console.log('[DragHandle] updatePosition:', {
              leftPos,
              topPos,
              blockRect: { left: blockRect.left, top: blockRect.top },
              containerRect: { left: containerRect.left, top: containerRect.top },
              containerTag: container.tagName,
              blockTag: blockElement.tagName
            });
            
            handle.style.left = `${leftPos}px`;
            handle.style.top = `${topPos}px`;
            handle.style.display = 'flex';
            handle.style.position = 'absolute'; // Ensure absolute positioning
            console.log('[DragHandle] Handle display set to flex, position:', handle.style.left, handle.style.top);
            console.log('[DragHandle] Handle computed style:', {
              display: window.getComputedStyle(handle).display,
              visibility: window.getComputedStyle(handle).visibility,
              opacity: window.getComputedStyle(handle).opacity,
              zIndex: window.getComputedStyle(handle).zIndex
            });
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

          // Show handle on hover over blocks
          const editorElement = view.dom as HTMLElement;
          console.log('[DragHandle] Editor element:', editorElement, editorElement.tagName);
          editorElement.style.position = 'relative';
          
          // Find the parent container (usually the wrapper div from JournalEditor)
          let container = editorElement;
          let depth = 0;
          while (container.parentElement && container.parentElement !== document.body && depth < 10) {
            const parent = container.parentElement;
            console.log(`[DragHandle] Checking parent at depth ${depth}:`, parent.tagName, parent.className);
            // Check if parent has the border class from JournalEditor
            if (parent.classList.contains('border') || parent.classList.contains('rounded-lg')) {
              parentContainer = parent as HTMLElement;
              console.log('[DragHandle] Found container with border/rounded:', parentContainer);
              break;
            }
            container = parent;
            depth++;
          }
          if (!parentContainer) {
            parentContainer = editorElement.parentElement || editorElement;
            console.log('[DragHandle] Using fallback container:', parentContainer);
          }
          parentContainer.style.position = 'relative';
          parentContainer.appendChild(handle);
          console.log('[DragHandle] Handle appended to container:', parentContainer, handle.parentElement === parentContainer);

          const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            console.log('[DragHandle] MouseOver fired, target:', target?.tagName, target?.className);
            
            // Skip if hovering over the handle itself
            if (target === handle || handle.contains(target)) {
              console.log('[DragHandle] Ignoring - hovering over handle itself');
              return;
            }
            
            // Find the block element at the mouse position using ProseMirror's view API
            let block: HTMLElement | null = null;
            
            if (target === editorElement || editorElement.contains(target)) {
              // Use ProseMirror's posAtCoords to find the document position at mouse coordinates
              const coords = { left: e.clientX, top: e.clientY };
              const posAtCoords = view.posAtCoords(coords);
              
              if (posAtCoords) {
                console.log('[DragHandle] ProseMirror posAtCoords:', posAtCoords);
                // Get the DOM node at this position
                const domAtPos = view.domAtPos(posAtCoords.pos);
                console.log('[DragHandle] DOM at pos:', domAtPos.node.nodeName, domAtPos.offset);
                
                // The node from domAtPos might be a text node, so find the block element
                let domNode: Node | null = domAtPos.node;
                if (domNode.nodeType === Node.TEXT_NODE) {
                  domNode = domNode.parentElement;
                }
                
                if (domNode instanceof HTMLElement && editorElement.contains(domNode)) {
                  // Use closest to find the block element
                  block = domNode.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, ul, ol') as HTMLElement;
                  if (block) {
                    console.log('[DragHandle] Found block via ProseMirror + closest:', block.tagName);
                  }
                }
              }
              
              // Fallback: try DOM-based detection
              if (!block) {
                // Try closest first (for nested elements like spans inside paragraphs)
                block = target.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, ul, ol') as HTMLElement;
                
                if (!block) {
                  const coords = { left: e.clientX, top: e.clientY };
                  const elementAtPoint = document.elementFromPoint(coords.left, coords.top);
                  if (elementAtPoint && editorElement.contains(elementAtPoint)) {
                    block = (elementAtPoint.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, ul, ol') || 
                             elementAtPoint as HTMLElement) as HTMLElement;
                    
                    if (block) {
                      const tagName = block.tagName.toLowerCase();
                      if (!['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'blockquote', 'ul', 'ol'].includes(tagName)) {
                        block = null;
                      }
                    }
                  }
                }
              }
            }
            
            console.log('[DragHandle] Found block:', block?.tagName, block?.className);
            console.log('[DragHandle] Block checks:', {
              hasBlock: !!block,
              isHTMLElement: block instanceof HTMLElement,
              contains: block ? editorElement.contains(block) : false,
              hasContainer: !!parentContainer
            });
            
            if (block && block instanceof HTMLElement && editorElement.contains(block) && parentContainer) {
              console.log('[DragHandle] All checks passed, updating position');
              currentBlockElement = block;
              updatePosition(block, parentContainer);
              isHoveringEditor = true;
            } else {
              console.log('[DragHandle] Block check failed, not showing handle');
            }
          };

          const handleMouseOut = (e: MouseEvent) => {
            const relatedTarget = e.relatedTarget as HTMLElement;
            // Hide handle if mouse leaves editor and not hovering over handle
            if (!editorElement.contains(relatedTarget) && relatedTarget !== handle) {
              isHoveringEditor = false;
              setTimeout(() => {
                if (!isHoveringEditor) {
                  handle.style.display = 'none';
                  currentBlockElement = null;
                }
              }, 100);
            }
          };

          editorElement.addEventListener('mouseover', handleMouseOver);
          editorElement.addEventListener('mouseout', handleMouseOut);

          // Keep handle visible when hovering over it
          handle.addEventListener('mouseenter', () => {
            isHoveringEditor = true;
          });

          handle.addEventListener('mouseleave', () => {
            isHoveringEditor = false;
            setTimeout(() => {
              if (!isHoveringEditor) {
                handle.style.display = 'none';
                currentBlockElement = null;
              }
            }, 100);
          });

          return {
            update(view, prevState) {
              // Force update position on every update if we have a block
              if (currentBlockElement && parentContainer) {
                updatePosition(currentBlockElement, parentContainer);
              }
            },
            destroy() {
              editorElement.removeEventListener('mouseover', handleMouseOver);
              editorElement.removeEventListener('mouseout', handleMouseOut);
              if (handle.parentElement) {
                handle.remove();
              }
            },
          };
        },
      }),
    ];
  },
});

export default DragHandle;


