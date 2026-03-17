import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const POSTS_DIR = path.join(process.cwd(), 'content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;           // ISO string e.g. "2026-05-10"
  dateFormatted: string;  // e.g. "May 10, 2026"
  category: string;
  author: string;
  authorTitle?: string;
  readingTime: string;    // e.g. "6 min read"
  coverGradient?: string; // tailwind gradient classes
  content: string;        // raw markdown body
  excerpt: string;        // first ~160 chars of body, plain text
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/>\s+/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

  const posts = files.map(filename => {
    const slug = filename.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8');
    const { data, content } = matter(raw);
    const rt = readingTime(content);
    const plainText = stripMarkdown(content);

    return {
      slug,
      title: data.title ?? slug,
      description: data.description ?? plainText.slice(0, 160),
      date: data.date ?? '2026-01-01',
      dateFormatted: formatDate(data.date ?? '2026-01-01'),
      category: data.category ?? 'Insights',
      author: data.author ?? 'OriginTrace Team',
      authorTitle: data.authorTitle ?? 'Compliance Research',
      readingTime: `${Math.ceil(rt.minutes)} min read`,
      coverGradient: data.coverGradient ?? 'from-emerald-100 to-slate-100 dark:from-emerald-900/30 dark:to-slate-800/50',
      content,
      excerpt: data.description ?? plainText.slice(0, 160) + '…',
    } satisfies BlogPost;
  });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const rt = readingTime(content);
  const plainText = stripMarkdown(content);

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? plainText.slice(0, 160),
    date: data.date ?? '2026-01-01',
    dateFormatted: formatDate(data.date ?? '2026-01-01'),
    category: data.category ?? 'Insights',
    author: data.author ?? 'OriginTrace Team',
    authorTitle: data.authorTitle ?? 'Compliance Research',
    readingTime: `${Math.ceil(rt.minutes)} min read`,
    coverGradient: data.coverGradient ?? 'from-emerald-100 to-slate-100 dark:from-emerald-900/30 dark:to-slate-800/50',
    content,
    excerpt: data.description ?? plainText.slice(0, 160) + '…',
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}
