---
title: Widgets
description: Packaging a view, its styles and its controller for reuse across projects.
since: 13.4.0
---

A widget is a controller with its own views, styles, assets and manifest,
packaged so it can be dropped into another project. It is the unit of reuse
above `<Require>`, which only reaches inside one app.

Use `<Require>` for a piece of this app used twice. Use a widget for a piece of
several apps.

## Making one

```sh
alloy generate widget com.example.rating
```

That writes:

```
app/widgets/com.example.rating/
  controllers/widget.js
  views/widget.xml
  styles/widget.tss
  assets/
  widget.json
```

`widget` is the default controller name, the way `index` is for an app. A
widget with one screen needs no other file.

`widget.json` is the manifest:

```json
{
  "id": "com.example.rating",
  "name": "rating",
  "version": "1.0.0",
  "platforms": "android,ios"
}
```

The id is reverse-DNS and is how the widget is addressed. It has to be unique
across everything the app includes.

## Declaring and using it

A widget in `app/widgets/` still has to be declared as a dependency in
`config.json`:

```json
{
  "dependencies": {
    "com.example.rating": "1.0.0"
  }
}
```

Then use it from a view:

```xml
<Alloy>
  <Window>
    <Widget src="com.example.rating" id="rating" score="4" />
  </Window>
</Alloy>
```

Attributes become `$.args` inside the widget, so `score` above is
`$.args.score`.

Or from a controller:

```js
const rating = Alloy.createWidget('com.example.rating', { score: 4 });
$.index.add(rating.getView());
```

## Talking to the app that contains it

A widget is deliberately isolated: its styles do not leak out, and the app's
`app.tss` does not reach in. That is the point, and it is also the thing people
fight.

Communication goes both ways through the controller:

```js
// inside the widget
exports.setScore = (n) => {
  $.stars.text = '*'.repeat(n);
};

$.trigger('changed', { score: 3 });
```

```js
// in the app
const rating = Alloy.createWidget('com.example.rating', {});
rating.setScore(4);
rating.on('changed', (e) => Ti.API.info(e.score));
```

Pass configuration in as arguments and report changes out as events. A widget
that reads `Alloy.Globals` is coupled to one app and is no longer reusable,
which defeats the exercise.

## Assets and styles

A widget's assets live in its own `assets/`, and it references them by a path
relative to itself. Its `styles/widget.tss` applies only inside it.

To let the containing app restyle a widget, take the values as arguments:

```xml
<Widget src="com.example.rating" id="rating" tint="#c00" />
```

That is more work than a global selector and it is the reason the widget stays
portable.

## Sharing one

A widget is a directory. Copy it, or make it an npm package and let
`app/widgets` be populated by a build step - Alloy reads what is there, and
does not care how it arrived.

There is no widget registry.

## Next

[Configuration](/docs/alloy/config) covers `config.json`, which is where the
dependency above was declared.
