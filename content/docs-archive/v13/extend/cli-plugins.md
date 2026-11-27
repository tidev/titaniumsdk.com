---
title: CLI plugins
description: Hooking the build to change what happens around it.
since: 13.4.0
---

A CLI plugin is JavaScript the CLI loads and lets subscribe to build events. It
changes the build, not the app: generating a file before compilation, injecting
a value, uploading an artifact afterwards.

Alloy is one. `plugins/ti.alloy/hooks/alloy.js` in an Alloy project is a hook
that compiles `app/` into `Resources/` before every build - which is why an
Alloy project needs `ti.alloy` in `tiapp.xml` and is otherwise a Classic
project.

## The shape of one

```js
// plugins/ti.example/hooks/stamp.js
exports.cliVersion = '>=3.X';
exports.version = '1.0.0';

exports.init = (logger, config, cli, appc) => {
  cli.on('build.pre.compile', {
    priority: 1000,
    post(builder, done) {
      logger.info(`building ${builder.tiapp.name} ${builder.tiapp.version}`);
      done();
    },
  });
};
```

`init` is called once with the logger, the CLI config, the CLI itself, and the
`node-appc` helpers. `cliVersion` is a range the plugin needs, and a plugin
whose range does not match is skipped rather than crashing the build.

A hook subscribes with `pre` or `post`, and **must call `done()`** - the build
waits. A hook that forgets it hangs with no error, which is the failure mode to
recognise.

`priority` orders hooks against each other; the default is 1000.

## Where they are found

| Location                        | Scope        |
| ------------------------------- | ------------ |
| `<project>/plugins/<id>/hooks/` | That project |
| `paths.hooks` in CLI config     | That machine |
| The SDK's own `cli/hooks/`      | Everything   |

Declare a project plugin in `tiapp.xml`:

```xml
<plugins>
  <plugin version="1.0">ti.example</plugin>
</plugins>
```

Add a machine-wide path with
[CLI configuration](/docs/reference/config):

```sh
ti config paths.hooks --append ~/titanium-hooks
```

A machine-wide hook changes builds for every project on that machine and for
nobody else, so a build stops being reproducible from the repository alone. Use
the project location unless you specifically want the opposite.

## Useful events

| Event                 | When                                          |
| --------------------- | --------------------------------------------- |
| `build.pre.construct` | Before the builder is set up                  |
| `build.pre.compile`   | Before compilation. Where generated code goes |
| `build.post.compile`  | After compilation, before packaging           |
| `build.finalize`      | The build is done                             |
| `cli:pre-execute`     | Before any command runs                       |
| `cli:post-execute`    | After it finishes                             |

The build events carry the `builder`, which is where `tiapp`, the project
directory and the resolved options are. Read it rather than re-parsing
`tiapp.xml`.

Platform builders emit their own more specific events too. `--debug` prints the
events as they fire, which is the practical way to find the one you want.

## Alloy's own hook file

For work tied to Alloy's compile rather than the CLI's build, `app/alloy.jmk`
is simpler and does not need a plugin. See
[Alloy configuration](/docs/alloy/config).

## Keep them cheap

A hook runs on every build, including the rebuild you do twenty times an hour.
Anything slow belongs behind a check that skips it when there is nothing to do,
or in a `production`-only branch.

## Next

Back to [building apps](/docs/build), or the
[CLI reference](/docs/reference/cli) for the commands these hook into.
