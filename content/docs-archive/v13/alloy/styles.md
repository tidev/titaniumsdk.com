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

## Next

[Controllers](/docs/alloy/controllers) is the third file.
