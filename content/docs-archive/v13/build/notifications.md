---
title: Notifications
description: Local notifications, push notifications, and the Android channel you cannot skip.
since: 13.4.0
---

Two kinds, and they share almost nothing in Titanium. A **local** notification
is scheduled by the app on the device. A **push** notification arrives from a
server through APNs or FCM.

Both need the user's permission on both platforms. Android has required it
since Android 13.

## Local notifications

The APIs are platform-specific, so this is one of the places you write both
halves.

:::tabs

@tab iOS

```js
Ti.App.iOS.registerUserNotificationSettings({
  types: [
    Ti.App.iOS.USER_NOTIFICATION_TYPE_ALERT,
    Ti.App.iOS.USER_NOTIFICATION_TYPE_SOUND,
    Ti.App.iOS.USER_NOTIFICATION_TYPE_BADGE
  ]
});

Ti.App.iOS.scheduleLocalNotification({
  alertTitle: 'Standup',
  alertBody: 'Daily standup in five minutes',
  date: new Date(Date.now() + 5 * 60 * 1000)
});
```

`cancelLocalNotification` takes the identifier the schedule call returned;
`cancelAllLocalNotifications` clears the lot.

@tab Android

```js
const channel = Ti.Android.NotificationManager.createNotificationChannel({
  id: 'reminders',
  name: 'Reminders',
  importance: Ti.Android.IMPORTANCE_DEFAULT
});

const notification = Ti.Android.createNotification({
  contentTitle: 'Standup',
  contentText: 'Daily standup in five minutes',
  channelId: channel.id
});

Ti.Android.NotificationManager.notify(1, notification);
```

The integer passed to `notify` is the notification's id: notify again with the
same one and it replaces rather than stacks.

:::

> [!IMPORTANT]
> **Android needs a channel.** Since Android 8 a notification without a valid
> `channelId` is dropped by the system, with nothing in the log to say so. Create
> the channel once at startup - creating it again with the same id is a no-op.
>
> A channel's importance can only be lowered after it exists. The user owns it
> from then on, and a release that wants a channel to behave differently needs a
> new id.

## Push notifications

Registration is the same call on both platforms, and what you do with the token
is the same too: send it to your server, which is what actually sends
notifications.

```js
Ti.Network.registerForPushNotifications({
  success(e) {
    Ti.API.info(`device token ${e.deviceToken}`);
    // POST it to your own server here.
  },
  error(e) {
    Ti.API.error(`push registration failed: ${e.error}`);
  },
  callback(e) {
    // A notification arrived. `e.data` is the payload.
    Ti.API.info(e.data);
  }
});
```

`callback` fires when a notification is received **and** when one is tapped, so
if opening a screen is the response, check whether the app was in the
foreground first - otherwise a notification arriving while someone is using the
app navigates them away from what they were doing.

On iOS, ask for notification permission with
`registerUserNotificationSettings` before registering for push. On Android,
FCM needs `google-services.json` in the project and the `ti.playservices`
module; a build without it registers and never receives anything.

The token changes. It changes on reinstall, on restore to a new device, and at
the platform's discretion. Send it on every launch rather than once.

## Testing

A simulator cannot receive push notifications on iOS. An Android emulator with
Play Services can. Local notifications work on both.

The most common "push is broken" causes, in the order worth checking:

1. **The wrong environment.** A development APNs token is not valid against the
   production gateway, and the failure is silent.
2. **No permission.** Denied once, and the dialog never appears again. Reinstall
   or reset the setting.
3. **Missing channel on Android.** See above.
4. **The token is stale.** See above.

![An expanded notification in the Android shade, posted by an app called Hello. Its icon sits at the left, the title reads Standup and the body reads Daily standup in five minutes.](/docs/guides/notification-shade-android.png)

## Next

[Using modules](/docs/build/modules) covers adding capabilities the core SDK
does not have, which is what `ti.playservices` above is.
