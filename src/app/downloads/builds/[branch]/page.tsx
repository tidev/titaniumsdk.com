import { BranchBuilds } from '@/components/downloads/branch-builds';
import { branchBuilds, branchList, MAIN_BRANCH } from '@/lib/downloads/registry';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * CI builds for one release branch.
 *
 * Only branches with something left to download are generated: a branch whose
 * artifacts have all expired has no page rather than an empty one, which is
 * what downloads-www does and the reason 62 of the SDK's 67 branches are not
 * routes here.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return branchList()
    .filter((branch) => branch.name !== MAIN_BRANCH)
    .map((branch) => ({ branch: branch.name }));
}

export async function generateMetadata({
  params,
}: PageProps<'/downloads/builds/[branch]'>): Promise<Metadata> {
  const { branch } = await params;
  return {
    title: `CI builds on ${branch} — Titanium SDK`,
    description: `Continuous integration builds of the Titanium SDK from the ${branch} branch.`,
    alternates: { canonical: `${SITE_URL}/downloads/builds/${branch}` },
  };
}

export default async function BranchBuildsPage({
  params,
}: PageProps<'/downloads/builds/[branch]'>) {
  const { branch } = await params;
  const builds = branchBuilds(branch);
  // Unreachable with dynamicParams off, but branchBuilds is what rejects a name
  // that is not in branches.json and the page should not render one regardless.
  if (!builds) notFound();

  return <BranchBuilds branch={branch} branches={branchList()} builds={builds} />;
}
