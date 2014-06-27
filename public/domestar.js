var state = { "id":genid(), "a":0, "b":0, "g":0, "s":5, "c":0 };
var calibration = getCalibration(); 
var timer;
var wsLocalUrl = "ws://wsl.domestar.us:8000/phone";
var wsRemoteUrl = "ws://ws.domestar.us:8000/phone";
var wsl;
var wsr;
var lastButton;

setup();

function setup() {
	if (window.DeviceOrientationEvent) {
		window.addEventListener('deviceorientation', handleDeviceOrientation, false);
	}

	document.getElementById('size_duration').addEventListener('change', handleSizeDurationChange, false);

	setupButtons();
	setupIcons();
	wsl = setupWebsocket(wsLocalUrl);
	wsr = setupWebsocket(wsRemoteUrl);
}

// Generate a hopefully unique id for this person
function genid() {
	var wyattEpoch = new Date().getTime() - new Date("May 18, 2014 04:55").getTime()
	var rand = Math.floor(Math.random()*0xef+0x10);

    return wyattEpoch.toString(16) + "-" + rand.toString(16);
}

// Set up a reconnecting websocket and return it
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

// Setup the buttons
function setupButtons() {
	var buttons = document.getElementById('buttons');

	for (var h=0; h<360; h+=30) {
		var div = document.createElement('div');
		div.className='button';
	
		div.addEventListener('touchstart', handleDown, false);
		div.setAttribute('data-hue', h);
		div.style.backgroundColor = "hsl("+h+",100%,70%)";

		buttons.appendChild(div);
	}
}

function setupIcon(id, handler) {
	var ele = document.getElementById(id);
	ele.addEventListener("touchstart", handler, false);
}

function setupIcons() {
	setupIcon("calibrate", handleStartCalibration);
	setupIcon("calibrateN", handleCalibrate);
	setupIcon("calibrateE", handleCalibrate);
	setupIcon("calibrateS", handleCalibrate);
	setupIcon("calibrateW", handleCalibrate);
	setupIcon("closeCalibration", handleStopCalibration);
}

// Update state with device orientation
function handleDeviceOrientation(e) {
	state['a'] = Math.floor(e.alpha);
	state['b'] = Math.floor(e.beta);
	state['g'] = Math.floor(e.gamma);
}

function handleSizeDurationChange(e) {
	state['s'] = e.target.value;
}

function handleDown(e) {
	if (lastButton != e.target) {
		// Clear old button
		if (lastButton) 
			lastButton.className = "button inactive";

		// Set new button
		lastButton = e.target;
		lastButton.className = "button active";

		// Set and send state
		state['c'] = e.target.getAttribute('data-hue');
		handleTick(e);

		// Set timer to continue to update state
		// TODO FIXME This breaks multitouch
		window.clearInterval(timer);
		timer = window.setInterval(handleTick, 100);
	}
	else {
		// Retouch the same button to clear.
		lastButton.className = "button inactive";
		lastButton = null;
		window.clearInterval(timer);
	}
}

// Send current state to local or remote
function handleTick(e) {
	calculateCalibrated();

	var msg = JSON.stringify(state);

	if (wsl.readyState == 1) {
		wsl.send(msg);
	}
	else if (wsr.readyState == 1) {
		wsr.send(msg);
	}
}

function handleStartCalibration(e) {
	document.getElementById('calibrate').className = document.getElementById('calibrate').className.replace("inactive","active");
	document.getElementById('calibration').style.top = "0px";
}

function handleStopCalibration(e) {
	document.getElementById('calibrate').className = document.getElementById('calibrate').className.replace("active","inactive");
	document.getElementById('calibration').style.top = "-100%";

	var eles = document.querySelectorAll("#calibrationIcons .ready");
	for (var i=0; i<eles.length; i++) {
		eles[i].className = eles[i].className.replace("ready","not-ready");
	}
}

function handleCalibrate(e) {
	var ele = e.target;
	var dir = ele.id.replace("calibrate","");

	setCalibration(dir);
	ele.className = ele.className.replace("not-ready","ready");

	if (!document.querySelector("#calibrationIcons .not-ready")) {
		finishCalibration();
		handleStopCalibration();
	}
}

function getCalibration() {
	return JSON.parse(window.localStorage.getItem("calibration")) || { 
		"N": { "a":0, "b":0, "g":0 },
		"S": { "a":0, "b":0, "g":0 },
		"E": { "a":0, "b":0, "g":0 },
		"W": { "a":0, "b":0, "g":0 },
		"calibrated": false
	};
}

function finishCalibration() {
	calibration.calibrated = true;
	window.localStorage.setItem("calibration", JSON.stringify(calibration));
}

function setCalibration(dir) {
	calibration[dir].a = (state.a+state.g)%360;
	calibration[dir].b = state.b;
	window.localStorage.setItem("calibration", JSON.stringify(calibration));
}

// TODO Change to Brian's triangulation code.
function calculateCalibrated() {
	if (calibration.calibrated) {
		var xang = (state.a + state.g) % 360;
		var dirs = ['N','E','S','W','N'];
		var homes = [0,90,180,270]; 

		for (var i=0; i<4; i++) {
			if (isBetween(xang, dirs[i], dirs[i+1])) {
				var l = calibration[dirs[i]];
				var h = calibration[dirs[i+1]];
				var d = xang-l.a;
				var r = d / Math.abs(h.a - l.a);
				state['A'] = Math.floor(homes[i]+r*90);
				state['B'] = state.b - (l.b+h.b/2);
				break;
			}
		}
	}
}

function isBetween(ang, d1, d2) {
	return ang>=calibration[d1].a && ang<calibration[d2].a;
}



