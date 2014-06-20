var state = { };
var timer;

var ws = new WebSocket('ws://www.domestar.us:8000/phone');
ws.onopen = function(e) { console.log("Connected"); }
ws.onmessage = function(e) { console.log('message: %s', e.data); }
ws.onclose = function(e) { console.log("Closed"); }

function setMessage(msg) {
	document.querySelector('h1').innerText = msg;
}

function handleDeviceOrientation(e) {
	var o = { a:Math.floor(e.alpha), b:Math.floor(e.beta), g:Math.floor(e.gamma) };

	setMessage(o.a + "/" + o.b + "/" + o.g);
	state.o = o;
}

function handleDown(e) {
	state['touch'] = "start";
	handleTick(e);
	state['touch'] = "down";
	timer = window.setInterval(handleTick, 100);
}

function handleUp(e) {
	state['touch'] = "end";
	window.clearInterval(timer);
	handleTick(e);
}

function handleTick(e) {
	var msg = JSON.stringify(state);

	ws.send(msg);
}

if (window.DeviceOrientationEvent) {
	window.addEventListener('deviceorientation', handleDeviceOrientation, false);
}

window.addEventListener('mousedown', handleDown, false);
window.addEventListener('mouseup', handleUp, false);
window.addEventListener('touchstart', handleDown, false);
window.addEventListener('touchend', handleUp, false);



