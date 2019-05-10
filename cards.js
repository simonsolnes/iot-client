var c3 = require('c3')

class Card {
	constructor() {
	}
	template() {
		return `<div class="card"><div id="${this.id}-info"></div><div id="${this.id}-graphics"></div></div>`

	}
	writeInfo(info) {
		document.getElementById(`${this.id}-info`).innerHTML = info
	}
	writeGraphics(info) {
		document.getElementById(`${this.id}-graphics`).innerHTML = info
	}
	writeTitle() {
		this.writeInfo(`<h1>${this.humanReadable}</h1>`)
	}
}

class Humidity extends Card {
	constructor() {
		super()
		this.id = 'hum';
		this.humanReadable = 'Humidity'
		this.subscribesTo = [this.id]
	}
	render(history) {
		this.writeTitle()
		this.chart = c3.generate({
			bindto: `#${this.id}-graphics`,
			data: {
				x: 'ts',
				columns: [
					['ts', ...history.map((i) => i.ts)],
					['data1', ...history.map(i => i.val.substring(0, i.val.length - 1))]
				]
			}
		});
	}
}
class OutsideHumidity extends Humidity{
	constructor() {
		super()
		this.id = 'hum_2'
		this.humanReadable = 'Humidity Outside'
		this.subscribesTo = [this.id]
	}

}
class Status extends Card {
	constructor() {
		super()
		this.id = 'battery';
		this.humanReadable = 'Battery'
		this.subscribesTo = [this.id]
	}

	render(history) {
		this.writeTitle()
		this.writeGraphics(history.reverse()[0].val)
	}
}

class MapView extends Card {
	constructor() {
		super()
		this.id = 'lat';
		this.humanReadable = 'Map'
		this.subscribesTo = [this.id]
	}
	render() {
		this.writeTitle()
		this.mymap = L.map(`${this.id}-graphics`).setView([69.68146, 18.97737], 13);
		L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
			attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
			maxZoom: 18,
			id: 'mapbox.streets',
			accessToken: 'pk.eyJ1Ijoic2ltb25zb2xuZXMiLCJhIjoiY2prYTJmMWhyMjA0aTNra3lteXhmbG1zNyJ9.JMwUj__xu2j3pIetczNArg'
		}).addTo(this.mymap);
	}
}

module.exports = {
	cards: [
		Humidity,
		OutsideHumidity,
		Status,
		MapView
	]
}
	/*
CO2
Iteration_number
date
lat
lng
lux
psi
psi_2
tmp
tmp_2
*/
