import type { Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/lib/cn';

export const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-0 text-xl font-semibold text-text">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-lg font-semibold text-text first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 text-base font-semibold text-text first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-3 leading-7 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-primary/40 pl-3 italic text-muted last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-sm last:mb-0">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const maybeInline = (props as { inline?: boolean }).inline;
    const content = String(children);
    const isBlock =
      maybeInline === false || className?.includes('language-') || content.includes('\n');

    if (isBlock) {
      return (
        <code
          className={cn('block font-mono text-sm leading-6 text-slate-100', className)}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.875em] text-slate-800"
        {...props}
      >
        {children}
      </code>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline decoration-primary/30 underline-offset-2 hover:text-primary-hover"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse border border-border text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="even:bg-slate-50/50">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-border bg-slate-50 px-3 py-2 text-left align-top font-semibold text-text">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-border px-3 py-2 align-top">{children}</td>,
};

export const markdownRemarkPlugins = [remarkGfm];
export const markdownRehypePlugins = [rehypeHighlight];
