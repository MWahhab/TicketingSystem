import * as React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Separator } from '../../ui/separator';
import { cn } from '@/lib/utils';

interface LinkEditBlockProps {
  editor: Editor;
  onClose: () => void;
  className?: string;
}

export const LinkEditBlock: React.FC<LinkEditBlockProps> = ({ editor, onClose, className }) => {
  const [url, setUrl] = React.useState('');
  const [text, setText] = React.useState('');

  React.useEffect(() => {
    const editorState = editor.state; // Capture state for dependency array
    const currentSelection = editorState.selection;
    const currentLinkAttrs = editor.getAttributes('link');

    if (currentLinkAttrs.href) {
      setUrl(currentLinkAttrs.href);
    }

    const { from, to, empty } = currentSelection;
    if (!empty) {
      const selectedText = editorState.doc.textBetween(from, to, ' ');
      setText(selectedText);
    } else {
      if (!currentLinkAttrs.href) {
        setText('');
      }
    }
  }, [editor, editor.state.selection.from, editor.state.selection.to, editor.getAttributes('link').href]); 


  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!url) {
        if (editor.getAttributes('link').href) {
            // Use toggleMark to unset the link
            editor.chain().focus().extendMarkRange('link').toggleMark('link').run();
        }
        onClose();
        return;
    }

    const { from, to, empty } = editor.state.selection;
    const currentSelectedText = !empty ? editor.state.doc.textBetween(from, to, ' ') : '';

    const linkAttributes = {
      href: url,
      target: '_blank', 
    };

    let chain = editor.chain().focus().extendMarkRange('link');

    if (text && text !== currentSelectedText) {
      if (!empty) {
        chain = chain.deleteRange({ from, to });
      }
      chain = chain.insertContentAt(editor.state.selection.from, [
        {
          type: 'text',
          text: text,
          marks: [
            {
              type: 'link',
              attrs: linkAttributes,
            },
          ],
        },
      ]);
    } else if (!empty) {
      chain = chain.toggleMark('link', linkAttributes);
    } else {
      chain = chain.insertContent([
        {
          type: 'text',
          text: text || url,
          marks: [
            {
              type: 'link',
              attrs: linkAttributes,
            },
          ],
        },
      ]);
    }

    chain.run();
    onClose();
  };


  return (
    <div className={cn(className, "mx-auto")}>
      <form onSubmit={handleInsertLink}>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium leading-6 text-center">
              {editor.getAttributes('link').href ? 'Edit Link' : 'Add Link'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground text-center">
              Enter the URL and the text to display for your link. Leave URL blank to remove existing link.
            </p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div>
              <Label htmlFor="link-url" className="text-sm font-medium">
                URL
              </Label>
              <Input
                id="link-url"
                name="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="link-text" className="text-sm font-medium">
                Text to display (optional)
              </Label>
              <Input
                id="link-text"
                name="text"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Use selected text or enter new text"
                className="mt-1"
              />
               <p className="mt-1 text-xs text-muted-foreground">
                If empty and text is selected, selected text is linked. If both text and selection are empty, URL becomes the link text.
              </p>
            </div>
          </div>

          <Separator className="my-4" />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" 
                className="border border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 hover:ring-1 hover:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-1 focus-visible:ring-white/30 transition-all"
                onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit"
                className="border border-white/10 bg-zinc-900 text-zinc-400 hover:bg-green-800/30 hover:text-green-200 hover:ring-1 hover:ring-green-500/30 focus-visible:ring-offset-1 focus-visible:ring-1 focus-visible:ring-white/30 transition-all flex items-center gap-1"
            >
              {editor.getAttributes('link').href && !url ? 'Remove Link' : (editor.getAttributes('link').href ? 'Update Link' : 'Insert Link')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LinkEditBlock; 