'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Cal.com inline embed using iframe.
 * Pre-fills name + email from URL params set by the demo form redirect.
 * No npm package required — Cal.com supports iframe embedding natively.
 *
 * Set NEXT_PUBLIC_CALCOM_LINK in your environment, e.g.:
 *   https://cal.com/origintrace/discovery
 */
export function CalcomEmbed() {
  const params = useSearchParams();
  const name = params.get('name') || '';
  const email = params.get('email') || '';

  const baseUrl =
    process.env.NEXT_PUBLIC_CALCOM_LINK ||
    'https://cal.com/origintrace/discovery';

  // Cal.com supports pre-filling via query params
  const embedUrl = new URL(baseUrl);
  embedUrl.searchParams.set('embed', 'true');
  embedUrl.searchParams.set('theme', 'light');
  if (name) embedUrl.searchParams.set('name', name);
  if (email) embedUrl.searchParams.set('email', email);

  return (
    <iframe
      src={embedUrl.toString()}
      width="100%"
      height="700"
      frameBorder="0"
      title="Book a discovery call with OriginTrace"
      style={{ minHeight: 600 }}
      allow="camera; microphone"
    />
  );
}
