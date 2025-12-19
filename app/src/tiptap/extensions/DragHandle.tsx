import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const DragHandle = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    if (typeof window === 'undefined') return [];
    
    const editor = this.editor as Editor;
    const key = new PluginKey('drag-handle');

    return [
      new Plugin({
        key,
        view(view) {
          // Create handle and append to body
          const handle = document.createElement('div');
          handle.setAttribute('data-drag-handle', 'true');
          handle.innerText = '⋮⋮';
          
          handle.style.cssText = `
            position: fixed !important;
            z-index: 100 !important;
            width: 24px !important;
            height: 24px !important;
            font-size: 18px !important;
            line-height: 1 !important;
            color: #a1a1aa !important;
            cursor: grab !important;
            user-select: none !important;
            pointer-events: auto !important;
            background-color: rgba(0, 0, 0, 0.7) !important;
            border-radius: 4px !important;
            padding: 4px !important;
            display: none !important;
            align-items: center !important;
            justify-content: center !important;
            transition: color 0.2s !important;
            flex-direction: row !important;
          `;
          
          handle.addEventListener('mouseenter', () => {
            handle.style.color = '#fbbf24';
          });
          
          handle.addEventListener('mouseleave', () => {
            handle.style.color = '#a1a1aa';
          });

          document.body.appendChild(handle);

          let currentBlock: HTMLElement | null = null;
          let isDragging = false;
          let draggedBlock: HTMLElement | null = null;
          let draggedBlockNodePos: number | null = null;

          const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote';

          // Find ProseMirror position for a DOM block element by matching DOM nodes
          const findBlockPosition = (blockElement: HTMLElement): number | null => {
            try {
              const { state } = editor;
              
              console.log('[DragHandle] Finding position for block:', blockElement.tagName, blockElement.textContent?.substring(0, 50));
              
              // Walk through ProseMirror document and match DOM nodes
              let foundPos: number | null = null;
              
              state.doc.descendants((node, pos) => {
                if (foundPos !== null) return false; // Stop if found
                
                // Only check block nodes (paragraphs, headings, etc.)
                if (node.isBlock && node.type.name !== 'doc') {
                  try {
                    // Get the DOM node for this ProseMirror position
                    const domAtPos = view.domAtPos(pos);
                    let domNode: Node | null = domAtPos.node;
                    
                    // If it's a text node, get parent
                    if (domNode.nodeType === Node.TEXT_NODE) {
                      domNode = domNode.parentElement;
                    }
                    
                    // Check if this DOM node matches our block element
                    if (domNode === blockElement) {
                      foundPos = pos;
                      console.log('[DragHandle] Found exact match at position:', pos);
                      return false; // Stop searching
                    }
                    
                    // Also check if the block element contains this node or vice versa
                    if (domNode instanceof Element && blockElement instanceof Element) {
                      if (blockElement.contains(domNode) || domNode.contains(blockElement)) {
                        // Walk up from domNode to find the block
                        let walkNode: Element | null = domNode as Element;
                        while (walkNode && walkNode !== view.dom) {
                          if (walkNode === blockElement) {
                            foundPos = pos;
                            console.log('[DragHandle] Found via containment at position:', pos);
                            return false;
                          }
                          walkNode = walkNode.parentElement;
                        }
                      }
                    }
                  } catch (err) {
                    // Ignore errors for this node
                  }
                }
                return true; // Continue searching
              });
              
              if (foundPos === null) {
                console.warn('[DragHandle] Could not find position for block:', blockElement.tagName);
              }
              
              return foundPos;
            } catch (err) {
              console.error('[DragHandle] Error finding block position:', err);
              return null;
            }
          };

          // Find the block node at a given position
          const getBlockNodeAtPos = (pos: number): { nodePos: number; node: any } | null => {
            try {
              const { state } = editor;
              const $pos = state.doc.resolve(pos);
              
              // Walk up to find the block node (usually at depth 1)
              for (let depth = $pos.depth; depth >= 1; depth--) {
                const nodePos = $pos.before(depth);
                const node = state.doc.nodeAt(nodePos);
                
                if (node && node.isBlock) {
                  return { nodePos, node };
                }
              }
              
              return null;
            } catch (err) {
              console.error('[DragHandle] Error getting block node:', err);
              return null;
            }
          };

          const updatePosition = (block: HTMLElement) => {
            if (!block || isDragging) return;
            const rect = block.getBoundingClientRect();
            handle.style.left = `${rect.left - 32}px`;
            handle.style.top = `${rect.top}px`;
            handle.style.display = 'flex';
          };
          
          // Update position on scroll
          let scrollRafId: number | null = null;
          const handleScroll = () => {
            if (currentBlock && !isDragging) {
              if (scrollRafId !== null) {
                cancelAnimationFrame(scrollRafId);
              }
              scrollRafId = requestAnimationFrame(() => {
                updatePosition(currentBlock!);
                scrollRafId = null;
              });
            }
          };
          
          // Update position on resize
          let resizeTimeout: NodeJS.Timeout | null = null;
          const handleResize = () => {
            if (currentBlock && !isDragging) {
              if (resizeTimeout) {
                clearTimeout(resizeTimeout);
              }
              resizeTimeout = setTimeout(() => {
                updatePosition(currentBlock!);
                resizeTimeout = null;
              }, 16);
            }
          };

          const handleMouseOver = (e: MouseEvent) => {
            if (isDragging) return;
            
            const target = e.target as HTMLElement;
            if (!target || target === handle || handle.contains(target)) {
              if (currentBlock && (target === handle || handle.contains(target))) {
                updatePosition(currentBlock);
              }
              return;
            }

            const editorDom = view.dom as HTMLElement;
            if (!editorDom.contains(target) && target !== editorDom) return;

            const block = target.closest(BLOCK_SELECTOR) as HTMLElement;
            
            if (block && editorDom.contains(block)) {
              currentBlock = block;
              updatePosition(block);
            }
          };

          const handleMouseOut = (e: MouseEvent) => {
            if (isDragging) return;
            
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (relatedTarget === handle || handle.contains(relatedTarget)) {
              return;
            }
            
            const editorDom = view.dom as HTMLElement;
            if (relatedTarget && !editorDom.contains(relatedTarget) && relatedTarget !== editorDom) {
              handle.style.display = 'none';
              currentBlock = null;
            }
          };

          // Drag functionality
          handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('[DragHandle] mousedown', { hasCurrentBlock: !!currentBlock });
            
            if (!currentBlock) {
              console.log('[DragHandle] No currentBlock, aborting');
              return;
            }
            
            isDragging = true;
            draggedBlock = currentBlock;
            
            console.log('[DragHandle] Starting drag for block:', draggedBlock.tagName);
            
            // Find the ProseMirror position for this block
            draggedBlockNodePos = findBlockPosition(draggedBlock);
            
            if (draggedBlockNodePos === null) {
              console.warn('[DragHandle] Could not find position for dragged block');
              isDragging = false;
              draggedBlock = null;
              return;
            }
            
            console.log('[DragHandle] Dragged block position:', draggedBlockNodePos);
            
            draggedBlock.style.opacity = '0.5';
            draggedBlock.style.transition = 'opacity 0.2s';
            handle.style.cursor = 'grabbing';

            const handleMouseMove = (e: MouseEvent) => {
              if (!isDragging) return;
              
              // Move handle with mouse for visual feedback
              handle.style.top = `${e.clientY - 12}px`;
            };

            const handleMouseUp = (e: MouseEvent) => {
              console.log('[DragHandle] mouseup event', { 
                hasDraggedBlock: !!draggedBlock, 
                draggedBlockNodePos,
                clientY: e.clientY 
              });
              
              isDragging = false;
              handle.style.cursor = 'grab';
              
              if (currentBlock) {
                updatePosition(currentBlock);
              }

              if (!draggedBlock || draggedBlockNodePos === null) {
                console.log('[DragHandle] No dragged block or position, aborting');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return;
              }

              // Restore opacity
              draggedBlock.style.opacity = '1';
              
              // Find drop target - only if mouse is over the editor
              const editorDom = view.dom as HTMLElement;
              const editorRect = editorDom.getBoundingClientRect();
              const isOverEditor = e.clientX >= editorRect.left && 
                                  e.clientX <= editorRect.right &&
                                  e.clientY >= editorRect.top && 
                                  e.clientY <= editorRect.bottom;
              
              console.log('[DragHandle] Mouse position check:', {
                clientX: e.clientX,
                clientY: e.clientY,
                editorRect: { left: editorRect.left, right: editorRect.right, top: editorRect.top, bottom: editorRect.bottom },
                isOverEditor
              });
              
              // If not over editor, don't drop
              if (!isOverEditor) {
                console.log('[DragHandle] Mouse outside editor, canceling drop');
                draggedBlock = null;
                draggedBlockNodePos = null;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return;
              }
              
              const allBlocks = Array.from(editorDom.querySelectorAll(BLOCK_SELECTOR)) as HTMLElement[];
              
              console.log('[DragHandle] Found blocks:', allBlocks.length, 'dragged block:', draggedBlock.tagName);
              
              // Find the nearest block by Y position
              let targetBlock: HTMLElement | null = null;
              let nearestDistance = Infinity;
              
              for (const block of allBlocks) {
                if (block === draggedBlock) continue;
                
                const rect = block.getBoundingClientRect();
                const blockCenterY = rect.top + rect.height / 2;
                const distance = Math.abs(e.clientY - blockCenterY);
                
                if (distance < nearestDistance) {
                  nearestDistance = distance;
                  targetBlock = block;
                }
              }
              
              console.log('[DragHandle] Target block found:', {
                hasTarget: !!targetBlock,
                targetTag: targetBlock?.tagName,
                distance: nearestDistance,
                isSame: targetBlock === draggedBlock
              });
              
              if (!targetBlock || targetBlock === draggedBlock) {
                console.log('[DragHandle] No valid target block, aborting');
                draggedBlock = null;
                draggedBlockNodePos = null;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return;
              }
              
              // Find ProseMirror positions for both blocks
              console.log('[DragHandle] Finding positions for dragged and target blocks');
              const targetBlockNodePos = findBlockPosition(targetBlock);
              
              console.log('[DragHandle] Positions found:', {
                draggedPos: draggedBlockNodePos,
                targetPos: targetBlockNodePos
              });
              
              if (targetBlockNodePos === null) {
                console.warn('[DragHandle] Could not find position for target block');
                draggedBlock = null;
                draggedBlockNodePos = null;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return;
              }
              
              // Get the actual block nodes
              const draggedNodeInfo = getBlockNodeAtPos(draggedBlockNodePos);
              const targetNodeInfo = getBlockNodeAtPos(targetBlockNodePos);
              
              console.log('[DragHandle] Node info:', {
                dragged: draggedNodeInfo ? { nodePos: draggedNodeInfo.nodePos, nodeType: draggedNodeInfo.node.type.name } : null,
                target: targetNodeInfo ? { nodePos: targetNodeInfo.nodePos, nodeType: targetNodeInfo.node.type.name } : null
              });
              
              if (!draggedNodeInfo || !targetNodeInfo) {
                console.warn('[DragHandle] Could not get block nodes', {
                  hasDragged: !!draggedNodeInfo,
                  hasTarget: !!targetNodeInfo
                });
                draggedBlock = null;
                draggedBlockNodePos = null;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return;
              }
              
              const { nodePos: draggedNodePos, node: draggedNode } = draggedNodeInfo;
              const { nodePos: targetNodePos, node: targetNode } = targetNodeInfo;
              
              // Determine if we should insert before or after the target
              const targetRect = targetBlock.getBoundingClientRect();
              const shouldInsertAfter = e.clientY > targetRect.top + targetRect.height / 2;
              
              // Calculate insert position
              const insertPos = shouldInsertAfter 
                ? targetNodePos + targetNode.nodeSize
                : targetNodePos;
              
              console.log('[DragHandle] Move calculation:', {
                draggedNodePos,
                targetNodePos,
                insertPos,
                shouldInsertAfter,
                draggedNodeSize: draggedNode.nodeSize,
                targetNodeSize: targetNode.nodeSize
              });
              
              // Only move if positions are different
              if (draggedNodePos !== insertPos && draggedNodePos !== insertPos - 1) {
                try {
                  const { state } = editor;
                  const tr = state.tr;
                  const nodeCopy = draggedNode.copy(draggedNode.content);
                  
                  console.log('[DragHandle] Creating transaction', {
                    deleteFrom: draggedNodePos,
                    deleteTo: draggedNodePos + draggedNode.nodeSize,
                    insertAt: insertPos
                  });
                  
                  // Delete from original position
                  tr.delete(draggedNodePos, draggedNodePos + draggedNode.nodeSize);
                  
                  // Adjust insert position if we deleted before the target
                  const adjustedPos = draggedNodePos < insertPos 
                    ? insertPos - draggedNode.nodeSize 
                    : insertPos;
                  
                  console.log('[DragHandle] Adjusted position:', adjustedPos, 'doc size:', tr.doc.content.size);
                  
                  // Ensure position is valid
                  if (adjustedPos >= 1 && adjustedPos <= tr.doc.content.size) {
                    tr.insert(adjustedPos, nodeCopy);
                    view.dispatch(tr);
                    console.log('[DragHandle] ✓ Block moved successfully');
                  } else {
                    console.error('[DragHandle] Invalid insert position:', {
                      adjustedPos,
                      docSize: tr.doc.content.size,
                      min: 1,
                      max: tr.doc.content.size
                    });
                  }
                } catch (err) {
                  console.error('[DragHandle] Error moving block:', err);
                  console.error('[DragHandle] Error details:', {
                    message: err instanceof Error ? err.message : String(err),
                    stack: err instanceof Error ? err.stack : undefined
                  });
                }
              } else {
                console.log('[DragHandle] Same position, no move needed');
              }
              
              draggedBlock = null;
              draggedBlockNodePos = null;
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove, { passive: true });
            document.addEventListener('mouseup', handleMouseUp);
          });

          const editorDom = view.dom as HTMLElement;
          editorDom.addEventListener('mouseover', handleMouseOver);
          editorDom.addEventListener('mouseout', handleMouseOut);
          
          // Add scroll and resize listeners
          const scrollHandler = () => handleScroll();
          window.addEventListener('scroll', scrollHandler, { passive: true, capture: true });
          document.addEventListener('scroll', scrollHandler, { passive: true, capture: true });
          editorDom.addEventListener('scroll', scrollHandler, { passive: true });
          window.addEventListener('resize', handleResize, { passive: true });
          
          // Listen to scroll on scrollable parents
          let scrollableParent: HTMLElement | null = editorDom.parentElement;
          const scrollableParents: HTMLElement[] = [];
          while (scrollableParent && scrollableParent !== document.body) {
            const overflow = window.getComputedStyle(scrollableParent).overflowY;
            if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
              scrollableParent.addEventListener('scroll', scrollHandler, { passive: true });
              scrollableParents.push(scrollableParent);
            }
            scrollableParent = scrollableParent.parentElement;
          }

          // Keep handle visible when hovering over it
          handle.addEventListener('mouseenter', () => {
            if (currentBlock) {
              handle.style.display = 'flex';
            }
          });

          handle.addEventListener('mouseleave', () => {
            if (!isDragging) {
              handle.style.display = 'none';
            }
          });

          return {
            update() {
              if (currentBlock && !isDragging) {
                updatePosition(currentBlock);
              }
            },
            destroy() {
              editorDom.removeEventListener('mouseover', handleMouseOver);
              editorDom.removeEventListener('mouseout', handleMouseOut);
              window.removeEventListener('scroll', scrollHandler, { capture: true });
              document.removeEventListener('scroll', scrollHandler, { capture: true });
              editorDom.removeEventListener('scroll', scrollHandler);
              window.removeEventListener('resize', handleResize);
              
              // Cancel pending animations
              if (scrollRafId !== null) {
                cancelAnimationFrame(scrollRafId);
              }
              if (resizeTimeout) {
                clearTimeout(resizeTimeout);
              }
              
              // Remove scroll listeners from scrollable parents
              scrollableParents.forEach(parent => {
                parent.removeEventListener('scroll', scrollHandler);
              });
              
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
