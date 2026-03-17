'use client';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple but complete markdown-to-HTML converter
  // Handles headings, bold, italic, links, lists, blockquotes, code, hr
  const html = renderMarkdown(content);
  return (
    <div
      className="prose prose-slate dark:prose-invert max-w-none
        prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-lg prose-h3:mt-7 prose-h3:mb-3
        prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-5
        prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
        prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold
        prose-ul:my-4 prose-ul:space-y-2 prose-li:text-slate-600 dark:prose-li:text-slate-300
        prose-ol:my-4 prose-ol:space-y-2
        prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-500
        prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-emerald-700 dark:prose-code:text-emerald-300 prose-code:before:content-none prose-code:after:content-none
        prose-hr:border-slate-200 dark:prose-hr:border-slate-700 prose-hr:my-8"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (before other processing)
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, (_m, code) =>
    `<pre class="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 overflow-x-auto my-6 text-sm font-mono text-slate-800 dark:text-slate-200"><code>${code.trim()}</code></pre>`
  );

  // Split into blocks for block-level processing
  const blocks = html.split(/\n\n+/);
  const processed = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    // Already processed code blocks
    if (trimmed.startsWith('<pre')) return trimmed;

    // Headings
    if (trimmed.startsWith('#### ')) return `<h4>${inlineMarkdown(trimmed.slice(5))}</h4>`;
    if (trimmed.startsWith('### ')) return `<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`;
    if (trimmed.startsWith('## ')) return `<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`;
    if (trimmed.startsWith('# ')) return `<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`;

    // Blockquotes
    if (trimmed.startsWith('&gt; ') || trimmed.startsWith('&gt;\n')) {
      const content = trimmed.replace(/^&gt;\s?/gm, '').trim();
      return `<blockquote>${inlineMarkdown(content)}</blockquote>`;
    }

    // Horizontal rules
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return '<hr />';

    // Unordered lists
    if (trimmed.split('\n').every(line => /^[-*+]\s/.test(line.trim()) || line.trim() === '')) {
      const items = trimmed
        .split('\n')
        .filter(l => /^[-*+]\s/.test(l.trim()))
        .map(l => `<li>${inlineMarkdown(l.trim().slice(2))}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    // Ordered lists
    if (trimmed.split('\n').every(line => /^\d+\.\s/.test(line.trim()) || line.trim() === '')) {
      const items = trimmed
        .split('\n')
        .filter(l => /^\d+\.\s/.test(l.trim()))
        .map(l => `<li>${inlineMarkdown(l.trim().replace(/^\d+\.\s/, ''))}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }

    // Paragraph
    return `<p>${inlineMarkdown(trimmed.replace(/\n/g, ' '))}</p>`;
  });

  return processed.filter(Boolean).join('\n');
}

function inlineMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
