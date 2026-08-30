import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

/**
 * Renders the markdown that the registry stores in prose fields.
 *
 * Two things make this more than a plain markdown call. The source contains
 * hand-written HTML — `Titanium.UI.View` has a `<table class="doc-table">` — so
 * inline HTML is enabled and the result is sanitized. And cross-references were
 * resolved at compile time to `api:` URIs, which are turned into real paths here
 * because only the renderer knows which version it is rendering.
 */

const md = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
});

/** `api:Titanium.UI.View` and `api:Titanium.UI.View#backgroundColor`. */
const API_HREF = /^api:([A-Za-z_][\w.]*)(?:#(.+))?$/;

export function apiHref(base: string, target: string): string | null {
  const m = API_HREF.exec(target);
  if (!m) return null;
  return `${base}/${m[1]}${m[2] ? `#${anchorFor(m[2])}` : ''}`;
}

/** Member anchors, kept stable and URL-safe so they can be deep-linked. */
export function anchorFor(member: string): string {
  return member.replace(/[^\w.-]/g, '-');
}

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'figure',
    'figcaption',
    'del',
    'ins',
    'abbr',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    code: ['class'],
    // The source's own table styling hook, and heading anchors.
    table: ['class'],
    th: ['class', 'colspan', 'rowspan', 'scope'],
    td: ['class', 'colspan', 'rowspan'],
    '*': ['id'],
  },
  // Anything not on the allowlist is dropped rather than escaped, so a stray
  // <script> leaves nothing behind.
  disallowedTagsMode: 'discard',
  allowedSchemes: ['http', 'https', 'mailto'],
};

export type RenderOptions = {
  /** Path prefix that `api:` references resolve against, e.g. `/docs/sdk/main`. */
  base: string;
  /**
   * Path that relative image references resolve against.
   *
   * apidoc images sit beside the YAML, so `Titanium/UI/Button.yml` writes
   * `./button_android.png` meaning `Titanium/UI/button_android.png`. Only
   * type-level descriptions carry them -- 29 types, and no member prose -- so
   * one base per page is enough.
   */
  imageBase?: string;
};

export function renderMarkdown(
  source: string | undefined,
  { base, imageBase }: RenderOptions
): string {
  if (!source) return '';

  const html = md.render(source);

  return sanitizeHtml(html, {
    ...SANITIZE,
    transformTags: {
      img: (tagName, attribs) => {
        const src = attribs.src ?? '';
        // Absolute and remote sources are left exactly as they are.
        if (!imageBase || /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('/')) {
          return { tagName, attribs };
        }
        const clean = src.replace(/^\.\//, '');
        return {
          tagName,
          attribs: { ...attribs, src: `${imageBase}/${clean}`, loading: 'lazy' },
        };
      },
      a: (tagName, attribs) => {
        const href = attribs.href ?? '';
        // A single leftover anchor from the ExtJS-era docs, pointing at a
        // fragment that no longer exists. The examples are on the page now.
        const legacy = /^#!\/api\/[\w.]+-examples$/.exec(href);
        if (legacy) return { tagName, attribs: { ...attribs, href: '#examples' } };
        const resolved = apiHref(base, href);
        if (resolved) return { tagName, attribs: { ...attribs, href: resolved } };
        // Anything leaving the site opens safely; internal links are untouched.
        if (/^https?:\/\//.test(href)) {
          return { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } };
        }
        return { tagName, attribs };
      },
    },
  });
}

/** Single-paragraph render for summaries, which should not become block elements. */
export function renderInline(source: string | undefined, opts: RenderOptions): string {
  const html = renderMarkdown(source, opts);
  return html
    .replace(/^<p>/, '')
    .replace(/<\/p>\s*$/, '')
    .trim();
}
