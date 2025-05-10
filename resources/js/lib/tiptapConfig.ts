// resources/js/lib/tiptapConfig.ts

// Extension Imports
import { BaseKit } from 'reactjs-tiptap-editor';
import { Mention } from 'reactjs-tiptap-editor/mention';
import { Bold } from 'reactjs-tiptap-editor/bold';
import { Italic } from 'reactjs-tiptap-editor/italic';
import { CodeBlock } from 'reactjs-tiptap-editor/codeblock';
import { Link } from 'reactjs-tiptap-editor/link';
import { Image } from 'reactjs-tiptap-editor/image';
import { FontSize } from 'reactjs-tiptap-editor/fontsize';
import { Heading } from 'reactjs-tiptap-editor/heading';
import { Color } from 'reactjs-tiptap-editor/color';
import { BulletList } from 'reactjs-tiptap-editor/bulletlist';
import { Clear } from 'reactjs-tiptap-editor/clear';

// CSS Imports (these will be processed by Vite when this module is imported)
import 'reactjs-tiptap-editor/style.css';
import 'reactjs-tiptap-editor/image/style.css';
import 'prism-code-editor-lightweight/layout.css';
import 'prism-code-editor-lightweight/themes/github-dark.css';

// Define the types for assignees
interface Assignee {
  id: string;
  name: string;
  // Add other properties if your assignee objects have them, e.g., avatar: string;
}

// This is a simplified props type for the suggestion render functions.
// The actual types would come from Tiptap or reactjs-tiptap-editor.
interface SuggestionProps {
  items: Assignee[];
  command: (attrs: { id: string; label: string }) => void;
  clientRect?: (() => DOMRect | null) | null;
  // query?: string; // if needed by render logic
  // text?: string; // if needed by render logic
  // editor?: any; // Editor instance, should be typed properly if used
}

interface SuggestionKeyDownProps {
  event: KeyboardEvent;
  // editor: any; // Editor instance
  // range: any; // Range object
}

export const getTiptapExtensions = (assignees: Assignee[]) => [
  BaseKit.configure({
    placeholder: {
      showOnlyCurrent: true,
      placeholder: 'Write your comment...',
    },
    characterCount: {
      limit: 50_000,
    },
  }),
  Mention.configure({
    HTMLAttributes: {
      class: 'mention', // Ensure this class is styled for your mentions
    },
    suggestion: {
      items: ({ query }: { query: string }): Assignee[] => {
        if (!assignees) return [];
        return assignees
          .filter((assignee) =>
            assignee.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 5);
      },
    },
  }),
  Bold,
  Italic,
  CodeBlock,
  Link.configure({ 
    openOnClick: true,
    autolink: true,
    defaultProtocol: 'https',
  }),
  Image.configure({ 
    HTMLAttributes: {
      style: 'max-width: 100%; height: auto;',
      class: 'tiptap-image',
    },
  }),
  FontSize,
  Heading.configure({ levels: [1, 2, 3] }),
  Color,
  BulletList,
  Clear,
]; 