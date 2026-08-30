import { BranchBuilds } from '@/components/downloads/branch-builds';
import { branchBuilds, branchList, MAIN_BRANCH } from '@/lib/downloads/registry';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

/** CI builds from the development branch — the landing page for `/downloads/builds`. */

export const metadata: Metadata = {
  title: 'CI builds — Titanium SDK',
  description:
    'Continuous integration builds of the Titanium SDK, published from each active branch and downloadable for 90 days.',
  alternates: { canonical: `${SITE_URL}/downloads/builds` },
};

export default function MainBuildsPage() {
  return (
    <BranchBuilds
      branch={MAIN_BRANCH}
      branches={branchList()}
      builds={branchBuilds(MAIN_BRANCH) ?? []}
    />
  );
}
