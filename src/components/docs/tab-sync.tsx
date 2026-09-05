'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Keeps tab groups in step, and remembers what the reader picked (TI-32).
 *
 * ## The tabs work without this
 *
 * They are radio inputs with labels, switched by CSS. A reader with no
 * JavaScript gets working tabs and every panel's content, which is why they are
 * not React state: a guide's tabs hold the Android half of the instructions, and
 * hiding that behind hydration would lose content rather than a convenience.
 * Sibling of `CodeCopy`, which enhances the same rendered HTML for the same
 * reason.
 *
 * What this adds is the part CSS cannot do. A page that explains something four
 * times has four npm/Yarn groups, and picking Yarn in one should not leave the
 * next three on npm.
 *
 * ## Syncing by label, not by group
 *
 * A choice applies to every group that offers a tab with that name. The obvious
 * alternative — match groups whose label sets are identical — looks equivalent
 * and is not: an install group offering npm, Yarn and pnpm would fail to sync
 * with a build group offering only npm and Yarn, which is exactly the pair a
 * reader most expects to move together. Matching one label at a time also
 * leaves an iOS/Android group untouched when Yarn is picked, because it has no
 * tab by that name.
 *
 * Choices are stored most-recent-first and per label, because they are facts
 * about the reader — they use Yarn, they are on Android — rather than about the
 * page being read.
 */

const KEY = 'docs:tabs';

/** More than a reader will ever accumulate; a bound so the entry cannot grow. */
const REMEMBER = 20;

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    // Anything else in the slot is someone else's data or a corrupted write.
    // Starting over costs a reader one click; trusting it throws on every page.
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, REMEMBER);
  } catch {
    return [];
  }
}

function remember(label: string): void {
  const next = [label, ...load().filter((l) => l !== label)].slice(0, REMEMBER);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private windows and disabled storage. The tabs still work for this visit.
  }
}

const groupsOf = () => [...document.querySelectorAll<HTMLElement>('.prose-docs .tabs')];

const radiosOf = (group: HTMLElement) => [
  ...group.querySelectorAll<HTMLInputElement>(':scope > .tab-list > .tab-radio'),
];

const labelsOf = (group: HTMLElement) =>
  [...group.querySelectorAll<HTMLElement>(':scope > .tab-list > .tab')].map((el) =>
    (el.textContent ?? '').trim()
  );

/** Selects a tab by name, if this group has one. Says whether it did. */
function selectLabel(group: HTMLElement, label: string): boolean {
  const index = labelsOf(group).indexOf(label);
  if (index < 0) return false;
  const radio = radiosOf(group)[index];
  if (radio && !radio.checked) radio.checked = true;
  return true;
}

export function TabSync() {
  const pathname = usePathname();

  useEffect(() => {
    const groups = groupsOf();
    if (!groups.length) return;

    const recent = load();
    for (const group of groups) {
      // The most recent choice this group can honour wins, so a reader who
      // picked Yarn and then Android gets both, each where it applies.
      for (const label of recent) {
        if (selectLabel(group, label)) break;
      }
    }

    const onChange = (event: Event) => {
      const radio = event.target;
      if (!(radio instanceof HTMLInputElement) || !radio.classList.contains('tab-radio')) return;

      const group = radio.closest<HTMLElement>('.tabs');
      if (!group) return;

      const label = labelsOf(group)[radiosOf(group).indexOf(radio)];
      if (!label) return;

      // Switching a group above this one changes its height, which would slide
      // the tab the reader just clicked out from under their cursor. Measured
      // before and corrected after, so the clicked group stays put.
      const before = group.getBoundingClientRect().top;

      for (const other of groupsOf()) {
        if (other !== group) selectLabel(other, label);
      }

      const shift = group.getBoundingClientRect().top - before;
      if (shift) window.scrollBy({ top: shift, behavior: 'instant' });

      remember(label);
    };

    document.addEventListener('change', onChange);
    return () => document.removeEventListener('change', onChange);
  }, [pathname]);

  return null;
}
