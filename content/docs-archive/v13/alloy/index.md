---
title: Alloy
description: "Titanium's MVC framework: XML views, TSS styles, JavaScript controllers, and Backbone models."
since: 13.4.0
---

Alloy splits a screen into three files: an XML view for structure, a TSS file
for style, and a JavaScript controller for behaviour. It compiles all three
into ordinary Titanium code before the build, so it is a layer over the API
rather than a different runtime, and anything you can do in Classic you can do
here.

It is a separate install:

```sh
npm i -g alloy
```

`alloy new` converts an existing Classic project in place, which is why
choosing Classic first costs nothing. See
[your first app](/docs/build/first-app) for that choice.

## What it gives you

**Separation.** A 400-line file that builds a screen becomes an XML file you
can read at a glance and a controller with only the behaviour in it.

**Styling by selector.** TSS applies properties by element type, class or id,
across the whole app or one screen, so a button style is written once.

**Compile-time platform code.** `OS_IOS` and `OS_ANDROID` are constants
replaced during compilation, so the branch not taken is removed from the build
rather than evaluated on the device.

**Data binding.** A Backbone collection can drive a `ListView` directly, so
adding a row is a model operation rather than a view operation.

## The pages

[Views](/docs/alloy/views) is the XML: elements, ids, classes, and how an
element becomes a `Ti.UI.create*` call.

[Styles and themes](/docs/alloy/styles) is TSS: selectors, precedence, platform
and form-factor queries, and themes.

[Controllers](/docs/alloy/controllers) is the JavaScript: the `$` namespace,
arguments, opening and closing, and cleaning up.

[Models and collections](/docs/alloy/models) is the data layer, its sync
adapters, and binding a collection to a list.

[Widgets](/docs/alloy/widgets) is how to package a piece of UI for reuse across
projects.

[Configuration](/docs/alloy/config) is `config.json`, `Alloy.CFG`, and the
compile-time constants.

## Where the files go

```
app/
  views/        index.xml
  styles/       app.tss, index.tss
  controllers/  index.js
  models/
  widgets/
  lib/          plain modules, required by path
  assets/       images, and semantic.colors.json
  themes/
  alloy.js      runs before the first controller
  config.json
```

`Resources/` is Alloy's output and is regenerated on every build. Do not edit
it, and do not commit it. See
[project structure](/docs/build/project-structure).
