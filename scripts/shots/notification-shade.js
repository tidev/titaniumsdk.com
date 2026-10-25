// The notification itself is the example from the page, unchanged.
const channel = Ti.Android.NotificationManager.createNotificationChannel({
  id: 'reminders',
  name: 'Reminders',
  importance: Ti.Android.IMPORTANCE_DEFAULT,
});

const notification = Ti.Android.createNotification({
  contentTitle: 'Standup',
  contentText: 'Daily standup in five minutes',
  channelId: channel.id,
});

Ti.Android.NotificationManager.notify(1, notification);

// The picture is of the shade, not of this window, but the harness waits for
// a window to lay out before it does anything, so there has to be one.
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.open();
