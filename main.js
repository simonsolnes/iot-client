var cards = require('./cards.js')

const thingid = '00001737'

const query = {
	sort: [
		{timestamp: 'desc'}
	],
	size: 100,
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

// testing:
// es_get_latest_payload('00001737').then((dat) => {console.log('es:', dat)});
// mqtt_vanilla()
// mqtt_with_cert('00001737')
//



class State {
	constructor() {
		this.s = {}
	}

	downloadAll() {
		return new Promise((resolve, reject) => {
			MIC.init({
				username: 'simonsolnes',
				password: 'RX6Ad+9Ct?eT84('
			})
			.then(() => {
				MIC.elasticsearch({ query })
				.then((result) => {
					result.hits.hits.reverse().forEach((hit) => {
						var payload = hit._source.state
						var ts = new Date(hit._source.timestamp)

						Object.keys(payload).forEach((key) => {
							if (!(key in this.s)) {
								this.s[key] = []
							}
							this.s[key].push(
								{val: payload[key], ts: ts}
							)
						})
					})
					resolve()
				});
			});
		})
	}
	get(key) {
		return this.s[key]
	}
}


class Controller {
	constructor(state) {
		this.state = new State();
		this.views = cards.cards.map(i => new i())
		var template = ''
		this.views.forEach((view) => {
			template += view.template()
		})
		document.getElementById('cards').innerHTML = template

		this.state.downloadAll().then(render)
	}

	render()  {
		console.log(this.state)
		this.views.forEach((view) => {
			console.log('get:', this.state.get(view.id))
			view.render(this.state.get(view.id))
		})
	}
}

function render() {
	viewController.render()
}
var viewController = new Controller()



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



function es_get_history(thingid, num) {

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
