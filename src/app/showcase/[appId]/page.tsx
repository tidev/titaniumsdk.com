import { JsonLd } from '@/components/seo/json-ld';
import { Icon, PlaceholderBadge, PlatformChips } from '@/components/showcase/badges';
import { Screenshots } from '@/components/showcase/screenshots';
import { ExternalLink } from '@/components/ui/external-link';
import { softwareApplication } from '@/lib/seo';
import { storeLinks } from '@/lib/showcase/app';
import { appById, listedApps } from '@/lib/showcase/read';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * One app, at a URL that can be linked to.
 *
 * The reason these have pages of their own rather than being anchors on the
 * index: TI-54 asks that entries be individually indexable, and only a real URL
 * can carry a canonical, a card and a `SoftwareApplication` block of its own. A
 * grid of anchors would rank as one page about many apps, which is not what
 * anybody is searching for.
 *
 * `generateStaticParams` reads the same set the index does, so there is exactly
 * one definition of what is currently listed - which is what keeps the worked
 * examples from having pages after the first real entry hides them.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return listedApps().map((app) => ({ appId: app.id }));
}

export async function generateMetadata({
  params,
}: PageProps<'/showcase/[appId]'>): Promise<Metadata> {
  const { appId } = await params;
  const app = appById(appId);
  if (!app) return {};

  return {
    title: `${app.name} - built with Titanium`,
    // The first line of what the submitter wrote, rather than the whole thing:
    // a description is up to 1000 characters and a meta description is cut off
    // long before that.
    description: app.subtitle ?? app.description.slice(0, 160),
    alternates: { canonical: `${SITE_URL}/showcase/${app.id}` },
  };
}

export default async function AppPage({ params }: PageProps<'/showcase/[appId]'>) {
  const { appId } = await params;

  // Not trusted as a path: `appById` looks the segment up among the entries
  // actually on disk rather than joining it onto one.
  const app = appById(appId);
  if (!app) notFound();

  const links = storeLinks(app);

  return (
    <div className="max-w-3xl py-10">
      <JsonLd data={softwareApplication(app)} />

      <p className="text-sm">
        <a href="/showcase" className="text-link hover:underline">
          App showcase
        </a>
      </p>

      <div className="mt-6 flex items-start gap-4">
        <Icon app={app} size={80} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{app.name}</h1>
            {app.placeholder && <PlaceholderBadge />}
          </div>
          {app.subtitle && <p className="mt-1 text-text-muted">{app.subtitle}</p>}
        </div>
      </div>

      {/* `whitespace-pre-line`, not markdown. The field is plain text in the
          schema, and rendering a submitter's string as markup would be a way
          for an entry to carry a link that never went through review. Paragraph
          breaks are the one thing worth honouring. */}
      <p className="mt-6 whitespace-pre-line text-text-muted">{app.description}</p>

      {links.length > 0 && (
        <section aria-label="Where to see it" className="mt-8">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {links.map((link) => (
              <li key={link.key}>
                <ExternalLink
                  href={link.url}
                  className="text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {link.label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* `flex-wrap`, so the two stack rather than squeezing on a narrow
          screen: the chips are as wide as the app claims platforms. */}
      <div className="mt-8 flex flex-wrap items-center gap-8">
        <section aria-labelledby="platforms">
          <h2 id="platforms" className="text-sm font-semibold tracking-tight">
            Built for
          </h2>
          <div className="mt-2">
            <PlatformChips app={app} />
          </div>
        </section>
        <section aria-labelledby="built-with">
          <h2 id="built-with" className="text-sm font-semibold tracking-tight">
            Built with
          </h2>
          <p className="mt-2 text-sm text-text-muted">Titanium SDK {app.sdkVersion}</p>
        </section>
      </div>

      <Screenshots name={app.name} screenshots={app.screenshots} />
    </div>
  );
}
