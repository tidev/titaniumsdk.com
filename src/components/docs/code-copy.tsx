'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Adds a copy button to every code block in rendered prose (TI-10).
 *
 * ## Why it enhances the DOM instead of rendering buttons
 *
 * Prose arrives as an HTML string — `renderMarkdown` produces it and `Prose`
 * writes it with `dangerouslySetInnerHTML` — so there is no React tree to hang
 * a button off. The alternatives were to emit button markup inside that string,
 * which would ship a dead control to anyone without JavaScript, or to portal
 * into every `<pre>`, which costs a component per block on a page that has
 * twenty-eight of them.
 *
 * Enhancing after mount means no-JavaScript readers see exactly what they saw
 * before: selectable code, no button that does nothing.
 *
 * Mounted once in the root layout. It re-runs on navigation because the pages
 * that carry prose are reached by client-side navigation, where nothing
 * remounts on its own.
 */

const COPIED_FOR = 2000;

export function CodeCopy() {
  const pathname = usePathname();

  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLPreElement>('.prose-docs pre');
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const pre of blocks) {
      if (pre.dataset.copyReady) continue;
      pre.dataset.copyReady = 'true';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-copy';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy code');

      button.addEventListener('click', async () => {
        // `innerText` rather than `textContent`: Shiki wraps each line in its
        // own element, and textContent would run them together without the
        // newlines that make the copied code valid.
        const code = pre.querySelector('code')?.innerText ?? pre.innerText;
        try {
          await navigator.clipboard.writeText(code.replace(/\n$/, ''));
        } catch {
          // No clipboard on an insecure origin, and permission can be refused.
          // The code is on screen either way, so saying nothing beats an error
          // the reader cannot act on.
          return;
        }
        button.textContent = 'Copied';
        button.setAttribute('aria-label', 'Copied');
        timers.push(
          setTimeout(() => {
            button.textContent = 'Copy';
            button.setAttribute('aria-label', 'Copy code');
          }, COPIED_FOR)
        );
      });

      // The button is positioned against this wrapper rather than the `<pre>`,
      // which scrolls: anchored to a scrolling box it would slide out of view
      // with the code.
      const shell = document.createElement('div');
      shell.className = 'code-block';
      pre.replaceWith(shell);
      shell.append(pre, button);
    }

    return () => timers.forEach(clearTimeout);
  }, [pathname]);

  return null;
}
