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
              
              // Find potential drop target
              const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
              if (elementAtPoint) {
                const editorDom = view.dom as HTMLElement;
                const potentialTarget = elementAtPoint.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote') as HTMLElement;
                if (potentialTarget && editorDom.contains(potentialTarget) && potentialTarget !== draggedBlock) {
                  potentialTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.1)';
                  setTimeout(() => {
                    if (potentialTarget && potentialTarget !== draggedBlock) {
                      potentialTarget.style.backgroundColor = '';
                    }
                  }, 100);
                }
              }
            };

            const handleMouseUp = (e: MouseEvent) => {
              console.log('[DragHandle] mouseup, finding drop target');
              
              isDragging = false;
              handle.style.cursor = 'grab';
              
              // Reset handle position
              if (currentBlock) {
                updatePosition(currentBlock);
              }

              // Find drop target
              const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
              
              if (!draggedBlock) {
                console.log('[DragHandle] No draggedBlock on mouseup');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return;
              }

              // Restore opacity
              draggedBlock.style.opacity = '1';
              
              if (elementAtPoint) {
                const editorDom = view.dom as HTMLElement;
                const targetBlock = elementAtPoint.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote') as HTMLElement;
                
                console.log('[DragHandle] Drop target:', targetBlock?.tagName, 'dragged:', draggedBlock.tagName);
                
                if (targetBlock && editorDom.contains(targetBlock) && targetBlock !== draggedBlock) {
                  console.log('[DragHandle] Valid drop target, calculating positions');
                  
                  // Get positions using ProseMirror
                  const draggedRect = draggedBlock.getBoundingClientRect();
                  const draggedCoords = view.posAtCoords({
                    left: draggedRect.left + draggedRect.width / 2,
                    top: draggedRect.top + draggedRect.height / 2
                  });
                  
                  const targetCoords = view.posAtCoords({
                    left: e.clientX,
                    top: e.clientY
                  });

                  console.log('[DragHandle] Positions:', {
                    dragged: draggedCoords?.pos,
                    target: targetCoords?.pos
                  });

                  if (draggedCoords?.pos !== null && draggedCoords.pos !== undefined &&
                      targetCoords?.pos !== null && targetCoords.pos !== undefined) {
                    try {
                      const { state } = editor;
                      const $dragged = state.doc.resolve(draggedCoords.pos);
                      const $target = state.doc.resolve(targetCoords.pos);
                      
                      const draggedDepth = $dragged.depth;
                      const draggedNodePos = $dragged.before(draggedDepth);
                      const draggedNode = state.doc.nodeAt(draggedNodePos);
                      
                      console.log('[DragHandle] Node info:', {
                        draggedDepth,
                        draggedNodePos,
                        draggedNodeType: draggedNode?.type.name,
                        targetDepth: $target.depth
                      });
                      
                      if (draggedNode) {
                        const targetDepth = $target.depth;
                        const targetRect = targetBlock.getBoundingClientRect();
                        const shouldInsertAfter = e.clientY > targetRect.top + targetRect.height / 2;
                        
                        const insertPos = shouldInsertAfter 
                          ? $target.after(targetDepth)
                          : $target.before(targetDepth);
                        
                        console.log('[DragHandle] Insert position:', {
                          draggedNodePos,
                          insertPos,
                          shouldInsertAfter,
                          willMove: draggedNodePos !== insertPos && draggedNodePos !== insertPos - 1
                        });
                        
                        if (draggedNodePos !== insertPos && draggedNodePos !== insertPos - 1) {
                          const tr = state.tr;
                          const nodeCopy = draggedNode.copy(draggedNode.content);
                          
                          tr.delete(draggedNodePos, draggedNodePos + draggedNode.nodeSize);
                          
                          const adjustedPos = draggedNodePos < insertPos 
                            ? insertPos - draggedNode.nodeSize 
                            : insertPos;
                          
                          console.log('[DragHandle] Adjusted position:', adjustedPos);
                          
                          if (adjustedPos >= 0 && adjustedPos <= tr.doc.content.size) {
                            tr.insert(adjustedPos, nodeCopy);
                            view.dispatch(tr);
                            console.log('[DragHandle] ✓ Block moved successfully');
                          } else {
                            console.error('[DragHandle] Invalid adjusted position:', adjustedPos, 'doc size:', tr.doc.content.size);
                          }
                        } else {
                          console.log('[DragHandle] Same position, no move needed');
                        }
                      } else {
                        console.error('[DragHandle] Could not find dragged node at position:', draggedNodePos);
                      }
                    } catch (err) {
                      console.error('[DragHandle] Move failed with error:', err);
                    }
                  } else {
                    console.error('[DragHandle] Invalid coordinates:', { draggedCoords, targetCoords });
                  }
                } else {
                  console.log('[DragHandle] Invalid drop target or same block');
                }
              } else {
                console.log('[DragHandle] No element at drop point');
              }
              
              draggedBlock = null;
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


