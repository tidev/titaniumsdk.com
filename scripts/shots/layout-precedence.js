const win = Ti.UI.createWindow({ backgroundColor: '#fff' });

function pane(title, props, side) {
  const outer = Ti.UI.createView({
    width: '50%',
    top: 100,
    height: 290,
    backgroundColor: '#f2f2f7',
    ...side,
  });
  outer.add(Ti.UI.createLabel({ text: title, top: 6, font: { fontSize: 13 } }));
  const parent = Ti.UI.createView({
    top: 30,
    height: 250,
    left: 12,
    right: 12,
    backgroundColor: '#e0e0e6',
  });
  parent.add(Ti.UI.createView({ backgroundColor: '#0a84ff', left: 0, right: 0, ...props }));
  outer.add(parent);
  return outer;
}

win.add(pane('height wins', { top: 20, bottom: 20, height: 100 }, { left: 0 }));
win.add(pane('no height', { top: 20, bottom: 20 }, { right: 0 }));
win.open();
