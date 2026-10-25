const Map = require('ti.map');

const win = Ti.UI.createWindow({ backgroundColor: '#fff' });

const annotations = [
  Map.createAnnotation({
    latitude: 37.7793,
    longitude: -122.4193,
    title: 'City Hall',
    subtitle: 'Civic Center',
  }),
  Map.createAnnotation({
    latitude: 37.7801,
    longitude: -122.4162,
    title: 'Asian Art Museum',
    subtitle: 'Larkin Street',
  }),
  Map.createAnnotation({
    latitude: 37.7786,
    longitude: -122.4156,
    title: 'Main Library',
    subtitle: 'Grove Street',
    canShowCallout: true,
  }),
];

const map = Map.createView({
  mapType: Map.NORMAL_TYPE,
  region: { latitude: 37.7793, longitude: -122.4172, latitudeDelta: 0.01, longitudeDelta: 0.01 },
  annotations,
});

// The callout is opened here rather than by a tap, so the shot lands with it
// already showing. `complete` is the map saying it has finished drawing; the
// timer is in case it never fires.
let opened = false;
function openCallout() {
  if (opened) {
    return;
  }
  opened = true;
  map.selectAnnotation(annotations[0]);
}
map.addEventListener('complete', openCallout);
setTimeout(openCallout, 4000);

win.add(map);
win.open();
