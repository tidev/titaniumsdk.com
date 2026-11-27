---
title: Networking & remote data
description: HTTPClient, handling failure, and getting files up and down.
since: 13.4.0
---

`Ti.Network.HTTPClient` is the HTTP client. It is shaped like
`XMLHttpRequest` - `open`, then `send`, with callbacks - because that is what it
was modelled on, not because there is a browser anywhere.

```js
const client = Ti.Network.createHTTPClient({
  onload() {
    const body = JSON.parse(this.responseText);
    Ti.API.info(`${body.length} releases`);
  },
  onerror(e) {
    Ti.API.error(`request failed: ${e.error}`);
  },
  timeout: 10000
});

client.open('GET', 'https://titaniumsdk.com/registry/v1/releases');
client.send();
```

`onload` and `onerror` are called with the client as `this`, which is where
`responseText`, `status` and the headers live.

**Set a `timeout`.** Without one a request on a dropped connection hangs until
the platform gives up, which is measured in minutes on a mobile network.

## Reading the response

| Property | What you get |
| -------- | ------------ |
| `responseText` | The body as a string |
| `responseData` | The body as a `Blob`, for binary |
| `responseXML` | A parsed document, for XML |
| `status` | The HTTP status code |
| `getResponseHeader(name)` | One header |

There is no `responseJSON`. Parse `responseText` yourself, and do it inside a
`try` - a proxy or a captive portal will hand you an HTML error page with a 200
on it, and `JSON.parse` throwing inside `onload` is an unhandled exception.

```js
onload() {
  let body;
  try {
    body = JSON.parse(this.responseText);
  } catch {
    Ti.API.error('expected JSON, got something else');
    return;
  }
  Ti.API.info(body);
}
```

## onerror does not mean "the server said no"

`onerror` fires when the request could not be completed: no route, DNS failure,
timeout, TLS rejected. **A 404 or a 500 is a successful request** and arrives
in `onload`. Check `status` there:

```js
onload() {
  if (this.status >= 400) {
    Ti.API.error(`server said ${this.status}`);
    return;
  }
  // ...
}
```

Getting this backwards is why an app shows a spinner forever when the API
returns 503.

## Sending

```js
const client = Ti.Network.createHTTPClient({ onload() { /* ... */ } });
client.open('POST', 'https://example.com/notes');
client.setRequestHeader('Content-Type', 'application/json');
client.send(JSON.stringify({ body: 'A note' }));
```

`setRequestHeader` goes **after** `open` and before `send`. Called before
`open` it is discarded, silently.

Pass a plain object to `send` instead and it is encoded as a form post. Pass a
dictionary containing a file and it becomes a multipart upload.

## Files

Set `file` on the client and the response is written straight to disk rather
than held in memory, which is how to download something larger than you want
resident:

```js
const target = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'sdk.zip');

const client = Ti.Network.createHTTPClient({
  onload() { Ti.API.info(`saved ${target.size} bytes`); },
  onerror(e) { Ti.API.error(e.error); },
  timeout: 60000
});
client.file = target;
client.open('GET', 'https://example.com/sdk.zip');
client.send();
```

`ondatastream` reports progress as a `progress` value from 0 to 1, which is
what to wire a progress bar to. `onsendstream` does the same for uploads. Both
must be set **before** `open`, and `progress` is
`Ti.Network.PROGRESS_UNKNOWN` when the size is not known ahead of time, which
is the case for a chunked response.

## Is there a connection

```js
if (!Ti.Network.online) {
  // ...
}
```

`Ti.Network.online` is whether the device has a route, not whether your server
is reachable. Treat it as a way to explain a failure rather than a way to
predict one: send the request, and use the flag to say "you appear to be
offline" when it fails.

`networkType` distinguishes wifi from mobile, which is worth checking before a
large download.

## Certificates

`validatesSecureCertificate` defaults to true against a release build and false
against a simulator or emulator build, so a self-signed certificate works in
development and fails in production. That is deliberate. Do not set it to false
to make a release work - pin properly with `securityManager` or fix the
certificate.

## Next

[Media](/docs/build/media) covers the camera, the photo library, and playing
audio and video.
