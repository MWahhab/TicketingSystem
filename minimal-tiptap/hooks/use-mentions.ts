import { Editor } from '@tiptap/core';

export interface Assignee {
    id: string | number;
    name: string;
}

interface Mention extends Assignee {}

interface MentionMetadata extends Assignee {}

export function useMentions() {
    // These variables are scoped per hook instance
    let mentionBox: HTMLUListElement | null = null;
    let currentIndex = -1;
    let currentQueryRange: { from: number; to: number } | null = null;

    function initEventListeners(assignees: Assignee[], editor: Editor) {
        const editorViewDom = editor.view.dom; // This is the .ProseMirror contenteditable div
        const currentEditorElement = editorViewDom.parentElement; // This should be the .minimal-tiptap-editor div
        const editorId = currentEditorElement?.id || editor.view.dom.closest('.minimal-tiptap-editor')?.classList[0] || 'Unknown Editor';

        console.log(`[Mentions (${editorId})] initEventListeners called. Assignees received:`, JSON.parse(JSON.stringify(assignees))); // Log assignees on init

        if (!currentEditorElement || !currentEditorElement.classList.contains('minimal-tiptap-editor')) {
            console.error('[Mentions] Could not find the .minimal-tiptap-editor wrapper for the provided editor instance.', editorViewDom);
            return { extractMentions: () => [] as MentionMetadata[] };
        }

        if (!currentEditorElement.hasAttribute('data-mention-listener')) {
            function createMentionBox() {
                mentionBox = document.createElement('ul');
                mentionBox.classList.add('mention-suggestions-list');
                mentionBox.style.position = 'absolute';
                mentionBox.style.backgroundColor = '#1F1F21';
                mentionBox.style.border = '1px solid #363639';
                mentionBox.style.borderRadius = '6px';
                mentionBox.style.padding = '4px';
                mentionBox.style.margin = '0';
                mentionBox.style.listStyle = 'none';
                mentionBox.style.zIndex = '10000';
                mentionBox.style.maxHeight = '200px';
                mentionBox.style.overflowY = 'auto';
                mentionBox.style.display = 'none';
                mentionBox.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                mentionBox.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
                mentionBox.style.fontSize = '13px';
                mentionBox.style.minWidth = '220px';
                mentionBox.addEventListener('mousedown', (e) => e.preventDefault());
                document.body.appendChild(mentionBox);
            }

            function updateMentionBox(matches: Assignee[], coords: { top: number, left: number, bottom: number, right: number } | undefined) {
                const editorId = currentEditorElement?.id || editor.view.dom.closest('.minimal-tiptap-editor')?.classList[0] || 'Unknown Editor';
                console.log(`[Mentions (${editorId})] updateMentionBox called. Matches:`, matches.length, 'Coords:', coords, 'CurrentIndex:', currentIndex);
                if (!mentionBox) {
                    console.error(`[Mentions (${editorId})] mentionBox is null in updateMentionBox. Cannot update.`);
                    return;
                }
                mentionBox.innerHTML = ''; // Clear previous items
                matches.forEach((match, idx) => {
                    const li = document.createElement('li');
                    li.textContent = match.name;
                    li.style.padding = '6px 10px';
                    li.style.cursor = 'pointer';
                    li.style.borderRadius = '4px';
                    li.style.color = '#E0E0E0';
                    li.style.backgroundColor = idx === currentIndex ? '#363639' : 'transparent';
                    li.style.whiteSpace = 'nowrap';
                    li.addEventListener('mouseenter', () => { currentIndex = idx; highlightCurrentItem(); });
                    li.addEventListener('mousedown', (e) => { e.preventDefault(); selectMention(match); });
                    mentionBox!.appendChild(li);
                });
                if (coords) {
                    positionMentionBox(coords);
                } else {
                    console.warn(`[Mentions (${editorId})] No coords provided to updateMentionBox. Box may not be positioned correctly.`);
                }
                mentionBox.style.display = 'block';
                console.log(`[Mentions (${editorId})] mentionBox display set to block. Actual display:`, mentionBox.style.display);
            }

            function positionMentionBox(coords: { top: number, left: number, bottom: number, right: number }) {
                const editorId = currentEditorElement?.id || editor.view.dom.closest('.minimal-tiptap-editor')?.classList[0] || 'Unknown Editor';
                console.log(`[Mentions (${editorId})] positionMentionBox called with coords:`, coords);
                if (!mentionBox) {
                    console.error(`[Mentions (${editorId})] mentionBox is null in positionMentionBox. Cannot position.`);
                    return;
                }
                const scrollX = window.scrollX || window.pageXOffset;
                const scrollY = window.scrollY || window.pageYOffset;
                mentionBox.style.left = `${coords.left + scrollX}px`;
                mentionBox.style.top = `${coords.bottom + scrollY + 5}px`;
            }

            function highlightCurrentItem() {
                if (!mentionBox) return;
                for (let i = 0; i < mentionBox.childElementCount; i++) {
                    const li = mentionBox.children[i] as HTMLLIElement;
                    li.style.backgroundColor = i === currentIndex ? '#363639' : 'transparent';
                    li.style.color = i === currentIndex ? '#FFFFFF' : '#E0E0E0';
                }
            }

            function hideMentionBox() {
                if (mentionBox) mentionBox.style.display = 'none';
                currentIndex = -1;
                currentQueryRange = null;
            }
            
            function selectMention(match: Mention) {
                console.log('[Mentions] selectMention called for match:', match, 'Editor element ID:', currentEditorElement?.id || 'N/A');
                if (!currentQueryRange || !editor || !editor.view) {
                    console.error('[Mentions] Query range, editor, or editor.view not available for selectMention.');
                    hideMentionBox();
                    return;
                }
                 if (!editor.isEditable) {
                    console.warn('[Mentions] Editor is not editable during selectMention.');
                    hideMentionBox();
                    return;
                }
                console.log('[Mentions] currentQueryRange:', currentQueryRange, 'isEditable:', editor.isEditable);

                const success = editor.chain().focus()
                    .deleteRange(currentQueryRange)
                    .insertContent([
                        {
                            type: 'text',
                            text: `@${match.name}`,
                            marks: [
                                {
                                    type: 'mention',
                                    attrs: { userName: match.name, userId: String(match.id) },
                                },
                            ],
                        },
                        { type: 'text', text: ' ' },
                    ])
                    .run();
                console.log('[Mentions] insertContent successful:', success);
                if (!success) {
                    console.error('[Mentions] Failed to insert mention content with mark.');
                }
                hideMentionBox();
            }

            if (!mentionBox) createMentionBox();
            console.log(`[Mentions (${currentEditorElement?.id || editor.view.dom.closest('.minimal-tiptap-editor')?.classList[0] || 'Unknown Editor'})] createMentionBox completed. mentionBox available: ${!!mentionBox}`);

            editorViewDom.addEventListener('input', () => {
                const editorId = currentEditorElement?.id || editor.view.dom.closest('.minimal-tiptap-editor')?.classList[0] || 'Unknown Editor';
                console.log(`[Mentions (${editorId})] Input event. Editable: ${editor.isEditable}`);
                if (!editor || !editor.isEditable) return;

                const { selection } = editor.state;
                const { from, to } = selection;

                if (from !== to) {
                    hideMentionBox();
                    return;
                }

                let mentionQuery = '';
                let queryStartPosition: number | null = null;

                editor.state.doc.nodesBetween(Math.max(0, from - 25), from, (node, pos) => {
                    if (!node.isText || !node.text) return true;

                    const textContentUpToCursor = node.textBetween(0, from - pos);
                    const atMatch = /@([a-zA-Z0-9_\-]*)$/.exec(textContentUpToCursor);

                    if (atMatch) {
                        mentionQuery = atMatch[1];
                        queryStartPosition = pos + atMatch.index;
                        return false;
                    }
                    return true;
                });


                if (queryStartPosition !== null) {
                    currentQueryRange = { from: queryStartPosition, to: to };
                    console.log(`[Mentions (${editorId})] Current assignees list before filtering:`, JSON.parse(JSON.stringify(assignees)));
                    const matches = assignees.filter(person => 
                        person.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
                    );
                    console.log(`[Mentions (${editorId})] Query: '${mentionQuery}', Matches found: ${matches.length}`);

                    if (matches.length > 0) {
                        const coords = editor.view.coordsAtPos(currentQueryRange.to);
                        console.log(`[Mentions (${editorId})] Coords for mention box:`, coords);
                        updateMentionBox(matches, coords);
                    } else {
                        hideMentionBox();
                    }
                } else {
                    hideMentionBox();
                }
            });

            editorViewDom.addEventListener('keydown', (event: Event) => {
                const keyboardEvent = event as KeyboardEvent;
                const visible = mentionBox && mentionBox.style.display === 'block';
                const editorId = currentEditorElement?.id || editor.view.dom.closest('.minimal-tiptap-editor')?.classList[0] || 'Unknown Editor';
                console.log(`[Mentions (${editorId})] Keydown event. Key: ${keyboardEvent.key}, MentionBox visible: ${visible}`);
                if (!visible || !mentionBox) return;

                if (keyboardEvent.key === 'ArrowDown') {
                    keyboardEvent.preventDefault();
                    currentIndex = (currentIndex + 1) % mentionBox.childElementCount;
                    highlightCurrentItem();
                } else if (keyboardEvent.key === 'ArrowUp') {
                    keyboardEvent.preventDefault();
                    currentIndex = (currentIndex - 1 + mentionBox.childElementCount) % mentionBox.childElementCount;
                    highlightCurrentItem();
                } else if (keyboardEvent.key === 'Enter' || keyboardEvent.key === 'Tab') {
                    keyboardEvent.preventDefault();
                    if (keyboardEvent.key === 'Tab' && currentIndex === -1 && mentionBox.childElementCount > 0) {
                        currentIndex = 0;
                    }
                    if (currentIndex >= 0 && currentIndex < mentionBox.childElementCount) {
                        const selectedMatchElement = mentionBox.children[currentIndex] as HTMLLIElement;
                        const assignee = assignees.find(a => a.name === selectedMatchElement.textContent);
                        if (assignee) selectMention(assignee);
                    } else {
                        hideMentionBox();
                    }
                } else if (keyboardEvent.key === 'Escape') {
                    keyboardEvent.preventDefault();
                    hideMentionBox();
                }
            });

            currentEditorElement.setAttribute('data-mention-listener', 'true');
        }


        function extractMentions(): MentionMetadata[] {
            const mentions: MentionMetadata[] = [];
            if (!editor || !editor.state || !editor.state.doc) return mentions;
            editor.state.doc.descendants((node) => {
                if (node.marks && node.marks.some(mark => mark.type.name === 'mention')) {
                    const mentionMark = node.marks.find(mark => mark.type.name === 'mention');
                    if (mentionMark && mentionMark.attrs.userName && mentionMark.attrs.userId) {
                        mentions.push({ id: mentionMark.attrs.userId, name: mentionMark.attrs.userName });
                    }
                }
            });
            return mentions;
        }
        return { extractMentions };
    } // End of initEventListeners

    return { initEventListeners };
}
