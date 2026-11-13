import { MobileNav } from './mobile-nav';
import { NavMenu } from './nav-menu';
import { NAV_ITEM_CLASS } from './site-nav-item';
import { ThemeToggle } from './theme-toggle';
import { TitaniumLogo } from './titanium-logo';
import { HoverPrefetchLink } from '@/components/hover-prefetch-link';
import { SiteSearch } from '@/components/search/site-search';
import {
  COMMUNITY_LABEL,
  communityNav,
  DOCS_LABEL,
  docsNav,
  GITHUB_ORG_URL,
  sectionNav,
} from '@/lib/nav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <HoverPrefetchLink
          href="/"
          className="flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <TitaniumLogo />
        </HoverPrefetchLink>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {/* First, and grouped: the guides and the API reference are the two
                halves of one section, and a reader should not have to open the
                guides to find the way to the reference. */}
            <li>
              <NavMenu label={DOCS_LABEL} items={docsNav} />
            </li>
            {sectionNav.map((item) => (
              <li key={item.href}>
                <HoverPrefetchLink href={item.href} className={NAV_ITEM_CLASS}>
                  {item.label}
                </HoverPrefetchLink>
              </li>
            ))}
            {/* Last. What is under it is the site's people rather than its
                software, so it reads as a coda to the sections rather than as
                another one. */}
            <li>
              <NavMenu label={COMMUNITY_LABEL} items={communityNav} />
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SiteSearch />

          <a
            href={GITHUB_ORG_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Titanium SDK on GitHub"
            title="GitHub"
            className="hidden size-9 place-items-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:grid"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
