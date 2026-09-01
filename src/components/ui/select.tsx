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
  hideLabel,
  icon,
  options,
  value,
  onChange,
}: {
  /** Always required: it names the control, drawn or not. */
  label: string;
  /**
   * Drops the visible label while keeping the accessible one.
   *
   * For a menu whose options already say what it selects — "All modules",
   * "Official", "Community" — where a word in front of it only costs width.
   */
  hideLabel?: boolean;
  /**
   * Drawn in place of the label text, for a dimension with a settled glyph.
   *
   * The accessible name still comes from `label`, so this is decoration and
   * the icon itself is hidden from assistive tech.
   */
  icon?: React.ReactNode;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon ? (
        <span aria-hidden className="text-text-subtle">
          {icon}
        </span>
      ) : (
        !hideLabel && (
          <span aria-hidden className="text-xs text-text-subtle">
            {label}
          </span>
        )
      )}

      <RadixSelect.Root value={value} onValueChange={(next) => onChange(next as T)}>
        {/* Every option's label, stacked in one grid cell and hidden, with the
            trigger in the same cell. The cell is as wide as the widest label,
            so choosing a shorter one cannot shrink the control — which it did,
            and the filter row reflowed onto two lines when you picked Android.

            Rendering the labels rather than measuring them in `ch` keeps this
            right for any font: the browser does the measuring. */}
        <span className="inline-grid">
          <span aria-hidden className="invisible col-start-1 row-start-1 grid">
            {options.map((option) => (
              <span
                key={option.value}
                // Mirrors the trigger's box exactly, transparent border
                // included, so the reserved width is the real width.
                className="col-start-1 row-start-1 inline-flex items-center gap-2 border border-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap"
              >
                {option.label}
                <span className="size-3 shrink-0" />
              </span>
            ))}
          </span>

          {/* The trigger is a button, so it cannot be wrapped in a label the way
              the native control was — the name comes from `aria-label` instead. */}
          <RadixSelect.Trigger
            aria-label={label}
            className="col-start-1 row-start-1 inline-flex w-full items-center gap-2 rounded-md border border-border bg-field py-2 pr-2 pl-2.5 text-sm text-text transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {/* The current label is passed in rather than left to Radix to look
              up from its items. Radix resolves it on the client, so the trigger
              renders empty on the server and the three menus are blank boxes
              until hydration — which the native control it replaced never was. */}
            <RadixSelect.Value>{options.find((o) => o.value === value)?.label}</RadixSelect.Value>
            {/* `ml-auto` so the chevron sits at the right edge whatever the
                selected label's length, now that the box no longer hugs it. */}
            <RadixSelect.Icon asChild>
              <svg
                viewBox="0 0 16 16"
                aria-hidden
                className="ml-auto size-3 shrink-0 fill-none stroke-current stroke-2 text-text-subtle"
              >
                <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </RadixSelect.Icon>
          </RadixSelect.Trigger>
        </span>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            // Never narrower than the trigger it belongs to, so the menu reads
            // as attached to it rather than as a floating panel.
            // The menu is raised, not recessed — it sits above the page rather than
            // being typed into — but on `surface` rather than `surface-raised`,
            // which is light enough to glare against the page in dark mode.
            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface shadow-lg"
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
