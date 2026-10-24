const win = Ti.UI.createWindow({ backgroundColor: '#fff', navBarHidden: true });

const section = Ti.UI.createListSection({ headerTitle: 'Modules' });
section.setItems([
  { properties: { title: 'ti.map' } },
  { properties: { title: 'ti.barcode' } },
  { properties: { title: 'ti.coremotion' } },
  { properties: { title: 'ti.crypto' } },
  { properties: { title: 'ti.nfc' } },
]);

// The list fills the window rather than being boxed into the band: iOS only
// renders the rows that fit its frame, and a fixed height dropped the fifth.
// The crop is what frames the shot.
win.add(Ti.UI.createListView({ sections: [section] }));
win.open();
