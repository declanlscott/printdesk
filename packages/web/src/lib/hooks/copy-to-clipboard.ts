import { useState } from "react";

export interface UseCopyToClipboardProps {
  timeout?: number;
  onCopy?: () => void;
}

export function useCopyToClipboard({
  timeout = 2000,
  onCopy,
}: UseCopyToClipboardProps = {}) {
  const [isCopied, setIsCopied] = useState(() => false);

  async function copyToClipboard(value: string) {
    await navigator.clipboard.writeText(value);

    setIsCopied(() => true);

    onCopy?.();

    setTimeout(() => setIsCopied(() => false), timeout);
  }

  return { isCopied, copyToClipboard };
}
