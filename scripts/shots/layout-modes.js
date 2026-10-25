// Three parents, the same four children in each, so the only difference is the
// parent's `layout`. In composite all four are pinned to the same spot and the
// last one added is the one you see, which is the point.
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'horizontal' });
const colors = ['#ff3b30', '#ff9500', '#34c759', '#0a84ff'];

for (const mode of ['composite', 'vertical', 'horizontal']) {
  const col = Ti.UI.createView({ width: '33%', height: 240, top: 100 });
  col.add(Ti.UI.createLabel({ text: mode, top: 0, font: { fontSize: 13 } }));

  const box = Ti.UI.createView({
    layout: mode,
    top: 26,
    height: 200,
    left: 8,
    right: 8,
    backgroundColor: '#f2f2f7',
  });
  for (const color of colors) {
    box.add(Ti.UI.createView({ width: 40, height: 40, top: 6, left: 6, backgroundColor: color }));
  }
  col.add(box);
  win.add(col);
}

win.open();
