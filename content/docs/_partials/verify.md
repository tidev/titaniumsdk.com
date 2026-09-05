## Check the whole thing

```sh
ti info
```

This is the command worth remembering. It reports every toolchain Titanium can
find, the versions of each, and — at the end — a list of problems.

A working setup ends with no errors. Warnings are common and usually harmless:
a component newer than the SDK declares support for produces one, and so does a
missing optional piece like the NDK.

If something is missing, `ti info` names it and says what to do. Read that
before searching, because the message is generated from what is actually on your
machine.
