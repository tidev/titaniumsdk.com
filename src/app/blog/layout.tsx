/** Gutters for everything under /blog, matching the modules tree. */
export default function BlogLayout({ children }: LayoutProps<'/blog'>) {
  return <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">{children}</div>;
}
