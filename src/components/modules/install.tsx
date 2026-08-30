import { formatSize, installPlan, type InstallRelease } from '@/lib/docs/install';
import { PLATFORM_LABELS } from '@/lib/docs/module-summary';

/**
 * How to install a module, as it actually works today.
 *
 * Deliberately not a one-line CLI command. `ti module install` is TI-56 and is
 * not built; showing one would be showing something that fails when you paste
 * it. What is shown instead was checked against real release archives: the zip
 * unpacks to `modules/<slot>/<moduleid>/<version>/` from the project root, and
 * `<slot>` is `iphone` for iOS everywhere it appears.
 */

const Snippet = ({ children, label }: { children: string; label?: string }) => (
  <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface p-3 font-mono text-xs leading-relaxed">
    <code>{children}</code>
    {label && <span className="sr-only">{label}</span>}
  </pre>
);

export function Install({
  moduleId,
  releases,
  className = '',
}: {
  moduleId: string;
  releases: InstallRelease[];
  className?: string;
}) {
  const { targets, archives, tiapp } = installPlan(moduleId, releases);
  if (!targets.length) return null;

  const unpack = archives.length
    ? `cd /path/to/your-project\n${archives.map((a) => `unzip ~/Downloads/${a.filename}`).join('\n')}`
    : null;

  return (
    <section aria-labelledby="install" className={className}>
      <h2 id="install" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
        Install
      </h2>

      <p className="mt-2 text-sm text-text-muted">
        A module is a zip you unpack in your project. There is no installer command yet — a{' '}
        <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">ti module install</code>{' '}
        is planned but <strong className="font-medium">does not exist today</strong>, so the steps
        below are the ones that work.
      </p>

      <ol className="mt-6 space-y-6">
        {!!archives.length && (
          <li>
            <h3 className="text-sm font-medium">1. Download the release archive</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {archives.map((archive) => (
                <li key={archive.url}>
                  <a
                    href={archive.url}
                    rel="noopener noreferrer"
                    className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong"
                  >
                    <span className="font-mono break-all text-link">{archive.filename}</span>
                    <span className="text-xs text-text-subtle">
                      {archive.platforms.map((p) => PLATFORM_LABELS[p]).join(' + ')}
                      {formatSize(archive.size) ? ` · ${formatSize(archive.size)}` : ''}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </li>
        )}

        {unpack && (
          <li>
            <h3 className="text-sm font-medium">2. Unpack it at your project root</h3>
            <Snippet>{unpack}</Snippet>
            <p className="mt-2 text-xs text-text-subtle">
              The archive already contains the full path, so it lands in place:
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {targets.map((t) => (
                <li key={t.platform} className="font-mono text-xs break-all text-text-subtle">
                  {t.path}/
                </li>
              ))}
            </ul>
          </li>
        )}

        <li>
          <h3 className="text-sm font-medium">
            {archives.length ? '3.' : '1.'} Add it to <code className="font-mono">tiapp.xml</code>
          </h3>
          <Snippet>{tiapp}</Snippet>
          <p className="mt-2 text-xs text-text-subtle">
            The <code className="font-mono">platform</code> attribute is the packager&rsquo;s name
            for the platform, which is <code className="font-mono">iphone</code> for iOS — the same
            word the archive uses in its own path.
          </p>
        </li>

        <li>
          <h3 className="text-sm font-medium">
            {archives.length ? '4.' : '2.'} Require it from your app
          </h3>
          <Snippet>{`const mod = require('${moduleId}');`}</Snippet>
        </li>
      </ol>
    </section>
  );
}
