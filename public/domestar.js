var state = { "id":genid() };
var timer;
var wsLocalUrl = "ws://wsl.domestar.us:8000/phone";
var wsRemoteUrl = "ws://ws.domestar.us:8000/phone";
var wsl;
var wsr;
var lastTick;
var singleMode;

setup();

function setup() {
	if (window.DeviceOrientationEvent) {
		window.addEventListener('deviceorientation', handleDeviceOrientation, true);
	}

	setupButtons();
	wsl = setupWebsocket(wsLocalUrl);
	wsr = setupWebsocket(wsRemoteUrl);
	singleMode = document.getElementById('modeswitch').checked;
	document.getElementById('modeswitch').addEventListener('click', handleModeToggle, true);
}

function genid() {
	var wyattEpoch = new Date().getTime() - new Date("May 18, 2014 04:55").getTime()
	var rand = Math.floor(Math.random()*0xef+0x10);

    return wyattEpoch.toString(16) + "-" + rand.toString(16);
}

function setupWebsocket(url, attempt) {
	console.log("Connecting to %s", url);
	var ws = new WebSocket(url);
	ws.onopen = function(e) { attempt=0; console.log("Connected"); }
	ws.onmessage = function(e) { console.log('message: %s', e.data); }
	ws.onclose = function(e) { 
		console.log("Connection closed.  Reconnect");
		window.setTimeout(function() { setupWebsocket(url, attempt||0+1) }, Math.min(attempt, 15) * 1000);
	};
	return ws;
}

function setupButtons() {
	var buttons = document.getElementById('buttons');

	for (var h=0; h<360; h+=30) {
		var div = document.createElement('div');
		div.className='button';
	
		div.addEventListener('mousedown', handleDown, true);
		div.addEventListener('mouseup', handleUp, true);
		div.addEventListener('touchstart', handleDown, true);
		div.addEventListener('touchend', handleUp, true);
		div.setAttribute('data-hue', h);
		div.style.backgroundColor = "hsl("+h+",100%,75%)";

		buttons.appendChild(div);
	}
}

function handleDeviceOrientation(e) {
	state['a']=Math.floor(e.alpha);
	state['b']=Math.floor(e.beta);
	state['g']=Math.floor(e.gamma);
}

function handleDown(e) {
	console.log("Down");
	state['t'] = "start";
	state['c'] = e.target.getAttribute('data-hue');
	handleTick(e);
	state['t'] = "down";

	// TODO FIXME This breaks multitouch
	window.clearInterval(timer);
	timer = window.setInterval(handleTick, 100);
}

function handleUp(e) {
	console.log("Up");
	state['t'] = "end";
	state['c'] = e.target.getAttribute('data-hue');
	window.clearInterval(timer);
	timer = null;
	handleTick(e);
}

function handleTick(e) {
	var msg = JSON.stringify(state);

	if (wsl.readyState == 1)
		wsl.send(msg);
	else if (wsr.readyState == 1)
		wsr.send(msg);
}

function handleModeToggle(e) {
	singleMode = document.getElementById('modeswitch').checked;
	console.log("Single orb mode: %s", singleMode);
}
