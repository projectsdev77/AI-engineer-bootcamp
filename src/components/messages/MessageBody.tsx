import { useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { CopyIcon, CheckIcon } from '@/components/ui/icons'

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

function languageOf(node: ReactNode): string | null {
  if (node && typeof node === 'object' && 'props' in node) {
    const cls = (node as { props: { className?: string } }).props.className ?? ''
    return /language-([\w+-]+)/.exec(cls)?.[1] ?? null
  }
  if (Array.isArray(node)) return node.map(languageOf).find(Boolean) ?? null
  return null
}

function CodeBlock({ children, inverted }: { children: ReactNode; inverted: boolean }) {
  const [copied, setCopied] = useState(false)
  const code = textOf(children).replace(/\n$/, '')
  const language = languageOf(children)
  return (
    <div
      className={`my-2 overflow-hidden rounded-field border-2 text-paper ${
        inverted ? 'border-paper/25 bg-ink-soft' : 'border-ink bg-ink'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-paper/15 px-3 py-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-paper/50">{language ?? 'code'}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            })
          }}
          className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wide text-paper/70 hover:text-lime"
          aria-label="Copy code"
        >
          {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/**
 * Message text with Markdown basics — code fences (```), `inline code`,
 * lists, bold, links. Raw HTML is never rendered (react-markdown default)
 * and images are dropped, so a message can't pull in remote content;
 * images go through attachments instead.
 */
export default function MessageBody({ body, inverted }: { body: string; inverted: boolean }) {
  return (
    <div className="min-w-0 space-y-2 break-words text-[14.5px] leading-relaxed [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        disallowedElements={['img']}
        unwrapDisallowed
        components={{
          pre: ({ children }) => <CodeBlock inverted={inverted}>{children}</CodeBlock>,
          code: ({ children, className }) =>
            className ? (
              <code>{children}</code>
            ) : (
              <code
                className={`rounded px-1 py-0.5 font-mono text-[13px] ${inverted ? 'bg-paper/15' : 'bg-stone'}`}
              >
                {children}
              </code>
            ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className={inverted ? 'text-lime underline' : 'underline'}>
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
