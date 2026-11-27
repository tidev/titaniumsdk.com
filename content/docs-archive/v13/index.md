---
title: Introduction
description: Build native iOS and Android apps with JavaScript.
---

Titanium is an open-source SDK for building native mobile apps in JavaScript.
You write one codebase; Titanium runs it against the real native platform APIs,
so the buttons, lists and navigation your app creates are the platform's own,
not a web view imitating them.

## How it works

Your JavaScript runs in a JavaScript engine on the device: V8 on Android,
JavaScriptCore on iOS. Calls like `Ti.UI.createButton()` create an actual
`android.widget.Button` or `UIButton` and hand you a reference to it. There is
no bridge to a browser and no DOM, which is why a Titanium list scrolls like a
native list.

That has two consequences worth knowing up front. Platform differences reach
your code rather than being hidden, because you are using the platform's own
widgets. And anything the SDK does not wrap can be reached with a
[native module](/docs/build/modules), written in Kotlin, Java, Swift or
Objective-C.

Beyond the core API you get [Alloy](/docs/alloy), an optional MVC framework with
XML views, TSS styling and data binding, and a command-line interface that
creates, builds, runs and packages projects.

## Start here

1. [Set up your environment](/docs/setup) installs the toolchain for your
   operating system. Budget an hour on a clean machine.
2. [Your first app](/docs/build/first-app) creates a project, runs it on a
   simulator, and installs it on a real phone.
3. [Project structure](/docs/build/project-structure) explains what the
   generated project contains and what `tiapp.xml` configures.

The [API reference](/docs/sdk) documents every type, method, property and
event in the SDK, for every released version. It is complete and searchable
today.

## About these guides

The guides are being rewritten. The structure is settled, and pages are landing
section by section. Anything not yet written is marked as such rather than
hidden, so you can see what is coming and what is already here.

Until a guide exists, the API reference is the authoritative source, and the
[Titanium SDK repository](https://github.com/tidev/titanium-sdk) is where the
behaviour is defined.

Titanium is maintained by TiDev, a non-profit, and built by the people who use
it. [Contribute](/contribute) if you want to help.
