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
          // Create handle and append to body (like SlashMenu does)
          const handle = document.createElement('div');
          handle.setAttribute('data-drag-handle', 'true');
          handle.innerText = '⋮⋮';
          
          // Use fixed positioning like SlashMenu - append to body
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
          let dragStartY = 0;
          let lastDropTarget: HTMLElement | null = null;

          const updatePosition = (block: HTMLElement) => {
            const rect = block.getBoundingClientRect();
            handle.style.left = `${rect.left - 32}px`;
            handle.style.top = `${rect.top}px`;
            handle.style.display = 'flex';
          };

          const handleMouseOver = (e: MouseEvent) => {
            if (isDragging) return;
            
            const target = e.target as HTMLElement;
            if (!target || target === handle || handle.contains(target)) return;

            const editorDom = view.dom as HTMLElement;
            if (!editorDom.contains(target) && target !== editorDom) return;

            // Find block element
            const block = target.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote') as HTMLElement;
            
            if (block && editorDom.contains(block)) {
              currentBlock = block;
              updatePosition(block);
            }
          };

          const handleMouseOut = (e: MouseEvent) => {
            if (isDragging) return;
            
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (relatedTarget !== handle && !handle.contains(relatedTarget)) {
              const editorDom = view.dom as HTMLElement;
              if (!editorDom.contains(relatedTarget)) {
                handle.style.display = 'none';
                currentBlock = null;
              }
            }
          };

          // Drag functionality
          handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('[DragHandle] mousedown, currentBlock:', currentBlock);
            
            if (!currentBlock) {
              console.log('[DragHandle] No currentBlock, aborting');
              return;
            }
            
            isDragging = true;
            draggedBlock = currentBlock;
            dragStartY = e.clientY;
            
            console.log('[DragHandle] Starting drag, block:', draggedBlock.tagName);
            
            draggedBlock.style.opacity = '0.5';
            draggedBlock.style.transition = 'opacity 0.2s';
            handle.style.cursor = 'grabbing';

            const handleMouseMove = (e: MouseEvent) => {
              if (!isDragging) return;
              
              // Move handle with mouse for visual feedback
              handle.style.top = `${e.clientY - 12}px`;
              
              // Find potential drop target and remember it
              const editorDom = view.dom as HTMLElement;
              let potentialTarget: HTMLElement | null = null;
              
              // Try elementFromPoint first, but offset slightly to avoid the handle
              const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
              if (elementAtPoint && elementAtPoint !== handle && !handle.contains(elementAtPoint)) {
                potentialTarget = elementAtPoint.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote') as HTMLElement;
              }
              
              // Fallback: use ProseMirror coordinates
              if (!potentialTarget) {
                const coords = view.posAtCoords({ left: e.clientX, top: e.clientY });
                if (coords && coords.pos !== null && coords.pos !== undefined) {
                  try {
                    const domAtPos = view.domAtPos(coords.pos);
                    let domNode: Node | null = domAtPos.node;
                    if (domNode.nodeType === Node.TEXT_NODE) {
                      domNode = domNode.parentElement;
                    }
                    if (domNode instanceof HTMLElement) {
                      potentialTarget = domNode.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote') as HTMLElement;
                      if (!potentialTarget) {
                        const tagName = domNode.tagName.toLowerCase();
                        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'blockquote'].includes(tagName)) {
                          potentialTarget = domNode;
                        }
                      }
                    }
                  } catch (err) {
                    // Ignore errors
                  }
                }
              }
              
              if (potentialTarget && editorDom.contains(potentialTarget) && potentialTarget !== draggedBlock) {
                lastDropTarget = potentialTarget; // Remember the last valid target
                potentialTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.1)';
                setTimeout(() => {
                  if (potentialTarget && potentialTarget !== draggedBlock) {
                    potentialTarget.style.backgroundColor = '';
                  }
                }, 100);
              }
            };

            const handleMouseUp = (e: MouseEvent) => {
              console.log('[DragHandle] mouseup, finding drop target at:', e.clientX, e.clientY);
              
              isDragging = false;
              handle.style.cursor = 'grab';
              
              // Reset handle position
              if (currentBlock) {
                updatePosition(currentBlock);
              }

              if (!draggedBlock) {
                console.log('[DragHandle] No draggedBlock on mouseup');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return;
              }

              // Restore opacity
              draggedBlock.style.opacity = '1';
              
              // Find drop target - prioritize lastDropTarget (most reliable during drag)
              const editorDom = view.dom as HTMLElement;
              let targetBlock: HTMLElement | null = null;
              let targetCoords: { pos: number; inside: number } | null = null;
              
              // Method 1: Use the last remembered drop target (set during drag)
              if (lastDropTarget && editorDom.contains(lastDropTarget) && lastDropTarget !== draggedBlock) {
                console.log('[DragHandle] Using last remembered drop target:', lastDropTarget.tagName);
                targetBlock = lastDropTarget;
                
                // Get coordinates for this target block
                const targetRect = lastDropTarget.getBoundingClientRect();
                targetCoords = view.posAtCoords({
                  left: targetRect.left + targetRect.width / 2,
                  top: targetRect.top + targetRect.height / 2
                });
              }
              
              // Method 2: Try ProseMirror coordinates if no lastDropTarget
              if (!targetBlock) {
                const coords = view.posAtCoords({
                  left: e.clientX,
                  top: e.clientY
                });
                
                console.log('[DragHandle] Target coords from ProseMirror:', coords);
                targetCoords = coords;
                
                if (coords && coords.pos !== null && coords.pos !== undefined) {
                  try {
                    const domAtPos = view.domAtPos(coords.pos);
                    let domNode: Node | null = domAtPos.node;
                    
                    console.log('[DragHandle] DOM at pos:', {
                      nodeType: domNode.nodeType,
                      nodeName: domNode.nodeName,
                      offset: domAtPos.offset
                    });
                    
                    // If it's a text node, get parent
                    if (domNode.nodeType === Node.TEXT_NODE) {
                      domNode = domNode.parentElement;
                    }
                    
                    if (domNode instanceof HTMLElement) {
                      console.log('[DragHandle] DOM node element:', domNode.tagName, domNode.className);
                      
                      // Try closest first
                      targetBlock = domNode.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote') as HTMLElement;
                      
                      // If closest didn't work, check if the node itself is a block
                      if (!targetBlock) {
                        const tagName = domNode.tagName.toLowerCase();
                        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'blockquote'].includes(tagName)) {
                          targetBlock = domNode;
                          console.log('[DragHandle] Node itself is a block:', tagName);
                        } else {
                          // Walk up the tree to find a block
                          let parent = domNode.parentElement;
                          while (parent && parent !== editorDom) {
                            const parentTag = parent.tagName.toLowerCase();
                            if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'blockquote'].includes(parentTag)) {
                              targetBlock = parent;
                              console.log('[DragHandle] Found block by walking up tree:', parentTag);
                              break;
                            }
                            parent = parent.parentElement;
                          }
                        }
                      } else {
                        console.log('[DragHandle] Found block via closest:', targetBlock.tagName);
                      }
                    }
                  } catch (err) {
                    console.error('[DragHandle] Error finding block via ProseMirror:', err);
                  }
                }
              }
              
              // Method 3: Fallback to elementFromPoint if still no target
              if (!targetBlock) {
                const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
                console.log('[DragHandle] Element at point (fallback):', elementAtPoint?.tagName, elementAtPoint?.className);
                
                if (elementAtPoint && elementAtPoint !== handle && !handle.contains(elementAtPoint)) {
                  // Only look within editor
                  if (editorDom.contains(elementAtPoint)) {
                    targetBlock = elementAtPoint.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote') as HTMLElement;
                    
                    // If found, get coordinates
                    if (targetBlock) {
                      const targetRect = targetBlock.getBoundingClientRect();
                      targetCoords = view.posAtCoords({
                        left: targetRect.left + targetRect.width / 2,
                        top: targetRect.top + targetRect.height / 2
                      });
                    }
                  }
                }
              }
              
              console.log('[DragHandle] Drop target:', targetBlock?.tagName, 'dragged:', draggedBlock.tagName);
              
              if (targetBlock && editorDom.contains(targetBlock) && targetBlock !== draggedBlock) {
                console.log('[DragHandle] Valid drop target, calculating positions');
                
                // Get positions using ProseMirror
                // Use targetCoords we already calculated (or recalculate if needed)
                let finalTargetCoords = targetCoords;
                if (!finalTargetCoords || finalTargetCoords.pos === null || finalTargetCoords.pos === undefined) {
                  // Try to get coordinates from the target block itself
                  if (targetBlock) {
                    const targetRect = targetBlock.getBoundingClientRect();
                    finalTargetCoords = view.posAtCoords({
                      left: targetRect.left + targetRect.width / 2,
                      top: targetRect.top + targetRect.height / 2
                    });
                  }
                  
                  // Last resort: use mouse position
                  if (!finalTargetCoords || finalTargetCoords.pos === null || finalTargetCoords.pos === undefined) {
                    finalTargetCoords = view.posAtCoords({
                      left: e.clientX,
                      top: e.clientY
                    });
                  }
                }
                
                const draggedRect = draggedBlock.getBoundingClientRect();
                const draggedCoords = view.posAtCoords({
                  left: draggedRect.left + draggedRect.width / 2,
                  top: draggedRect.top + draggedRect.height / 2
                });

                console.log('[DragHandle] Positions:', {
                  dragged: draggedCoords?.pos,
                  target: finalTargetCoords?.pos
                });

                if (draggedCoords && draggedCoords.pos !== null && draggedCoords.pos !== undefined &&
                    finalTargetCoords && finalTargetCoords.pos !== null && finalTargetCoords.pos !== undefined) {
                    try {
                      const { state } = editor;
                      
                      // Use the dragged and target positions directly
                      const $dragged = state.doc.resolve(draggedCoords.pos);
                      const $target = state.doc.resolve(finalTargetCoords.pos);
                      
                      // Get the depth - we want the paragraph/heading level (usually depth 1)
                      const draggedDepth = $dragged.depth;
                      const targetDepth = $target.depth;
                      
                      // Find the actual block node position
                      // For paragraphs/headings, they're typically direct children of doc (depth 1)
                      let draggedNodePos: number;
                      let draggedNode;
                      
                      // Try to find the block at the appropriate depth
                      if (draggedDepth >= 1) {
                        // Get the node at depth 1 (the block level)
                        const blockDepth = draggedDepth >= 1 ? 1 : draggedDepth;
                        draggedNodePos = $dragged.before(blockDepth);
                        draggedNode = state.doc.nodeAt(draggedNodePos);
                        
                        // If not found, try the parent
                        if (!draggedNode && draggedDepth > 1) {
                          draggedNodePos = $dragged.before(draggedDepth);
                          draggedNode = state.doc.nodeAt(draggedNodePos);
                        }
                      } else {
                        // At document level, find the first child
                        draggedNodePos = 1;
                        draggedNode = state.doc.child(0);
                      }
                      
                      console.log('[DragHandle] Node info:', {
                        draggedDepth,
                        draggedNodePos,
                        draggedNodeType: draggedNode?.type.name,
                        draggedNodeSize: draggedNode?.nodeSize,
                        targetDepth
                      });
                      
                      if (draggedNode && draggedNodePos >= 0) {
                        // Find target position
                        let targetNodePos: number;
                        let targetNode;
                        
                        if (targetDepth >= 1) {
                          const blockDepth = targetDepth >= 1 ? 1 : targetDepth;
                          targetNodePos = $target.before(blockDepth);
                          targetNode = state.doc.nodeAt(targetNodePos);
                          
                          if (!targetNode && targetDepth > 1) {
                            targetNodePos = $target.before(targetDepth);
                            targetNode = state.doc.nodeAt(targetNodePos);
                          }
                        } else {
                          targetNodePos = 1;
                          targetNode = state.doc.child(0);
                        }
                        
                        const targetRect = targetBlock.getBoundingClientRect();
                        const shouldInsertAfter = e.clientY > targetRect.top + targetRect.height / 2;
                        
                        // Calculate insert position based on target
                        const insertPos = shouldInsertAfter && targetNode
                          ? targetNodePos + targetNode.nodeSize
                          : (targetNodePos || 1);
                        
                        console.log('[DragHandle] Insert position:', {
                          draggedNodePos,
                          insertPos,
                          shouldInsertAfter,
                          targetNodePos,
                          willMove: draggedNodePos !== insertPos && draggedNodePos !== insertPos - 1
                        });
                        
                        // Only move if it's actually different
                        if (draggedNodePos !== insertPos && draggedNodePos !== insertPos - 1 && Math.abs(draggedNodePos - insertPos) > 1) {
                          const tr = state.tr;
                          const nodeCopy = draggedNode.copy(draggedNode.content);
                          
                          // Delete from original position first
                          tr.delete(draggedNodePos, draggedNodePos + draggedNode.nodeSize);
                          
                          // Adjust insert position if we deleted before the target
                          const adjustedPos = draggedNodePos < insertPos 
                            ? insertPos - draggedNode.nodeSize 
                            : insertPos;
                          
                          console.log('[DragHandle] Adjusted position:', adjustedPos, 'doc size:', tr.doc.content.size);
                          
                          // Ensure position is valid (ProseMirror positions start at 1)
                          if (adjustedPos >= 1 && adjustedPos <= tr.doc.content.size) {
                            try {
                              tr.insert(adjustedPos, nodeCopy);
                              view.dispatch(tr);
                              console.log('[DragHandle] ✓ Block moved successfully');
                            } catch (insertErr) {
                              console.error('[DragHandle] Insert failed:', insertErr);
                              console.error('[DragHandle] Details:', {
                                adjustedPos,
                                docSize: tr.doc.content.size,
                                nodeSize: draggedNode.nodeSize,
                                nodeType: draggedNode.type.name
                              });
                            }
                          } else {
                            console.error('[DragHandle] Invalid adjusted position:', adjustedPos, 'doc size:', tr.doc.content.size);
                          }
                        } else {
                          console.log('[DragHandle] Same position, no move needed');
                        }
                      } else {
                        console.error('[DragHandle] Could not find dragged node. draggedNodePos:', draggedNodePos, 'draggedNode:', draggedNode);
                      }
                    } catch (err) {
                      console.error('[DragHandle] Move failed with error:', err);
                    }
                } else {
                  console.error('[DragHandle] Invalid coordinates:', { draggedCoords, finalTargetCoords });
                }
              } else {
                console.log('[DragHandle] Invalid drop target or same block');
              }
              
              draggedBlock = null;
              lastDropTarget = null; // Reset for next drag
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove, { passive: true });
            document.addEventListener('mouseup', handleMouseUp);
          });

          const editorDom = view.dom as HTMLElement;
          editorDom.addEventListener('mouseover', handleMouseOver);
          editorDom.addEventListener('mouseout', handleMouseOut);

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


