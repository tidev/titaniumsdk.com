## Verify Titanium is Ready

```sh
ti info
```

![A macOS terminal running ti info. It opens with the Titanium CLI and SDK versions, then lists what it detected under headings: Operating System, with the name, version, architecture, CPU count and memory; Node.js, with the Node.js and npm versions; Titanium CLI, with the CLI version; and the start of the installed Titanium SDKs.](/docs/guides/ti-info-macos.png)

`ti info` lists everything it detected and any issues it found. A working setup
reports none.

Warnings are common and usually harmless: a component newer than the SDK
supports produces one, and so does a missing NDK. When something is wrong,
`ti info` names it and says what to do.
