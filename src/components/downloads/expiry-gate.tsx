'use client';

import { useEffect, useState } from 'react';

/**
 * Withdraws a CI build once its artifacts are gone.
 *
 * The page filters expired builds out when it renders, but it renders once and
 * is then served until the next deploy. A build whose 90 days run out in that
 * window would keep offering nightly.link URLs that 404, and an install command
 * the CLI can no longer resolve — the exact failure an audit found 292 times on
 * the old site. This is the only check that runs on the reader's clock rather
 * than the build machine's.
 *
 * `at` is an epoch, parsed on the server, so the rule for what counts as
 * expired lives in one place (`isExpired`) and this side cannot drift from it.
 * A build whose `expires` does not parse is never wrapped in a gate.
 *
 * `children` is server-rendered and passed through, so the rows cost nothing
 * extra in the client bundle; this component decides whether to show them, it
 * does not build them. The first client render assumes not-expired, matching
 * the server, and the effect corrects it — the alternative is a hydration
 * mismatch on every row.
 */
export function ExpiryGate({ at, children }: { at: number; children: React.ReactNode }) {
  const [lapsed, setLapsed] = useState(false);

  useEffect(() => {
    if (at <= Date.now()) {
      setLapsed(true);
    }
    // No timer for the boundary itself: nobody holds a downloads page open for
    // the days until the next build expires, so mount is the moment that counts.
  }, [at]);

  if (!lapsed) return <>{children}</>;

  return (
    <p className="mt-3 text-sm text-text-subtle">
      <span className="rounded border border-warning px-1.5 py-0.5 font-mono text-xs text-warning">
        expired
      </span>{' '}
      GitHub removed these artifacts 90 days after the run, so there is nothing left to install.
    </p>
  );
}
