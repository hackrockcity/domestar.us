var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port:8000});

var domes = {};
var phones = {};

wss.on('connection', handleConnect);

function genid() {
	return Math.floor(Math.random()*0xefff+0x1000).toString(16);
}

function rappend(o, v) {
	k = genid();
	while (k in o) k = genid;
	o[k]=v;
	return k;
}

function handleConnect(ws) {
	var endpoint = ws.upgradeReq.url;
	console.log("Connection to %s endpoint", endpoint);

	if (endpoint == "/dome") {
		ws.id = rappend(domes, ws);
		ws.send(JSON.stringify({"yo":"dome"}));
	}
	else {
		ws.id = rappend(phones, ws);
		ws.send(JSON.stringify({"yo":"phone"}));
		ws.on('message', function(msg) { handlePhoneMessage(ws, msg); });
	}
}

function handlePhoneMessage(ws, msg) {
	var parsed = JSON.parse(msg);
	console.log("msg from %s: %s", parsed.id, msg);

	for (var i in domes) {
		try { domes[i].send(msg); }
		catch (e) { delete(domes[i]); }
	}
}


