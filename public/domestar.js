var state = { "id":genid(), "a":0, "b":0, "g":0, "s":5, "c":0, "f":0, "p":0, "P":0 };
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

// Set up the icons (smaller buttons)
function setupIcons() {
	setupIcon("calibrate", handleStartCalibration);
	setupIcon("calibrateN", handleCalibrate);
	setupIcon("calibrateE", handleCalibrate);
	setupIcon("calibrateS", handleCalibrate);
	setupIcon("calibrateW", handleCalibrate);
	setupIcon("closeCalibration", handleStopCalibration);
	setupIcon("flame", getToggleHandler("f"));
	setupIcon("pulse", getToggleHandler("p"));
	setupIcon("paint", getToggleHandler("P"));
}

// Update state with device orientation
function handleDeviceOrientation(e) {
	state['a'] = Math.floor(e.alpha);
	state['b'] = Math.floor(e.beta);
	state['g'] = Math.floor(e.gamma);
}

// Update state when slider is moved
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

// Shows calibration screen
function handleStartCalibration(e) {	
	resetCalibration();
	document.getElementById('calibrate').className = document.getElementById('calibrate').className.replace("inactive","active");
	document.getElementById('calibration').style.top = "0px";
}

// Hides calibration screen
function handleStopCalibration(e) {
	document.getElementById('calibrate').className = document.getElementById('calibrate').className.replace("active","inactive");
	document.getElementById('calibration').style.top = "-100%";

	var eles = document.querySelectorAll("#calibrationIcons .ready");
	for (var i=0; i<eles.length; i++) {
		eles[i].className = eles[i].className.replace("ready","not-ready");
	}
}

// Handles pressing a calibration button
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

// Returns calibration from localstorage or an initialized object
function getCalibration() {
	return JSON.parse(window.localStorage.getItem("calibration")) || { 
		"N": { "a":0, "b":0, "g":0 },
		"S": { "a":0, "b":0, "g":0 },
		"E": { "a":0, "b":0, "g":0 },
		"W": { "a":0, "b":0, "g":0 },
		"calibrated": false
	};
}

// Drop our calibration settings
function resetCalibration() {
	calibration.calibrated = false;
	window.localStorage.setItem("calibration", JSON.stringify(calibration));
}

// Update that we're calibrated and save that
function finishCalibration() {
	calibration.calibrated = true;
	window.localStorage.setItem("calibration", JSON.stringify(calibration));
}

// Saves a calibration for a direction
function setCalibration(dir) {
	calibration[dir].a = state.a;
	calibration[dir].b = state.b;
	calibration[dir].g = state.g;
	window.localStorage.setItem("calibration", JSON.stringify(calibration));
}

// TODO Change to Brian's triangulation code.
// This walks each of the calibrated directions to locate where the current angle
// sits between, calculates how far in the angle is, and then resets angle based
// on fixed directions.
function calculateCalibrated() {
	if (calibration.calibrated) {
		var xang = state.a;
		var dirs = ['N','E','S','W','N'];
		var homes = [360,270,180,90,0];

		// For each starting direction
		for (var i=0; i<4; i++) {

			// Check if we're between (and if so, how far)
			var r = ratioBetween(xang, dirs[i], dirs[i+1]);

			if (r) {
				// Calculate where we would be if we were that far between
				// the dome's totems.
				state['A'] = Math.floor(homes[i+1]+r*90);

				// B is seasier, just subtract out the average of the two floors
				state['B'] = state.b - (l.b+h.b/2);

				return;
			}
		}
	}

	console.log("Can't locate " + xang);
}

// If ang is between d1 and d2 returns a ratio of ang's distance travelled
// across the two.
function ratioBetween(ang, d1, d2) {
	var a = Math.max(calibration[d1].a,calibration[d2].a);
	var b = Math.min(calibration[d1].a,calibration[d2].a);

	// Flip for the 360 degree barrier
	if (a-b > 180) { 
		var t=b; 
		b=a-360; 
		a=t; 

		if (ang > 180) ang -= 360;
	}

	return (ang<=a && ang>b) ? (ang-b)/(a-b) : false;
}


function getToggleHandler(flag) {
	return function(e) {
		state[flag] = 1-state[flag];
		e.target.className = e.target.className.replace(/(?:in)?active/, state[flag] ? "active" : "inactive");
	}
}

