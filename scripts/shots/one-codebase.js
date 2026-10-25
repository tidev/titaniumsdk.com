// One screen, no platform branching, so the only difference between the two
// halves of the picture is what each platform makes of the same controls.
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'vertical', navBarHidden: true });

win.add(Ti.UI.createLabel({ text: 'Notifications', top: 100, font: { fontSize: 20 } }));
win.add(Ti.UI.createSwitch({ value: true, top: 24 }));
win.add(Ti.UI.createButton({ title: 'Save changes', top: 32 }));
win.add(Ti.UI.createSlider({ min: 0, max: 10, value: 7, top: 32, width: 240 }));

win.open();
