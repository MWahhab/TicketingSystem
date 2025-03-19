export function useMentions() {
    function initEventListeners(assignees) {
        const editors = document.querySelectorAll('.minimal-tiptap-editor');

        // In-memory storage for mention metadata
        const mentionMetadata = new Map();

        editors.forEach(editor => {
            if (!editor.hasAttribute('data-has-listener')) {
                let mentionBox = null;
                let currentIndex = -1;
                let caretRange = null;

                // Create the suggestion box
                function createMentionBox() {
                    mentionBox = document.createElement('ul');
                    mentionBox.style.position = 'absolute';
                    mentionBox.style.backgroundColor = '#fff';
                    mentionBox.style.border = '1px solid #ccc';
                    mentionBox.style.borderRadius = '4px';
                    mentionBox.style.padding = '0';
                    mentionBox.style.margin = '0';
                    mentionBox.style.listStyle = 'none';
                    mentionBox.style.zIndex = '1000';
                    mentionBox.style.maxHeight = '150px';
                    mentionBox.style.overflowY = 'auto';
                    mentionBox.style.display = 'none';
                    mentionBox.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                    mentionBox.style.fontFamily = 'Arial, sans-serif';
                    mentionBox.style.fontSize = '14px';
                    mentionBox.style.minWidth = '200px';

                    // Prevent clicks on the mention box from closing the dialog
                    mentionBox.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                    });

                    document.body.appendChild(mentionBox);
                }

                // Update the suggestion box with matches and position it
                function updateMentionBox(matches, caretRect) {
                    mentionBox.innerHTML = ''; // Clear previous items

                    matches.forEach((match, idx) => {
                        const li = document.createElement('li');
                        li.textContent = match.name;
                        li.style.padding = '8px 10px';
                        li.style.cursor = 'pointer';
                        li.style.backgroundColor = idx === currentIndex ? '#f0f0f0' : '#fff';
                        li.style.whiteSpace = 'nowrap';

                        li.addEventListener('mouseenter', () => {
                            currentIndex = idx;
                            highlightCurrentItem();
                        });

                        li.addEventListener('mousedown', (e) => {
                            e.preventDefault();
                            selectMention(match);
                        });

                        mentionBox.appendChild(li);
                    });

                    positionMentionBox(caretRect);
                    mentionBox.style.display = 'block';
                }

                // Position the mention box using the caret rect
                function positionMentionBox(caretRect) {
                    if (!caretRect) return;

                    const scrollX = window.scrollX || window.pageXOffset;
                    const scrollY = window.scrollY || window.pageYOffset;

                    mentionBox.style.left = `${caretRect.left + scrollX}px`;
                    mentionBox.style.top = `${caretRect.bottom + scrollY}px`;
                }

                // Highlight current item based on currentIndex
                function highlightCurrentItem() {
                    for (let i = 0; i < mentionBox.childElementCount; i++) {
                        const li = mentionBox.children[i];
                        li.style.backgroundColor = i === currentIndex ? '#f0f0f0' : '#fff';
                    }
                }

                // Hide the suggestion box
                function hideMentionBox() {
                    if (mentionBox) {
                        mentionBox.style.display = 'none';
                        currentIndex = -1;
                        caretRange = null;
                    }
                }

                // Select a mention and replace text
                function selectMention(match) {
                    if (!caretRange) return;

                    const textNode = caretRange.startContainer;
                    const textContent = textNode.textContent;

                    const wordStart = textContent.lastIndexOf('@', caretRange.startOffset - 1);
                    if (wordStart === -1) return;

                    const beforeWord = textContent.slice(0, wordStart);
                    const afterWord = textContent.slice(caretRange.startOffset);

                    // Insert a span for the mention
                    const mentionSpan = document.createElement('span');
                    mentionSpan.textContent = `@${match.name}`;
                    mentionSpan.classList.add('mention-span');
                    mentionSpan.style.color = '#007bff';
                    mentionSpan.style.cursor = 'pointer';
                    mentionSpan.style.display = 'inline-block';
                    mentionSpan.contentEditable = 'false';

                    // Store metadata in memory
                    mentionMetadata.set(mentionSpan, { id: match.id, name: match.name });

                    const parentNode = caretRange.startContainer.parentNode;

                    // Replace the text node with the new structure
                    const afterTextNode = document.createTextNode(afterWord);
                    parentNode.replaceChild(afterTextNode, textNode);
                    parentNode.insertBefore(mentionSpan, afterTextNode);
                    parentNode.insertBefore(document.createTextNode(beforeWord), mentionSpan);

                    // Insert a new empty text node after the mention span for continued typing
                    const newTextNode = document.createTextNode(' ');
                    parentNode.insertBefore(newTextNode, afterTextNode);

                    // Place the caret in the new text node
                    const newCaretRange = document.createRange();
                    newCaretRange.setStart(newTextNode, 1); // After the space
                    newCaretRange.collapse(true);

                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(newCaretRange);

                    hideMentionBox();
                }

                // Add the suggestion box to the DOM
                if (!mentionBox) createMentionBox();

                editor.addEventListener('input', () => {
                    const selection = window.getSelection();
                    if (!selection.rangeCount) return;
                    const range = selection.getRangeAt(0);
                    caretRange = range.cloneRange();

                    const textNode = range.startContainer;
                    const textContent = textNode.textContent || '';
                    const caretPosition = range.startOffset;

                    const wordStart = textContent.lastIndexOf('@', caretPosition - 1);
                    const wordEnd = caretPosition;
                    const word = textContent.slice(wordStart + 1, wordEnd);

                    if (wordStart !== -1 && /^[a-zA-Z]*$/.test(word) && word.length > 0) {
                        const matches = assignees.filter(person =>
                            person.name.toLowerCase().startsWith(word.toLowerCase())
                        );

                        if (matches.length > 0) {
                            const caretRect = range.getBoundingClientRect();
                            updateMentionBox(matches, caretRect);
                        } else {
                            hideMentionBox();
                        }
                    } else {
                        hideMentionBox();
                    }
                });

                editor.addEventListener('keydown', (event) => {
                    const visible = mentionBox && mentionBox.style.display === 'block';

                    if (visible) {
                        if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            currentIndex = (currentIndex + 1) % mentionBox.childElementCount;
                            highlightCurrentItem();
                        } else if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            currentIndex = (currentIndex - 1 + mentionBox.childElementCount) % mentionBox.childElementCount;
                            highlightCurrentItem();
                        } else if (event.key === 'Enter' || event.key === 'Tab') {
                            event.preventDefault();
                            if (currentIndex >= 0) {
                                const selectedMatch = mentionBox.children[currentIndex];
                                const match = {
                                    name: selectedMatch.textContent,
                                    id: assignees.find(a => a.name === selectedMatch.textContent)?.id
                                };
                                selectMention(match);
                            }
                        } else if (event.key === 'Escape') {
                            event.preventDefault();
                            hideMentionBox();
                        }
                    }
                });

                editor.setAttribute('data-has-listener', 'true');
            }
        });

        // Function to extract mentions with metadata
        function extractMentions() {
            const mentions = [];
            editors.forEach(editor => {
                editor.querySelectorAll('.mention-span').forEach(span => {
                    const metadata = mentionMetadata.get(span);
                    if (metadata) {
                        mentions.push(metadata);
                    }
                });
            });
            return mentions;
        }

        return { extractMentions };
    }

    return { initEventListeners };
}
