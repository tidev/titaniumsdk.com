/**
 * The gutters every module page shares.
 *
 * Only gutters. The browse page is one column and a module page is a two-column
 * grid with a rail, so the column structure belongs to the pages rather than
 * here — unlike the SDK, where a persistent nav tree makes the shell the thing
 * that owns the grid.
 */
export default function ModulesLayout({ children }: LayoutProps<'/modules'>) {
  return <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">{children}</div>;
}
