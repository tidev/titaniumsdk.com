---
title: Media
description: Camera, photo library, audio, and video, and the permission each one needs first.
since: 13.4.0
---

Everything on this page needs permission before it works, and asking is your
job. A camera call with no permission does not throw: it fails quietly, or the
system dialog appears once and never again after the user says no.

## Ask first

Each capability has a matching pair of methods.

| Capability | Check | Ask |
| ---------- | ----- | --- |
| Camera | `Ti.Media.hasCameraPermissions()` | `requestCameraPermissions()` |
| Photo library | `hasPhotoGalleryPermissions()` | `requestPhotoGalleryPermissions()` |
| Microphone | `hasAudioRecorderPermissions()` | `requestAudioRecorderPermissions()` |
| Music library | `hasMusicLibraryPermissions()` | `requestMusicLibraryPermissions()` |

```js
function withCamera(done) {
  if (Ti.Media.hasCameraPermissions()) {
    done();
    return;
  }
  Ti.Media.requestCameraPermissions((e) => {
    if (e.success) {
      done();
    } else {
      Ti.API.warn('camera denied');
    }
  });
}
```

iOS also needs a usage string in `tiapp.xml`, or the app is rejected at review
and the dialog never appears:

```xml
<ios>
  <plist>
    <dict>
      <key>NSCameraUsageDescription</key>
      <string>Attach a photo to a note.</string>
      <key>NSPhotoLibraryUsageDescription</key>
      <string>Choose a photo to attach to a note.</string>
      <key>NSMicrophoneUsageDescription</key>
      <string>Record a voice note.</string>
    </dict>
  </plist>
</ios>
```

Write the real reason. "Required by the app" is the string reviewers reject.

## The camera

```js
Ti.Media.showCamera({
  mediaTypes: [Ti.Media.MEDIA_TYPE_PHOTO],
  saveToPhotoGallery: false,
  success(e) {
    const image = Ti.UI.createImageView({ image: e.media, width: 200, height: 200 });
    win.add(image);
  },
  cancel() {},
  error(e) {
    Ti.API.error(e.error);
  }
});
```

`e.media` is a `Blob`. Assign it straight to an `ImageView`, or write it to a
file with `Ti.Filesystem`.

`saveToPhotoGallery` defaults to false, so a photo your app took exists only in
that blob until you save it somewhere. Write it to
`applicationDataDirectory` if it needs to outlive the screen.

Close the camera with `Ti.Media.hideCamera()` when you dismiss it yourself.

<!-- Parked under TI-78: wanted, nobody can shoot it yet. Uncomment when the image exists.

:::missing 16:9

Two Android screens side by side, each cropped to a band rather than shown
whole: the camera open from the example above with the shutter visible, and
then the captured photo in the 200x200 ImageView the success callback adds.

:::

-->

## The photo library

```js
Ti.Media.openPhotoGallery({
  mediaTypes: [Ti.Media.MEDIA_TYPE_PHOTO],
  allowMultiple: false,
  success(e) {
    Ti.API.info(`picked ${e.media.length || 1} item`);
  },
  cancel() {}
});
```

With `allowMultiple: true` the success event carries an `images` array instead
of a single `media`, which is the shape change to handle rather than assume.

## Audio

Three objects, for three jobs.

| Object | For |
| ------ | --- |
| `Ti.Media.Sound` | Short effects, held in memory |
| `Ti.Media.AudioPlayer` | Long files and streams |
| `Ti.Media.AudioRecorder` | Recording |

```js
const sound = Ti.Media.createSound({ url: '/audio/tap.wav' });
sound.play();

const player = Ti.Media.createAudioPlayer({ url: 'https://example.com/talk.mp3' });
player.addEventListener('change', (e) => Ti.API.info(e.description));
player.start();
```

`Sound` loads the whole file, so it is for something short. `AudioPlayer`
buffers, which is what you want for anything longer than a notification chime.

For audio that continues when the app is backgrounded, set
`Ti.Media.audioSessionCategory` and declare background audio in `tiapp.xml`.
Both are required; either alone stops the audio at the home gesture.

## Video

```js
const video = Ti.Media.createVideoPlayer({
  url: 'https://example.com/clip.mp4',
  width: Ti.UI.FILL,
  height: 240,
  autoplay: true
});
win.add(video);
```

A `VideoPlayer` is a view, so it lays out like any other and defaults to
filling its parent. Release it when the window closes: it holds a decoder, and
leaving it alive costs memory that the platform will eventually take back by
killing the app.

## Next

[Location and maps](/docs/build/location) covers the other capability that
needs asking first.
