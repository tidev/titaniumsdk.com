import { ExternalLink } from '@/components/ui/external-link';
import { latestSdkVersion } from '@/lib/docs/registry';
import { newFileUrl } from '@/lib/github';
import { prettyJson } from '@/lib/pretty-json';
import { IMAGE_EXTENSIONS } from '@/lib/registry-images';
import { appTemplate } from '@/lib/registry/showcase';
import { MAX_SCREENSHOTS } from '@/lib/showcase/icon';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

/**
 * How to get an app into the showcase (TI-54).
 *
 * A page rather than a card on the index, for the reasons its directory
 * counterpart sets out at `/directory/submit`, which this mirrors:
 * `newFileUrl` hands GitHub a complete, valid entry, so the page only says
 * what a submitter would not already guess.
 *
 * The copy does not argue that Titanium is still alive - that case is for a
 * reader who has not decided yet, and making it here reads as apologising to
 * the one person who never needed convincing.
 *
 * `docs/app-showcase.md` is the reviewer's copy of the same rules and goes
 * further than a submitter needs - why there are no screenshots, why nothing
 * expires, the worked examples. What a submitter needs - the bar for
 * inclusion, and what gets an entry removed - is inlined below instead of
 * linked, the same choice `/directory/submit` makes about its own policy doc.
 *
 * `sdkVersion` defaults to whatever this build's docs consider latest, read
 * through `@/lib/docs/registry` - the one place that answer lives, so a
 * hardcoded example here could not quietly fall behind it.
 */

/** The filename a submitter is meant to change. Named to be obviously a placeholder. */
const PLACEHOLDER_FILE = 'registry/showcase/your-app.json';

export const metadata: Metadata = {
  title: 'Add your app to the showcase - Titanium SDK',
  description:
    'How to add an app you shipped with Titanium to the showcase: one JSON file, an icon, and a pull request.',
  alternates: { canonical: `${SITE_URL}/showcase/submit` },
};

const LINK =
  'text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export default function SubmitAppPage() {
  const latest = latestSdkVersion();
  // Every release ships with its docs compiled, so this is not a state a
  // deployed build should ever be in - failing loudly beats teaching a
  // submitter to write "main" into a field the schema will reject.
  if (!latest) throw new Error('no compiled SDK version to default sdkVersion to');

  const json = prettyJson(appTemplate(latest));

  return (
    <div className="max-w-3xl py-10">
      <p className="text-sm">
        <a href="/showcase" className={LINK}>
          App showcase
        </a>
      </p>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Add your app</h1>
      <p className="mt-3 text-text-muted">
        Shipped an app with Titanium? Add it: one file, an icon, one pull request.
      </p>

      <p className="mt-8">
        <ExternalLink
          href={newFileUrl(PLACEHOLDER_FILE, json)}
          className="inline-block rounded-md border border-border-strong px-4 py-2.5 font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Add your app on GitHub
        </ExternalLink>
      </p>

      <ul className="mt-6 max-w-xl list-disc space-y-2 pl-5 text-sm text-text-muted">
        <li>
          Rename the file to a slug for your app - it becomes{' '}
          <code className="font-mono text-xs">
            {SITE_URL.replace('https://', '')}/showcase/&lt;slug&gt;
          </code>
          , and has to match the <code className="font-mono text-xs">id</code> inside it.
        </li>
        <li>No GitHub account? One is forked for you on the way in.</li>
        <li>
          Commit an icon beside it, named the same ({IMAGE_EXTENSIONS.join(', ')}, at most 512x512px
          and 100KB). Every entry needs one - there is no fallback the way the directory has
          initials.
        </li>
        <li>
          Screenshots are optional: up to {MAX_SCREENSHOTS}, committed beside it as{' '}
          <code className="font-mono text-xs">&lt;slug&gt;-1</code> to{' '}
          <code className="font-mono text-xs">&lt;slug&gt;-{MAX_SCREENSHOTS}</code> with the same
          extensions, at most 100KB each. The number is the order they are shown in.
        </li>
        <li>
          <code className="font-mono text-xs">subtitle</code> may be deleted, and so may any one of
          the three links, as long as one survives. A store link must match the store&rsquo;s own
          hostname.
        </li>
        <li>
          Submit an app you built or own, not one you happen to admire - and only an icon you have
          the right to publish.
        </li>
        <li>
          No email address anywhere - not in a link, not written into any text field. The schema
          rejects it.
        </li>
        <li>
          <code className="font-mono text-xs">pnpm check:registry</code> catches mistakes before you
          commit; CI runs it either way.
        </li>
      </ul>

      <table className="mt-8 w-full max-w-xl border-collapse text-sm">
        <caption className="mb-2 text-left text-sm text-text-muted">
          Every field in the{' '}
          <ExternalLink href={newFileUrl(PLACEHOLDER_FILE, json)} className={LINK}>
            template
          </ExternalLink>{' '}
          above.
        </caption>
        <thead>
          <tr className="border-b border-border-strong text-left text-text-subtle">
            <th className="py-1.5 pr-4 font-medium">Field</th>
            <th className="py-1.5 font-medium">What goes in it</th>
          </tr>
        </thead>
        <tbody className="text-text-muted">
          {[
            ['id', 'Lowercase kebab-case slug. Must match the filename, and becomes your URL.'],
            ['name', 'The app\u2019s name.'],
            ['subtitle', 'One short line under the name (optional).'],
            ['platforms', 'One to four of "iphone", "ipad", "android-phone", "android-tablet".'],
            ['sdkVersion', 'The Titanium SDK you built with, such as 12.7.0 or 12.7.0.GA.'],
            ['description', 'What the app is and who it is for, up to 1000 characters.'],
            ['website', 'The app\u2019s or your own site (optional).'],
            ['appStore', 'An apps.apple.com (or itunes.apple.com) URL (optional).'],
            ['playStore', 'A play.google.com URL (optional).'],
          ].map(([field, description]) => (
            <tr key={field} className="border-b border-border">
              <td className="py-1.5 pr-4 align-top font-mono text-xs">{field}</td>
              <td className="py-1.5 align-top">{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 max-w-xl text-xs text-text-subtle">
        At least one of website, appStore or playStore is required.
      </p>

      <section aria-labelledby="what-qualifies" className="mt-12 border-t border-border pt-8">
        <h2 id="what-qualifies" className="text-lg font-semibold tracking-tight">
          What qualifies
        </h2>
        <p className="mt-2 text-text-muted">
          The app has shipped, and the entry links somewhere a stranger can check it: an App Store
          or Google Play listing, or the app&rsquo;s own site if it was built for one organisation
          and never sold publicly.
        </p>
        <p className="mt-3 text-text-muted">
          That second case is first-class, not a fallback. A great deal of Titanium&rsquo;s best
          work is field tools, logistics and internal apps built for a single organisation, and a
          rule that took only store links would leave most of it out.
        </p>
      </section>

      <section aria-labelledby="removal" className="mt-10">
        <h2 id="removal" className="text-lg font-semibold tracking-tight">
          When an entry is removed
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-text-muted">
          <li>The owner asks. No questions, no delay, no exceptions.</li>
          <li>It was submitted by someone other than the app&rsquo;s owner.</li>
          <li>It is not what it says it is, or the link no longer works.</li>
          <li>It is being used to advertise something other than the app itself.</li>
        </ul>
        <p className="mt-3 text-text-muted">A deletion, with the reason in the pull request.</p>
      </section>
    </div>
  );
}
