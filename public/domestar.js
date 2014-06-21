var state = { "id":genid() };
var timer;
var wsurl = "ws://ws.domestar.us:8000/phone";
var ws = new WebSocket(wsurl);

function genid() {
	var wyattEpoch = new Date().getTime() - new Date("May 18, 2014 04:55").getTime()
	var rand = Math.floor(Math.random()*0xef+0x10);

    return wyattEpoch.toString(16) + "-" + rand.toString(16);
}

function setupWebsocket() {
	console.log("Connecting to %s", wsurl);
	ws = new WebSocket(wsurl);
	ws.onopen = function(e) { console.log("Connected"); }
	ws.onmessage = function(e) { console.log('message: %s', e.data); }
	ws.onclose = function(e) { 
		console.log("Connection closed." );
		window.setTimeout(setupWebsocket, 1000);
	};
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
	state['t'] = "start";
	state['c'] = e.target.getAttribute('data-hue');
	handleTick(e);
	state['t'] = "down";
	window.clearInterval(timer);
	timer = window.setInterval(handleTick, 100);
}

function handleUp(e) {
	state['t'] = "end";
	state['c'] = e.target.getAttribute('data-hue');
	window.clearInterval(timer);
	handleTick(e);
}

function handleTick(e) {
	var msg = JSON.stringify(state);

	ws.send(msg);
}

if (window.DeviceOrientationEvent) {
	window.addEventListener('deviceorientation', handleDeviceOrientation, true);
}

setupButtons();
setupWebsocket();

