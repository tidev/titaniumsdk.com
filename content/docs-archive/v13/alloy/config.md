---
title: Configuration
description: config.json, Alloy.CFG, and the constants the compiler replaces.
since: 13.4.0
---

`app/config.json` carries settings your code reads, and a few that direct the
compiler. `ti create --alloy` writes it with every section present and empty:

```json
{
  "global": {},
  "env:development": {},
  "env:test": {},
  "env:production": {},
  "os:android": {},
  "os:ios": {},
  "dependencies": {},
  "backbone": "1.4.0"
}
```

## Reading it

Everything outside `dependencies` and `backbone` is merged into `Alloy.CFG`:

```json
{
  "global": { "apiRoot": "https://example.com/api", "pageSize": 20 },
  "env:production": { "apiRoot": "https://api.example.com" },
  "os:android": { "pageSize": 10 }
}
```

```js
Ti.API.info(Alloy.CFG.apiRoot);
```

The sections merge in order: `global`, then the matching `os:`, then the
matching `env:`. A key in a later section replaces the earlier one, so the
production build above gets the production `apiRoot` and everything else from
`global`.

`env:` follows the build's deploy type, not the target: a simulator build is
`development`, `--deploy-type production` is `production`.

> [!WARNING]
> `config.json` is compiled into the app, and an app package can be unzipped.
> An API root belongs here; an API key does not. Anything secret goes on a
> server you control.

## Compile-time constants

These are not read from `config.json`. The compiler replaces them with literals
and then removes the dead branch, so the code in the branch not taken is not in
the build at all:

| Constant                     | True when                                     |
| ---------------------------- | --------------------------------------------- |
| `OS_IOS`, `OS_ANDROID`       | Building for that platform                    |
| `ENV_DEV`, `ENV_DEVELOPMENT` | Deploy type is development                    |
| `ENV_TEST`                   | Deploy type is test                           |
| `ENV_PROD`, `ENV_PRODUCTION` | Deploy type is production                     |
| `DIST_ADHOC`                 | Target is `dist-adhoc`                        |
| `DIST_STORE`                 | Target is `dist-appstore` or `dist-playstore` |

```js
if (OS_IOS) {
  // not present in an Android build
}

if (ENV_PRODUCTION) {
  Ti.API.info = () => {};
}
```

Because the substitution happens before the code is bundled, `OS_IOS` cannot be
read as a variable, passed around, or checked with `typeof`. It only works as a
condition written out in full.

## Directing the compiler

`theme` selects a theme directory (see
[styles and themes](/docs/alloy/styles)):

```json
{ "global": { "theme": "dark" } }
```

`dependencies` lists widgets and their versions, and a widget in
`app/widgets/` that is not listed here is not compiled in - which is the usual
reason a `<Widget>` element renders nothing.

`backbone` pins the Backbone version Alloy bundles.

## alloy.jmk

`app/alloy.jmk` is a build hook file, for work that has to happen around
compilation - copying a file in, rewriting something generated:

```js
task('post:compile', (event, logger) => {
  logger.info(`compiled ${event.dir.project}`);
});
```

Tasks are `pre:load`, `post:load`, `pre:compile`, `post:compile`. Use it
sparingly: it runs on every build and a slow task is felt on every save.

## Next

[Distributing apps](/docs/distribute) covers signing and shipping what you have
built.
