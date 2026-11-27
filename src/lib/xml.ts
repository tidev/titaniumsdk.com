/**
 * Text made safe to interpolate into XML, as element content or as an
 * attribute value.
 *
 * Shared by the feeds, which are built by hand: a feed is a dozen fields, and
 * the one thing that matters is that every one of them goes through this.
 */
export const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
