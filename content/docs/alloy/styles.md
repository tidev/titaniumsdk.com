---
title: Styles & themes
description: TSS selectors, the order they apply in, and how a theme replaces them.
since: 13.4.0
---

TSS is JSON-ish: a selector, then the properties to apply. It looks like CSS
and matches like CSS, but the property names are Titanium's.

```tss
"Window": {
  backgroundColor: "white"
}

".container": {
  layout: "vertical",
  top: 20
}

"#greeting": {
  color: "#333",
  font: { fontSize: 18, fontWeight: "bold" }
}
```

Three selector kinds: an element type by name, a `.class`, and an `#id`.

## Which file applies

`app/styles/app.tss` applies to every view in the app. `app/styles/<name>.tss`
applies to the view of the same name, and nothing else.

Put the shared look in `app.tss` - the font, the palette, what a `Button` looks
like - and keep per-screen files for what is genuinely local.

## Precedence

Later and more specific wins. From weakest to strongest:

1. `app.tss` element selector
2. `app.tss` class
3. `app.tss` id
4. The view's own `.tss`, in the same three-step order
5. Attributes set in the XML
6. Properties set in the controller

So an attribute in the view beats every stylesheet, and the controller beats
everything. That order is what makes a value that "will not change" almost
always an attribute someone left in the XML.

Within one file, a later rule of the same specificity wins.

## Queries

A selector can be narrowed by platform, form factor, or a global flag, and
these are resolved at compile time where they can be:

```tss
"Button[platform=android]": {
  backgroundColor: "#2f6f4f"
}

"Button[platform=ios]": {
  color: "#0b6bcb"
}

"#hero[formFactor=tablet]": {
  height: 400
}
```

Queries combine, space separated:

```tss
"Label[platform=ios formFactor=handheld]": {
  font: { fontSize: 14 }
}
```

`if` takes an `Alloy.Globals` value, which is how a runtime condition reaches a
stylesheet:

```tss
"#banner[if=Alloy.Globals.isPromo]": {
  visible: true
}
```

Set `Alloy.Globals.isPromo` in `alloy.js`, before any controller runs.

## Themes

A theme is a directory under `app/themes/<name>/` that shadows files by the
same path. A theme's `styles/app.tss` merges over the base one, and a theme's
assets replace assets of the same name.

```
app/themes/dark/styles/app.tss
app/themes/dark/assets/images/logo.png
```

Select it in `config.json`:

```json
{
  "global": { "theme": "dark" }
}
```

One theme at a time, chosen at build time. A theme is not a runtime switch, so
it is the wrong tool for a dark mode the user toggles - use
`semantic.colors.json` for that, which both platforms resolve themselves.

## Classes at runtime

```js
$.addClass($.row, 'selected');
$.removeClass($.row, 'selected');
$.resetClass($.row, 'row');
```

`resetClass` replaces the whole class list rather than adding to it, which is
what to use when several states are mutually exclusive.

## PurgeTSS

[PurgeTSS](https://purgetss.com) generates TSS from the utility classes used in
your Alloy views and controllers. It is a separate command-line tool that also
provides fonts, animation utilities, and asset generators for Titanium projects.

Its features include:

- Utility classes for colors, spacing, typography, layout, and other Titanium
  properties.
- XML and controller scanning that writes `app/styles/app.tss` with the classes
  your app uses. Your original global styles are preserved in `_app.tss`.
- Custom classes through `purgetss/config.cjs` and
  [arbitrary values](https://purgetss.com/docs/customization/arbitrary-values/)
  in XML views.
- [Icon fonts](https://purgetss.com/docs/customization/icon-fonts-libraries/)
  from Font Awesome, Material Icons, Material Symbols, and Framework7 Icons for
  buttons and labels.
- [Custom fonts](https://purgetss.com/docs/customization/custom-fonts/) through
  `build-fonts`, which generates `purgetss/styles/fonts.tss` with class
  definitions and font-family selectors for Alloy projects.
- The `shades` command for generating a color palette from a hex value.
- The [UI module](https://purgetss.com/docs/purgetss-ui/introduction/) for 2D
  transforms, draggable views with collision detection, sequential animations,
  and position utilities.
- A [grid system](https://purgetss.com/docs/grid-system/) for aligning and
  distributing views in rows and columns.

### Set up an Alloy project

Install the standalone CLI, then run it from your Alloy project root:

```sh
npm install -g purgetss
purgetss
```

The first run backs up `app/styles/app.tss` to `app/styles/_app.tss`, creates
the PurgeTSS configuration and style catalog, and adds a compile hook in
`app/alloy.jmk`. Keep custom global styles in `_app.tss`; `app.tss` is generated
again on subsequent runs.

The hook runs `purgetss` directly when Alloy compiles your app, using the
executable found in the shell's `PATH`. Its default synchronous mode passes
diagnostics through to the terminal and stops compilation if PurgeTSS fails.
See the [installation guide](https://purgetss.com/docs/installation/) for setup
details.

### How the Alloy command runs

Alloy 3.0.1 also provides this shortcut:

```sh
alloy purgetss
```

It starts the `purgetss` executable found in `PATH`. Alloy does not bundle or
pin a PurgeTSS package, so installing Alloy alone does not install PurgeTSS.
In a normal global installation, updating PurgeTSS updates the executable this
shortcut and the compile hook use. A project-local installation is selected
only when its executable directory takes precedence in `PATH`.

The shortcut has its own older command list and does not forward all PurgeTSS
commands or options. Use `purgetss` directly for its full interface, including
commands such as `watch` and `icon-library`:

```sh
purgetss -h
purgetss icon-library --vendor fa --module
purgetss build-fonts --module
```

`alloy purgetss -v` reports Alloy's version because `-v` is an Alloy option.
Check the PurgeTSS version with:

```sh
purgetss -V
```

The [PurgeTSS command reference](https://purgetss.com/docs/commands/) documents
its available commands and options. Some standalone commands also support
Classic projects; the utility-class generation and compile hook described
here apply to Alloy.

## Next

[Controllers](/docs/alloy/controllers) is the third file.
