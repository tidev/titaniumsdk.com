---
title: Views
description: The XML that becomes your view hierarchy, and the attributes that control it.
since: 13.4.0
---

An Alloy view is XML. Every element is a `Ti.UI.create*` call, and nesting is
`add()`.

```xml
<Alloy>
  <Window class="container">
    <Label id="greeting">Hello</Label>
    <Button id="go" onClick="doGo">Continue</Button>
  </Window>
</Alloy>
```

That compiles to `Ti.UI.createWindow`, `Ti.UI.createLabel` and
`Ti.UI.createButton`, with the label and button added to the window.

Every view is wrapped in `<Alloy>`, which is not itself a view.

## Element names

An element name is the type without the `Ti.UI.` prefix: `<Label>` is
`Ti.UI.createLabel`, `<ListView>` is `Ti.UI.createListView`.

For anything outside `Ti.UI`, name the namespace with `ns`:

```xml
<Module id="player" ns="Ti.Media" method="createVideoPlayer" />
```

For a native module, name the module and Alloy requires it for you:

```xml
<Module id="map" module="ti.map" method="createView" />
```

## Text content is the obvious property

The text between the tags sets the property that element treats as its text:
`text` for a `Label`, `title` for a `Button`. Attributes set everything else:

```xml
<Label id="greeting" top="20" color="#333">Hello</Label>
```

Attribute values are strings unless they look like a number or a boolean, so
`top="20"` is `20` and `visible="false"` is `false`. For anything structured,
set it in TSS or in the controller rather than trying to spell an object in an
attribute.

## id and class

`id` makes the element reachable in the controller as `$.<id>`, and selectable
in TSS as `#<id>`. `class` is for TSS only, and takes a space-separated list.

The app `alloy new` generates uses both, across its three files:

```xml title="app/views/index.xml"
<Alloy>
  <Window class="container">
    <Label id="label" onClick="doClick">Hello, World</Label>
  </Window>
</Alloy>
```

```tss title="app/styles/index.tss"
".container": {
  backgroundColor: "white"
}

"Label": {
  width: Ti.UI.SIZE,
  height: Ti.UI.SIZE,
  color: "#000"
}

"#label": {
  font: {
    fontSize: 12
  }
}
```

```js title="app/controllers/index.js"
function doClick(e) {
  alert($.label.text);
}

$.index.open();
```

`id="label"` is `"#label"` in the style and `$.label` in the controller.
`class="container"` is `".container"` in the style and nothing in the
controller. `$.index` has no `id` in the view at all: the top-level element
takes the view's file name unless you give it one.

```xml
<View class="row highlighted" id="first" />
```

An element with no `id` is created and added, and you have no handle to it.
That is fine for a spacer and a problem for anything you need to change.

## Conditional elements

`platform` and `formFactor` filter at compile time, so the element is not in
the build for the platform that did not match:

```xml
<Alloy>
  <Window>
    <Button platform="android" title="Android only" />
    <Button platform="ios" title="iOS only" />
    <Label formFactor="tablet">Wide layout</Label>
  </Window>
</Alloy>
```

`platform` accepts a comma-separated list, and `!` negates: `platform="!ios"`.

Prefer this to a runtime check when the difference is structural. The code for
the other platform never ships.

## Requiring another controller

`<Require>` embeds one controller inside another, which is how a view is
composed rather than duplicated:

```xml
<Alloy>
  <Window>
    <Require src="header" id="header" />
    <Label>Body</Label>
  </Window>
</Alloy>
```

`$.header` in the controller is then that controller instance, not a view, so
its own exported functions are reachable.

For a widget, use `<Widget src="com.example.thing" id="thing" />`.

## Alloy-specific elements

A few elements have no `Ti.UI` equivalent and exist for the compiler:

| Element        | What it does                                  |
| -------------- | --------------------------------------------- |
| `<Alloy>`      | The root. Required                            |
| `<Require>`    | Embeds another controller                     |
| `<Widget>`     | Embeds a widget                               |
| `<Module>`     | An element from a module or another namespace |
| `<Collection>` | Binds a model collection into the view        |

## Next

[Styles and themes](/docs/alloy/styles) is where the properties belong once
there is more than one of them.
