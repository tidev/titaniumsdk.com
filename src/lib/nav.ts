export type NavItem = { href: string; label: string };

/** Main sections. Routes are placeholders until M2–M4 build them out. */
export const primaryNav: NavItem[] = [
  { href: "/guides", label: "Guides" },
  { href: "/api", label: "API Reference" },
  { href: "/downloads", label: "Downloads" },
  { href: "/modules", label: "Modules" },
];

/** Taken from the current site rather than invented. */
export const communityNav: NavItem[] = [
  { href: "https://github.com/tidev/titanium-sdk", label: "GitHub" },
  { href: "https://github.com/tidev/titanium-sdk/discussions", label: "Discussions" },
  { href: "https://tidev.slack.com", label: "Slack" },
  { href: "https://tidev.io", label: "TiDev" },
];

export const socialNav: NavItem[] = [
  { href: "https://bsky.app/profile/titaniumsdk.com", label: "Bluesky" },
  { href: "https://x.com/TitaniumSDK", label: "X" },
  { href: "https://www.reddit.com/r/TitaniumSDK/", label: "Reddit" },
];

export const supportNav: NavItem[] = [
  { href: "https://github.com/sponsors/tidev/", label: "GitHub Sponsors" },
  { href: "https://en.liberapay.com/tidev", label: "Liberapay" },
];

export function isExternal(href: string) {
  return href.startsWith("http");
}
