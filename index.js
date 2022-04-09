const express = require('express')
const haversine = require('haversine')
const axios = require('axios').default

const app = express()
const port = 3000

const HOME_LAT = 51.48688576261284
const HOME_LONG = -0.22499277220952868

// Putney: 51.459643,-0.214126
// Westminster: 51.497495,-0.135658
// Clapham: 51.465881,-0.141326

// Park tavern: 51.45082, -0.19931


const getBusStopApi = (lat, lon, radius) => `https://api.tfl.gov.uk/Stoppoint?lat=${lat}&lon=${lon}&stoptypes=NaptanPublicBusCoachTram&radius=${radius}`

const haversineObject = (latitude, longitude) => ({
	latitude,
	longitude
})

app.get('/', async (req, res) => {
	const {lat, lon, radius} = req.query
	try {
		let apiResponseHome = await axios.get(getBusStopApi(HOME_LAT, HOME_LONG, radius))

		const metresBetweenPoints = haversine(haversineObject(HOME_LAT, HOME_LONG), haversineObject(lat, lon), {unit: 'meter'})

		let busStopsHome = {
			"centrePoint": apiResponseHome.data.centrePoint,
			"stopPoints": []
		}

		let validLines = []

		for(const stopPoint of apiResponseHome.data.stopPoints) {

			lines = (stopPoint.lineModeGroups[0] && stopPoint.lineModeGroups[0].lineIdentifier) || []
			busStopsHome.stopPoints.push({
				"name": stopPoint.commonName,
				"lines": lines,
				"stationNaptan": stopPoint.stationNaptan,
				"stopLetter": stopPoint.stopLetter,
				"distance": stopPoint.distance
			})

			validLines = validLines.concat(lines)
		}

		validLines = Array.from(new Set(validLines))

		console.log(`validLines: ${validLines}`)

		let apiResponseNearby = await axios.get(getBusStopApi(lat, lon, radius))

		let busStopsNearby = {
			"centrePoint": apiResponseNearby.data.centrePoint,
			"stopPoints": []
		}

		for(const stopPoint of apiResponseNearby.data.stopPoints) {

			lines = (stopPoint.lineModeGroups[0] && stopPoint.lineModeGroups[0].lineIdentifier.filter(line => validLines.includes(line))) || []

			if (lines && lines.length > 0) {
				validHomeStops = busStopsHome.stopPoints.map(stop => ({
					...stop,
					"lines": stop.lines.filter(line => lines.includes(line))
				})).filter(stop => stop.lines.length > 0)

				busStopsNearby.stopPoints.push({
					"name": stopPoint.commonName,
					"to": validHomeStops,
					"lines": stopPoint.lineModeGroups[0].lineIdentifier.filter(line => validLines.includes(line)),
					"stationNaptan": stopPoint.stationNaptan,
					"stopLetter": stopPoint.stopLetter,
					"distance": stopPoint.distance
				})
			}
		}

		// Filter out stops with no valid lines
		busStopsNearby.stopPoints = busStopsNearby.stopPoints.filter(stop => stop.lines.length > 0)

		// Show the lines that are being considered
		const linesToConsider = new Set()
		busStopsNearby.stopPoints.forEach(stop => stop.lines.forEach(line => linesToConsider.add(line)))
		busStopsNearby.linesToConsider = Array.from(linesToConsider)

		res.json(busStopsNearby)
	} catch (err) {
		console.log("ERROR")
		console.log(err)
		res.json(err)
	}
})

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})