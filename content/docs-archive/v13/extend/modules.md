---
title: Native modules
description: Writing a module when the SDK does not expose what you need.
since: 13.4.0
---

A native module wraps platform code and exposes it to JavaScript. Write one
when the SDK has no API for something the platform does, or when you need a
native library that has no JavaScript equivalent.

Before you do, check the [modules directory](/modules) - somebody may already
have. And check [Hyperloop](/docs/extend/hyperloop), which reaches native APIs
directly without a module at all.

## Create one

```sh
ti create --type module --id com.example.thing --name thing --platforms android --workspace-dir .
```

`--platforms` takes `android`, `ios` or both, and each gets its own directory
with its own build.

```
thing/
  android/
    manifest              id, version, and what it needs
    timodule.xml          module-level tiapp settings
    build.gradle
    src/com/example/thing/
      ThingModule.java    the module object
      ExampleProxy.java   a proxy
    lib/                  third-party jars
    platform/             files copied into the app build
    assets/
  documentation/index.md
  example/app.js          runs against the built module
  LICENSE
```

## The manifest

```
version: 1.0.0
apiversion: 4
architectures: arm64-v8a armeabi-v7a x86 x86_64
name: thing
moduleid: com.example.thing
guid: 1bf6ca03-c384-44f1-8bdc-f06454872771
platform: android
minsdk: 13.4.1.GA
```

`minsdk` is the oldest Titanium SDK the module supports, and the build refuses
when a project's SDK is older. `apiversion` is the module API generation - 4 on
Android, 2 on iOS for 13.4.

Bump `version` on every release. It is what a project pins against.

## What the code looks like

Titanium's Android bridge is Kroll, driven by annotations:

```java
@Kroll.module(name = "Thing", id = "com.example.thing")
public class ThingModule extends KrollModule {

    @Kroll.method
    public String greet(String name) {
        return "Hello " + name;
    }

    @Kroll.constant
    public static final String VERSION = "1.0.0";
}
```

`@Kroll.method` exposes a method, `@Kroll.getProperty` and
`@Kroll.setProperty` make a property, and `@Kroll.constant` makes a constant.
A `KrollProxy` subclass becomes an object your JavaScript can create.

On iOS the equivalent is an Objective-C class extending `TiModule`, where
methods are exposed by naming convention rather than annotation.

## Build and test

Build from the module directory:

```sh
ti build --platform android --build-only
```

That produces a distributable zip. `example/app.js` is a real app the module
build runs, which is the fastest way to exercise what you just wrote.

Install it into a project by unzipping it there - see
[using modules](/docs/build/modules) for the layout and for declaring it in
`tiapp.xml`.

## Things that catch people

**`apiversion` and `minsdk` are promises.** A module built against an old SDK
may link against internals that moved. When a project fails at link time with a
message naming nothing, a stale module is the first suspect.

**Architectures cost size.** Every one in `architectures` is compiled and
shipped. Drop the ones you do not need.

**The bridge is the slow part.** A call from JavaScript into native crosses
Kroll, and a loop that crosses per iteration is where the time goes. Pass a
collection and return a collection rather than calling per item.

**Threading is yours to get right.** A long native call blocks the JavaScript
thread. Do the work on a background thread and call back.

## Next

[Hyperloop](/docs/extend/hyperloop) does much of this without a module.
