const android = Ti.Platform.osname === 'android';
const root = Ti.UI.createWindow({ title: 'Notes', backgroundColor: '#fff' });
const nav = android ? null : Ti.UI.createNavigationWindow({ window: root });

const detail = Ti.UI.createWindow({ title: 'Shopping list', backgroundColor: '#fff' });
detail.add(Ti.UI.createLabel({ text: 'Milk, bread, coffee', top: 24 }));

// Titanium Android does not put an up caret on a child window by default, so
// the affordance this picture exists to show has to be asked for.
detail.addEventListener('open', () => {
  if (!android) {
    return;
  }
  const actionBar = detail.activity.actionBar;
  if (actionBar) {
    actionBar.displayHomeAsUp = true;
    actionBar.onHomeIconItemSelected = () => detail.close();
  }
});

// The detail screen is opened here rather than by a tap, so the shot lands on
// it with the back affordance showing and needs nobody driving the simulator.
root.addEventListener('open', () => {
  if (nav) {
    nav.openWindow(detail, { animated: false });
  } else {
    detail.open();
  }
});

(nav ?? root).open();
