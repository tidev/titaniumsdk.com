'use client';

import * as RadixSelect from '@radix-ui/react-select';

/**
 * A dropdown that renders in the page rather than by the browser.
 *
 * This was a native `<select>`, which is the better control on almost every
 * count — it needs no JavaScript, and on a phone it opens the OS picker rather
 * than a listbox pretending to be one. What it cannot do is be positioned by
 * us: its popup is drawn by the browser outside the document, so in Chrome's
 * device emulation it anchors to the real viewport instead of the emulated one
 * and lands somewhere else entirely.
 *
 * Radix puts the menu in a portal and positions it itself, so what you see in
 * device emulation is what ships. The costs, for whoever reads this next:
 *
 *   - It needs JavaScript. The trigger renders server-side but does nothing
 *     until hydration, where a native select was usable immediately.
 *   - Phones get this listbox instead of the OS picker.
 *
 * Both were accepted deliberately. If a third menu ever needs multi-select or
 * a search field, this is also the component that can grow one.
 */
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="text-xs text-text-subtle">
        {label}
      </span>

      <RadixSelect.Root value={value} onValueChange={(next) => onChange(next as T)}>
        {/* The trigger is a button, so it cannot be wrapped in a label the way
            the native control was — the name comes from `aria-label` instead. */}
        <RadixSelect.Trigger
          aria-label={label}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised py-2 pr-2 pl-2.5 text-sm text-text transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {/* The current label is passed in rather than left to Radix to look
              up from its items. Radix resolves it on the client, so the trigger
              renders empty on the server and the three menus are blank boxes
              until hydration — which the native control it replaced never was. */}
          <RadixSelect.Value>{options.find((o) => o.value === value)?.label}</RadixSelect.Value>
          <RadixSelect.Icon asChild>
            <svg
              viewBox="0 0 16 16"
              aria-hidden
              className="size-3 shrink-0 fill-none stroke-current stroke-2 text-text-subtle"
            >
              <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            // Never narrower than the trigger it belongs to, so the menu reads
            // as attached to it rather than as a floating panel.
            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface-raised shadow-lg"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm text-text-muted outline-none select-none data-[highlighted]:bg-surface data-[highlighted]:text-text data-[state=checked]:text-text"
                >
                  {/* Fixed-width rail so the labels line up whether or not a
                      row is the checked one. */}
                  <span className="flex w-3.5 justify-center">
                    <RadixSelect.ItemIndicator>
                      <svg
                        viewBox="0 0 16 16"
                        aria-hidden
                        className="size-3.5 fill-none stroke-current stroke-2 text-link"
                      >
                        <path
                          d="m3 8.5 3.5 3.5L13 5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </RadixSelect.ItemIndicator>
                  </span>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </span>
  );
}
