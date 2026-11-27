---
title: Controllers
description: The $ namespace, arguments, opening a controller, and cleaning it up.
since: 13.4.0
---

A controller is the JavaScript beside a view. Everything with an `id` in the
XML is on `$`, and the file runs when the controller is created.

```js
// app/controllers/index.js
function doGo() {
  $.greeting.text = 'Going';
}

$.index.open();
```

`$.index` is the view's top-level element, named after the controller rather
than after anything in the XML. `$.greeting` is the label with `id="greeting"`.

`doGo` is reachable from the view as `onClick="doGo"` because it is a top-level
function in this file. A function assigned to a variable is not.

## Arguments

`Alloy.createController('detail', { id: 42 })` passes an object, and the
controller reads it from `$.args`:

```js
// app/controllers/detail.js
const noteId = $.args.id;

$.title.text = `Note ${noteId}`;
```

`$.args` is also what a `<Require>` passes down, so an embedded controller takes
arguments the same way.

Read `$.args` at the top of the file. It is the controller's signature, and
scattering the reads makes it invisible.

## Opening a window

A controller is not a window. `Alloy.createController` builds it; opening is
still your call:

```js
const detail = Alloy.createController('detail', { id: 42 });
detail.getView().open();
```

`getView()` returns the top-level element - the same object as `$.index` inside
that controller.

For a controller that owns its own window, export an `open`:

```js
// app/controllers/detail.js
$.index.open();

exports.open = () => $.index.open();
```

Anything assigned to `exports` in a controller is on the object
`createController` returned.

## Cleaning up

Alloy does not free a controller for you. Listeners you added to anything
outside the controller, timers, and geolocation updates all outlive the window
unless you remove them.

```js
function onLocation(e) {
  /* ... */
}

Ti.Geolocation.addEventListener('location', onLocation);

$.index.addEventListener('close', () => {
  Ti.Geolocation.removeEventListener('location', onLocation);
  $.destroy();
});
```

`$.destroy()` removes the bindings Alloy created between models and views. It
does not remove listeners you added, which is why both lines are there.

A controller created and dropped without either is the usual cause of a slow
leak in a long session.

## Where shared code goes

`app/lib/` is plain CommonJS, required by path:

```js
const format = require('/format');
```

The leading slash is against the app root, not the filesystem. Anything in
`lib` is available to every controller and to widgets.

`alloy.js` runs once, before the first controller, and is where
`Alloy.Globals` is set:

```js
// app/alloy.js
Alloy.Globals.apiRoot = 'https://example.com/api';
```

## Next

[Models and collections](/docs/alloy/models) covers the data layer and binding
it to a list.
