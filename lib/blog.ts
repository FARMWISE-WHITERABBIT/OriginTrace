export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  dateISO: string;
  category: string;
  readingTime: string;
  author: string;
  authorRole: string;
  coverGradient: string;
  tags: string[];
  content: BlogSection[];
}

export type BlogSection =
  | { type: 'paragraph'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'bullets'; intro?: string; items: string[] }
  | { type: 'numbered'; intro?: string; items: string[] }
  | { type: 'callout'; variant: 'info' | 'warning' | 'tip' | 'deadline'; title: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'cta'; heading: string; text: string; buttonText: string; href: string };

import { posts } from '@/content/blog/index';

export function getAllPosts(): BlogPost[] {
  return [...posts].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug);
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getAllPosts().filter(p => p.category === category);
}

export function getRecentPosts(n = 3): BlogPost[] {
  return getAllPosts().slice(0, n);
}
