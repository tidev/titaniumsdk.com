import { PLATFORM_LABELS } from '@/lib/docs/module-summary';
import type { ModuleManifest } from '@/lib/registry';

/**
 * The manifest each platform shipped with.
 *
 * One block per platform, never merged: the two disagree routinely. ti.map's
 * android manifest wants Titanium 12.7.0 and apiversion 4 while its iOS one
 * wants 10.0.0.GA and apiversion 2, and `minsdk` is the field that decides
 * whether the module builds at all.
 *
 * A release can also carry fewer manifests than platforms — ti.nfc 2.0.0 shipped
 * for both and only committed the android one — so this renders what exists
 * rather than a row per platform.
 */

const FIELDS: { key: keyof ModuleManifest; label: string; mono?: boolean }[] = [
  { key: 'minsdk', label: 'Minimum SDK', mono: true },
  { key: 'apiversion', label: 'Module API version', mono: true },
  { key: 'architectures', label: 'Architectures', mono: true },
  { key: 'respackage', label: 'Resource package', mono: true },
  { key: 'guid', label: 'GUID', mono: true },
  { key: 'author', label: 'Author' },
  { key: 'license', label: 'License' },
  { key: 'copyright', label: 'Copyright' },
];

const show = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) return value.length ? value.join(', ') : null;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
};

function Field({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-x-4">
      <dt className="text-text-subtle">{label}</dt>
      <dd className={`break-words ${mono ? 'font-mono text-xs' : ''}`}>{children}</dd>
    </div>
  );
}

export function Manifests({
  manifests,
  className = '',
}: {
  manifests: ModuleManifest[];
  className?: string;
}) {
  if (!manifests.length) return null;

  return (
    <section aria-labelledby="manifests" className={className}>
      <h2 id="manifests" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
        Manifest
      </h2>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {manifests.map((manifest) => (
          <div key={manifest.platform} className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium">
              {PLATFORM_LABELS[manifest.platform]}{' '}
              <span className="font-mono font-normal text-text-subtle">{manifest.version}</span>
            </h3>

            {/* Two columns from `sm` and stacked below it. A label column wide
                enough for "Module API version" leaves under 120px for a value
                on a 320px screen, which is narrower than most of these are. */}
            <dl className="mt-3 space-y-1.5 text-sm">
              {FIELDS.map(({ key, label, mono }) => {
                const value = show(manifest[key]);
                if (!value) return null;
                return (
                  <Field key={key} label={label} mono={mono}>
                    {value}
                  </Field>
                );
              })}
              {/* iOS only, and the one manifest flag with a build consequence:
                  whether the module can be linked into a Mac Catalyst target. */}
              {manifest.mac !== undefined && (
                <Field label="Mac Catalyst">{manifest.mac ? 'supported' : 'not supported'}</Field>
              )}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
