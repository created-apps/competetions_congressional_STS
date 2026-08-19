import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** Renders assistant markdown with GFM (lists, tables, code blocks). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[0.95rem] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="mb-3 mt-5 font-heading text-xl font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-5 font-heading text-lg font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-4 font-heading text-base font-semibold">{children}</h3>,
          ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 ml-5 list-decimal space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary/40 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-")
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-lg bg-muted p-3 font-mono text-sm">{children}</code>
              )
            }
            return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
          },
          pre: ({ children }) => <pre className="my-3">{children}</pre>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
