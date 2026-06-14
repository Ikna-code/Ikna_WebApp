'use client';

/**
 * components/seo/JsonLd.tsx
 * Injects a JSON-LD <script> tag into the page.
 * Usage (server components): <JsonLd data={getProductJsonLd(product, url)} />
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
