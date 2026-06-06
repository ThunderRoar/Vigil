import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => (<ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>),
  ol: ({ children }) => (<ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (<strong className="font-semibold text-foreground">{children}</strong>),
  h1: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  code: ({ children }) => (<code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">{children}</code>),
  a: ({ children, href }) => (<a href={href} className="text-primary underline">{children}</a>)
};

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
