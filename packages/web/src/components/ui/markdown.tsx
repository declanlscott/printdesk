import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ComponentProps } from "react";

export type MarkdownProps = ComponentProps<typeof ReactMarkdown>;

export const Markdown = (props: MarkdownProps) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose" {...props} />
);
