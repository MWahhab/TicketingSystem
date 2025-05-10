import * as React from "react"
import { Editor, Range, EditorContent, EditorContext, useEditor, ReactRenderer, getAttributes } from "@tiptap/react"
import tippy, { Instance as TippyInstance } from 'tippy.js';

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem } from "@tiptap/extension-task-item"
import { TaskList } from "@tiptap/extension-task-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Underline } from "@tiptap/extension-underline"
import Mention, { MentionOptions, MentionNodeAttrs } from '@tiptap/extension-mention'
import { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import 'highlight.js/styles/atom-one-dark.css'

// --- Custom Extensions ---
import { Link } from "@/components/tiptap-extension/link-extension"
import { Selection } from "@/components/tiptap-extension/selection-extension"
import { TrailingNode } from "@/components/tiptap-extension/trailing-node-extension"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockQuoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import { CustomLinkButton } from "@/components/tiptap-ui/link-button/CustomLinkButton"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"

// --- Hooks ---
import { useMobile } from "@/hooks/use-mobile"
import { useWindowSize } from "@/hooks/use-window-size"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"

// --- Components ---
// import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"

// --- Lib ---
// import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"
import './mention-styles.scss';

// Add custom styles for code blocks to ensure they work well in dark mode
const codeBlockStyles = `
.tiptap pre {
  background-color: #282c34;
  color: #abb2bf;
  font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
  padding: 0.75rem 1rem;
  margin: 1rem 0;
  border-radius: 0.3rem;
  overflow-x: auto;
}

.tiptap pre code {
  color: inherit;
  padding: 0;
  background: none;
  font-size: 0.9rem;
}

/* Language display */
.tiptap pre::before {
  content: attr(data-language);
  text-transform: uppercase;
  display: block;
  text-align: right;
  font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.025em;
  color: #9fa6b3;
  margin-bottom: 0.5rem;
}
`;

// --- Modal Content ClassNames ---
export const MODAL_CONTENT_CLASSNAMES = "p-4 w-full max-w-md";

// Define Assignee type (adjust if you have a global type)
interface Assignee {
  id: string;
  name: string;
  // avatar?: string;
}

// Register only the languages we need with lowlight
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import php from 'highlight.js/lib/languages/php'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml' // html is xml in highlight.js
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'

// Create a lowlight instance with registered languages
const lowlight = createLowlight()
lowlight.register('javascript', javascript)
lowlight.register('js', javascript)
lowlight.register('typescript', typescript)
lowlight.register('ts', typescript)
lowlight.register('php', php)
lowlight.register('css', css)
lowlight.register('html', html)
lowlight.register('json', json)
lowlight.register('python', python)

interface SimpleEditorProps {
  value: string;
  onChange: (newContent: string) => void;
  assignees: Assignee[];
  className?: string;
}

// Define types for MentionList ref and props
interface MentionListProps {
  items: Assignee[];
  command: (item: Assignee) => void;
}
interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const MentionList = React.forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => setSelectedIndex(0), [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  React.useImperativeHandle(ref, () => ({
    onKeyDown: (kdProps: SuggestionKeyDownProps): boolean => {
      if (kdProps.event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + props.items.length - 1) % props.items.length);
        return true;
      }
      if (kdProps.event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % props.items.length);
        return true;
      }
      if (kdProps.event.key === 'Enter' || kdProps.event.key === 'Tab') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="mention-suggestion-list">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={`mention-suggestion-item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={item.id}
            onClick={() => selectItem(index)}
          >
            {item.name}
          </button>
        ))
      ) : (
        <div className="mention-suggestion-item is-empty">No results</div>
      )}
    </div>
  );
});

// Define MainToolbarContent props
interface MainToolbarContentProps {
  editor: Editor | null;
  onHighlighterClick: () => void;
  isMobile: boolean;
}

const MainToolbarContent = ({ editor, onHighlighterClick, isMobile }: MainToolbarContentProps) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
        <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} />
        <BlockQuoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        <CustomLinkButton editor={editor} text="" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarSeparator />


      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton editor={editor} text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      {/* <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup> */}
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "main"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          null
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      null
    )}
  </>
)

export function SimpleEditor({ value, onChange, assignees, className }: SimpleEditorProps) {
  const isMobile = useMobile()
  const windowSize = useWindowSize()
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter"
  >("main")
  const toolbarRef = React.useRef<HTMLDivElement>(null)

  // Add style element for code block styling
  React.useEffect(() => {
    // Add the styles to the document
    const styleEl = document.createElement('style');
    styleEl.textContent = codeBlockStyles;
    document.head.appendChild(styleEl);
    
    return () => {
      // Clean up on unmount
      document.head.removeChild(styleEl);
    };
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
      },
      handleDrop: function(view, event, slice, moved) {
        event.preventDefault();
        if (moved) {
          return false; 
        }
        
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const base64DataUrl = readerEvent.target?.result;
                if (typeof base64DataUrl === 'string') {
                  const { schema } = view.state;
                  const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  if (!coordinates) return;
                  const node = schema.nodes.image.create({ src: base64DataUrl });
                  const transaction = view.state.tr.insert(coordinates.pos, node);
                  view.dispatch(transaction);
                }
              };
              reader.readAsDataURL(file);
            }
          }
          return true; 
        }
        return false; 
      },
      handlePaste: function(view, event, slice) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type === 'text/plain') {
            item.getAsString(pastedText => {
              const imageUrlRegex = /^(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp))(\?.*)?$/i;
              if (imageUrlRegex.test(pastedText)) {
                fetch(pastedText)
                  .then(response => {
                    if (!response.ok) {
                      console.error('Failed to fetch image from URL:', response.statusText);
                      throw new Error('Fetch failed for URL: ' + pastedText);
                    }
                    return response.blob();
                  })
                  .then(blob => {
                    if (!blob.type.startsWith('image/')) {
                        console.warn('Pasted URL did not resolve to an image content type.');
                        throw new Error('Not an image blob for URL: ' + pastedText);
                    }
                    const reader = new FileReader();
                    reader.onload = (readerEvent) => {
                      const base64DataUrl = readerEvent.target?.result;
                      if (typeof base64DataUrl === 'string') {
                        const { schema } = view.state;
                        const imageNode = schema.nodes.image.create({ src: base64DataUrl });
                        const { from, to } = view.state.selection;
                        view.dispatch(view.state.tr.replaceWith(from, to, imageNode));
                      }
                    };
                    reader.readAsDataURL(blob);
                  })
                  .catch(error => {
                    console.error('Error processing pasted image URL:', error);
                  });
              }
            });
          }
        }
        return false;
      },
    },
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
        HTMLAttributes: {
          class: 'language-js',
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: true }),
      Typography,
      Superscript,
      Subscript,

      Selection,
      TrailingNode,
      Link.configure({ openOnClick: false }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        renderLabel({ options, node }) {
          return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          items: ({ query }: { query: string }): Assignee[] => {
            if (!assignees) return [];
            return assignees
              .filter(item => item.name.toLowerCase().startsWith(query.toLowerCase()))
              .slice(0, 5);
          },
          render: () => {
            let reactRenderer: ReactRenderer<MentionListRef, MentionListProps>;
            let popup: TippyInstance;

            return {
              onStart: (props: SuggestionProps<Assignee>) => {
                reactRenderer = new ReactRenderer(MentionList, {
                  props: { items: props.items, command: props.command },
                  editor: props.editor,
                });
                const clientRectFn = props.clientRect;
                if (!clientRectFn) return;
                const rect = clientRectFn();
                if (!rect) return;

                popup = tippy(document.body, {
                  getReferenceClientRect: () => rect,
                  appendTo: () => document.body,
                  content: reactRenderer.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate: (props: SuggestionProps<Assignee>) => {
                reactRenderer.updateProps({ items: props.items, command: props.command });
                const clientRectFn = props.clientRect;
                if (!clientRectFn) return;
                const rect = clientRectFn();
                if (!rect) return;
                popup.setProps({ getReferenceClientRect: () => rect });
              },
              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === 'Escape') {
                  popup.hide();
                  return true;
                }
                return reactRenderer.ref?.onKeyDown(props);
              },
              onExit: () => {
                popup?.destroy();
                reactRenderer?.destroy();
              },
            };
          },
          command: ({ editor, range, props }: { editor: Editor; range: Range; props: Assignee }) => {
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: 'mention',
                  attrs: { id: props.id, label: props.name } as MentionNodeAttrs,
                },
                {
                  type: 'text',
                  text: ' ',
                },
              ])
              .run();
          },
          allowSpaces: false,
        } as any,
      }),
    ],
    content: value,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  })

  const bodyRect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor])

  return (
    <EditorContext.Provider value={{ editor }}>
      <Toolbar
        ref={toolbarRef}
        style={
          isMobile
            ? {
                bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)`,
              }
            : {}
        }
      >
        {mobileView === "main" ? (
          <MainToolbarContent
            editor={editor}
            onHighlighterClick={() => setMobileView("highlighter")}
            isMobile={isMobile}
          />
        ) : (
          <MobileToolbarContent
            type={mobileView === "highlighter" ? "highlighter" : "main" as any}
            onBack={() => setMobileView("main")}
          />
        )}
      </Toolbar>

      <div className={`content-wrapper bg-zinc-900 text-zinc-200 rounded-md ${className || ''}`}>
        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </div>
    </EditorContext.Provider>
  )
}
