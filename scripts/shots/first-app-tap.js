// The snippet from the page, unchanged, plus the tap. The picture is of the
// state after the button is pressed, and nobody is there to press it.
const win = Ti.UI.createWindow({
  backgroundColor: 'backgroundColor'
});

const label = Ti.UI.createLabel({
  text: 'Tap the button',
  color: 'textColor',
  top: 80
});

const button = Ti.UI.createButton({
  title: 'Say hello',
  top: 140
});

button.addEventListener('click', () => {
  label.text = 'Hello from Titanium';
});

win.add(label);
win.add(button);
win.open();

win.addEventListener('open', () => button.fireEvent('click'));
