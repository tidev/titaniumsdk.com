// The tag-chip example from the page. The only differences are the window it
// has to live in and `top`, which is 100 here so the band clears the status
// bar. The page used to say '90%', where five short chips fit on one line on
// a phone this wide so nothing of `horizontalWrap` showed, and it omitted the
// sizes, where the labels render as one dark block. Both are fixed on the
// page, so the chips here are what a reader copying it gets.
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
