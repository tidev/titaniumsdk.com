import { TitaniumMark } from './titanium-logo';
import {
  communityNav,
  isExternal,
  primaryNav,
  socialNav,
  supportNav,
  type NavItem,
} from '@/lib/nav';
import Link from 'next/link';

function LinkColumn({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-subtle">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => {
          const className =
            'text-sm text-text-muted transition-colors hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded';
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {isExternal(item.href) ? (
                <a href={item.href} target="_blank" rel="noreferrer" className={className}>
                  {item.label}
                </a>
              ) : (
                <Link href={item.href} className={className}>
                  {item.label}
                </Link>
              )}
              {item.also && (
                <>
                  <span aria-hidden className="text-sm text-text-subtle">
                    /
                  </span>
                  {/* Not a Link: the feed is a route handler, so client-side
                      navigation would try to render XML as a page. */}
                  <a href={item.also.href} className={className}>
                    {item.also.label}
                  </a>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <LinkColumn title="Documentation" items={primaryNav} />
          <LinkColumn title="Community" items={communityNav} />
          <LinkColumn title="Follow" items={socialNav} />
          <LinkColumn title="Support" items={supportNav} />
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <TitaniumMark className="h-6 w-auto" />
            <span className="text-sm font-medium">Titanium SDK</span>
          </div>
          <p className="text-sm text-text-subtle">
            Apache-2.0. Titanium is a registered trademark of{' '}
            <a
              href="https://tidev.io"
              target="_blank"
              rel="noreferrer"
              className="text-text-muted underline underline-offset-2 hover:text-link"
            >
              TiDev, Inc.
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
