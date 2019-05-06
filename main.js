var c3 = require('c3')

class Humidity {
	constructor(id) {
		this.id = 'hum'
		this.subscribesTo = [id]

		this.chart = c3.generate({
			bindto: `#${this.id}`,
			data: {
				columns: [
					['data', 30, 200, 100, 400, 150, 250]
				]
			}
		});
	}
	render(history) {
		//return `<div id="${this.id}"></div>`
	}
}

class Controller {
	constructor(state) {
		this.state = state;
		this.lastTS = {}
		this.views = {
			hum: new Humidity()
		}
	}
	draw()  {
		var newView = ''
		this.state.getKeys().forEach( (key) => {

			var latest_ts = this.state.get(key).slice(-1)[0].ts
			var shouldUpdate =  latest_ts > ((key in this.lastTS) ? this.lastTS[key] : new Date(0))

			if (shouldUpdate) {
				if (key in this.views) {
					// key wrong
					this.views[key].render(this.state.get(key))
				}
			}
		})
		document.getElementById('cards').innerHTML = newView
	}
}


	/*
class State {
	constructor () {
		this.state = {}
	}
	update(newState, timestamp) {
		for (let key in newState) {
			this.add(key, newState[key], timestamp)
		}
	}
	get(key) {
		return this.state[key]
	}
	add(key, val, timestamp) {
		if (!(key in this.state)) {
			this.state[key] = []
		}
		this.state[key].push({val: val, ts: timestamp})
	}

	getKeys() {
		return Object.keys(this.state)
	}
}
*/


// testing:

// es_get_latest_payload('00001737').then((dat) => {console.log('es:', dat)});
// mqtt_vanilla()
// mqtt_with_cert('00001737')



global.onSubmitForm = function() {

	document.getElementById('value-table').innerHTML = '<i>loading ...</i>';
	document.getElementsByName('thing').forEach(
		function(i) {
			if (i.checked) {
				es_get_latest_payload(i.value).then(update_state);
				//mqtt_vanilla(i.value);
				//mqtt_with_cert(i.value);
			}
		}
	);

}

function update_state(args) {
	var state = args[0]
	var ts = args[1]
	globalState.update(state, ts)
	globalController.draw()
	console.log(globalState)
	console.log('new state:', state)
	var res = '';
	res += '<table><tr><th>Name</th><th>Value</th></tr>'
	for (var key in state) {
		res += '<tr><td>' + key + '</td><td>' + state[key] + '</td></tr>';
	}
	document.getElementById('value-table').innerHTML = res + '</table>';

	//var marker = L.marker([state.lat, state.lng]).addTo(mymap);
	//marker.bindPopup("GPS position").openPopup();
}


function getFileFromServer(url, doneCallback) {
	return new Promise(
		(resolve, reject) => {
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = handleStateChange;
			xhr.open("GET", url, true);
			xhr.send();

			function handleStateChange() {
				if (xhr.readyState === 4) {
					resolve(xhr.status == 200 ? xhr.responseText : null);
				}
			}
		}
	)
}
function es_get_latest_payload(thingid) {
	return new Promise( (resolve, reject) => {
		MIC.init({
			username: 'simonsolnes',
			password: 'RX6Ad+9Ct?eT84('
		}).then(() => {
			MIC.elasticsearch({
				query: {
					sort: [
						{timestamp: 'desc'}
					],
					size: 1,
					query: {
						bool: {
							filter: [
								{
									term: {
										thingName: thingid
									}
								}
							]
						}
					}
				}
			})
			.then((result) => {
				console.log('result', result)
				var state = result.hits.hits[0]._source.state;
				resolve([state, new Date()]);
			});
		});
	})
}

class State {
	constructor() {
		this.s = {}
	}
	addPayload(payload, ts) {
		Object.keys(payload).forEach((key) => {
			if (!(key in this.s)) {
				this.s[key] = []
			}
			this.s[key].push(
				{val: payload[key], ts: ts}
			)
		})

	}
}

