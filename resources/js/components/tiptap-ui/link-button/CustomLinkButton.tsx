import * as React from 'react';
import { Editor } from '@tiptap/react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '../../ui/dialog';
import { Button as TiptapButton } from '../../tiptap-ui-primitive/button';
import { LinkIcon } from '../../tiptap-icons/link-icon';
import { LinkEditBlock } from './LinkEditBlock';
import { MODAL_CONTENT_CLASSNAMES } from '@/components/tiptap-templates/simple/simple-editor';

interface CustomLinkButtonProps {
  editor: Editor | null;
  text?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomLinkButton: React.FC<CustomLinkButtonProps> = (
  {
    editor,
    text = "",
    className = "",
    disabled,
    ...buttonProps
  }
) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!editor) {
    return null;
  }

  const isActive = editor.isActive('link');
  const defaultTooltip = isActive ? 'Edit link' : 'Add link';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <TiptapButton
          data-tool="link"
          data-style="ghost"
          aria-label={text || defaultTooltip}
          tooltip={text || defaultTooltip}
          data-active-state={isActive ? "on" : "off"}
          disabled={disabled || !editor.isEditable}
          className={className}
          {...buttonProps}
        >
          <LinkIcon className="tiptap-button-icon" />
          {text && <span className="tiptap-button-text">{text}</span>}
        </TiptapButton>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-lg bg-background text-foreground p-0"
        onEscapeKeyDown={() => setIsOpen(false)}
        onInteractOutside={(e) => {
            if ((e.target as HTMLElement)?.closest('.tippy-box')) {
                return;
            }
            setIsOpen(false);
        }}
      >
        <LinkEditBlock editor={editor} onClose={() => setIsOpen(false)} className={MODAL_CONTENT_CLASSNAMES} />
      </DialogContent>
    </Dialog>
  );
};

export default CustomLinkButton;