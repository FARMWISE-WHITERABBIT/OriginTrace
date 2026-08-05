# Blog Images

Each blog post can have a cover image and inline body images.

## Folder structure

```
public/blog/
  [post-slug]/
    cover.jpg          ← hero image (recommended: 1200×630px for OG)
    any-body-image.jpg ← images referenced inline in the post content
```

## Adding a cover image to a post

1. Create the folder: `public/blog/[post-slug]/`
2. Drop your cover image in as `cover.jpg` (or `.png`, `.webp`)
3. Open the post file in `content/blog/[filename].ts`
4. Add two fields:

```ts
export const post: BlogPost = {
  slug: 'your-post-slug',
  coverImage: '/blog/your-post-slug/cover.jpg',
  coverImageAlt: 'Descriptive alt text for SEO and accessibility',
  // ...rest of post
};
```

The gradient background is used as a fallback when no coverImage is set.

## Adding inline images inside a post

In the post's `content` array, add an image section:

```ts
content: [
  { type: 'paragraph', text: 'Some text...' },
  {
    type: 'image',
    src: '/blog/your-post-slug/image-name.jpg',
    alt: 'Descriptive alt text',
    caption: 'Optional caption shown below the image',  // optional
  },
  { type: 'paragraph', text: 'Text continues...' },
]
```

## Recommended image specs

| Use           | Size          | Format         |
|---------------|---------------|----------------|
| Cover image   | 1200 × 630px  | JPG or WebP    |
| Body images   | 800 × 450px+  | JPG or WebP    |
| OG / social   | 1200 × 630px  | JPG (same as cover) |

The cover image is also used as the Open Graph image when sharing on
LinkedIn, Twitter/X, and WhatsApp — so a clean, high-quality image
significantly improves click-through on social shares.

## Good free image sources

- **Unsplash** (unsplash.com) — search "cocoa farm", "container port",
  "GPS field agent", "agricultural supply chain"
- **Pexels** (pexels.com) — similar quality, also free
- **Your own photos** — farm visits, field agent photos, product shots
  are the most authentic for this audience
