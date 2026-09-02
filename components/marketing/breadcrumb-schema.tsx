type Crumb = { name: string; url: string };

/**
 * Renders BreadcrumbList JSON-LD only — no visible UI. Deep marketing pages
 * (compliance/*, industries/*, blog posts) sit 2+ levels below the homepage
 * with no breadcrumb trail of any kind, visible or structured; this adds the
 * structured-data half so search results can show a path instead of a bare
 * URL. `items` excludes the implicit final "current page" position — pass
 * everything from Home down to (and including) the page itself.
 */
export function BreadcrumbSchema({ items }: { items: Crumb[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
