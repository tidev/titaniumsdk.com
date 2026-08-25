export type NavItem = { href: string; label: string };

/**
 * Main sections. "Docs" is the umbrella over both guides and the API
 * reference — the API is part of the docs, not a sibling of them.
 * Routes are placeholders until M2–M4 build them out.
 */
export const primaryNav: NavItem[] = [
  { href: '/docs', label: 'Docs' },
  { href: '/downloads', label: 'Downloads' },
  { href: '/modules', label: 'Modules' },
];

/**
 * GitHub points at the org rather than a single repo — the popular repos are
 * pinned there, so it is the more useful landing spot.
 */
export const communityNav: NavItem[] = [
  { href: 'https://github.com/tidev', label: 'GitHub' },
  { href: 'https://github.com/tidev/titanium-sdk/discussions', label: 'Discussions' },
  { href: 'https://tidev.slack.com', label: 'Slack' },
  {
    // Interim target. The eventual home is a site page pulling together the
    // CLA, code of conduct, and committer path from tidev/organization-docs.
    href: 'https://github.com/tidev/titanium-sdk/blob/main/.github/CONTRIBUTING.md',
    label: 'Contribute',
  },
];

export const socialNav: NavItem[] = [
  { href: 'https://bsky.app/profile/titaniumsdk.com', label: 'Bluesky' },
  { href: 'https://x.com/TitaniumSDK', label: 'X' },
  { href: 'https://www.reddit.com/r/TitaniumSDK/', label: 'Reddit' },
];

export const supportNav: NavItem[] = [
  { href: 'https://github.com/sponsors/tidev/', label: 'GitHub Sponsors' },
  { href: 'https://en.liberapay.com/tidev', label: 'Liberapay' },
];

export const GITHUB_ORG_URL = 'https://github.com/tidev';

export function isExternal(href: string) {
  return href.startsWith('http');
}