var state = new State()
es_get_history('00001737', 10).then()
console.log('state', state)

function es_get_history(thingid, num) {
	return new Promise((resolve, reject) => {
		MIC.init({
			username: 'simonsolnes',
			password: 'RX6Ad+9Ct?eT84('
		}).then(() => {
			MIC.elasticsearch({
				query: {
					sort: [
						{timestamp: 'desc'}
					],
					size: num,
					query: {
						bool: {
							filter: [
								{
									term: {
										thingName: thingid
									}
								}
							]
						}
					}
				},
				aggs: {
					timestamp: {
						terms: {
							field: "timestamp",
							order: {
								_term: "asc"
							}
						}
					}
				}
			})
			.then((result) => {
				resolve(process_es_history(result.hits.hits))
			});
		});
	})
}


function process_es_history(hits) {
	return new Promise((resolve, reject) => {
		hits.forEach((hit) => {
			var payload = hit._source.state
			var ts = hit._source.timestamp
			state.addPayload(payload, new Date(ts))
		})
		resolve()
	})
}

function mqtt_vanilla() {
	MIC.init({
		username: 'simonsolnes',
		password: 'RX6Ad+9Ct?eT84('
	}).then(() => {
		// Create a new MQTT client
		MIC.mqtt()
		.then((client) => {
			// Do something with the MQTT client here!
			client.on('connect',
				function () {
					// Immediately subscribe to a topic
					client.subscribe('#');

					// Log event
					console.log('connected')
				}
			);
			client.on('message', function (topic, message) {
				try {
					var json = JSON.parse(message.toString());

					// Get the correct resource from the message
					var value = json.state.reported.temperature;

					// Update gauge chart
					//chart.load({
						//columns: [['temperature', value]]
					//});

					// Log message
					console.log('got a message:', message.toString() + '\n\n')

				} catch (e) {
					console.log('error', e)
				}
			});


		});
	});
}



function mqtt_with_cert(thingid) {
	var urls = {
		APIGateway: 'https://qvx6ay1eog.execute-api.eu-west-1.amazonaws.com',
		IoTEndpoint: 'a3k7odshaiipe8.iot.eu-west-1.amazonaws.com',
		IoTEndpointATS: 'a3k7odshaiipe8-ats.iot.eu-west-1.amazonaws.com',
		ThingAPI: 'a1ek3lbmx2jfb9-ats.iot.eu-west-1.amazonaws.com',
		CA: 'https://www.symantec.com/content/en/us/enterprise/verisign/roots/VeriSign-Class%203-Public-Primary-Certification-Authority-G5.pem'
	}
	// This function doesn't work due to OSStatusError 9825 (bad certificate)
	var mqtt = require('mqtt');
	var fs = require('fs');
	var path = require('path');

	var PORT = 8883
	var HOST = urls.ThingAPI

	Promise.all([
		getFileFromServer(`/crypto/${thingid}/privkey.pem`),
		getFileFromServer(`/crypto/${thingid}/cert.pem`),
		getFileFromServer('/crypto/ca.pem')
	]).then(files => {
		console.log('Connecting')
		options = {
			port: PORT,
			host: HOST,
			key: files[0],
			cert: files[1],
			ca: files[2],
			rejectUnauthorized: true,
			protocol: 'mqtts',
		}
		console.log(options)
		var client = mqtt.connect(options)
		console.log('Connect func done')


		//client.publish('#', 'Current time is: ' + new Date())

		client.on('connect', function () {

			console.log('Connected!!')
			client.subscribe(`$aws/things/${thingid}/shadow/update`)
		})

		client.on('message', function (topic, message) {
			console.log('Got this message:', topic, message)
		})

	})


}

var mymap = L.map('mapid').setView([69.68146, 18.97737], 13);
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1Ijoic2ltb25zb2xuZXMiLCJhIjoiY2prYTJmMWhyMjA0aTNra3lteXhmbG1zNyJ9.JMwUj__xu2j3pIetczNArg'
}).addTo(mymap);


