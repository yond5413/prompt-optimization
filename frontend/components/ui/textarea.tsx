import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const adjustHeight = () => {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      };

      adjustHeight();
      textarea.addEventListener('input', adjustHeight);

      return () => {
        textarea.removeEventListener('input', adjustHeight);
      };
    }
  }, [props.value]);

  return (
    <textarea
      ref={textareaRef}
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
