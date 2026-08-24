import Link from "next/link";
import { primaryNav } from "@/lib/nav";
import { TitaniumLogo } from "./titanium-logo";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <TitaniumLogo />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Layout slot for search. TI-47 wires the handler; disabled rather
              than hidden so the header does not reflow when it lands. */}
          <button
            type="button"
            disabled
            title="Search is not wired up yet"
            className="hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-text-subtle sm:flex disabled:cursor-not-allowed"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="size-4"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            Search
          </button>

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
