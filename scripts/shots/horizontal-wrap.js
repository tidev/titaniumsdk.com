// The tag-chip example from the page. The container is narrowed to 240 so the
// five chips wrap onto two rows: at the page's own '90%' they fit on one line
// on a phone this wide, and the picture would show nothing of `horizontalWrap`.
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });

const tags = Ti.UI.createView({
  layout: 'horizontal',
  top: 100,
  width: 240,
  height: Ti.UI.SIZE,
});

for (const name of ['alloy', 'android', 'ios', 'layout', 'listview']) {
  tags.add(Ti.UI.createLabel({
    text: name,
    // Without these a label in a horizontal container does not size to its
    // text on iOS: the five chips render as one dark block.
    width: Ti.UI.SIZE,
    height: Ti.UI.SIZE,
    left: 4,
    right: 4,
    top: 4,
    bottom: 4,
    color: '#fff',
    backgroundColor: '#4a4a4a'
  }));
}

win.add(tags);
win.open();
