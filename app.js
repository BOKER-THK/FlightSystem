const express = require('express');
const ckan = require('ckan')

const client = new ckan.Client('https://data.gov.il');
client.requestType = 'GET';

const app = express();
const API_URL = 'https://data.gov.il/api/3/action/datastore_search?resource_id=e83f763b-b7d7-479e-b172-ae981ddc6de5&limit=10000';

const getDate = date => {
    return new Date(date + 'Z');
}

const getIsraelTime = () => {
    // get the current time
    const time = new Date();

    // add 3 hours to the time to achieve GMT+2
    time.setTime(time.getTime() + 3*60*60*1000);

    // return the time as a string without the millisecond
    return time;
}

const importData = async (query='') => {
    if (query) {
        query += '&q=' + JSON.stringify(query);
    }
    const rawData = await fetch(API_URL + query);
    const data = await rawData.json();
    return data.result.records;
}

const ckanImport = (query='', callback) => {
    client.action('datastore_search', {
        resource_id: 'e83f763b-b7d7-479e-b172-ae981ddc6de5',
        q: query,
        limit: '300'
    },
    (error, response) => {
        if (error) {console.error(error);}
        else {callback(response.result.records);}
    });
};

app.get('/getaway', (req, res) => {
    const time = getIsraelTime();
    const duration = req.header('duration') || 1;
    ckanImport(time.toISOString().slice(0, 13), flights => {
        const relevantOutbound = flights.filter(flight => {
            return (flight.CHCINT != 'null' && getDate(flight.CHPTOL).getTime() > time.getTime());
        })
        getawayFlight = {'flightCode':relevantOutbound[0].CHOPER + relevantOutbound[0].CHFLTN,
                         'time':getDate(relevantOutbound[0].CHPTOL)};
        for (let i = 1; i < relevantOutbound.length; i++) {
            const tempTime = getDate(relevantOutbound[i].CHPTOL);
            if (getawayFlight.time.getTime() > tempTime.getTime()) {
                getawayFlight.flightCode = relevantOutbound[i].CHOPER + relevantOutbound[i].CHFLTN;
                getawayFlight.time = tempTime;
            }
        }
        const backTime = new Date(getawayFlight.time.getTime() + duration*60*60*1000);
        ckanImport(backTime.toISOString().slice(0,13), backFlights => {
            let relevantInbound = backFlights.filter(flight => {
                return (flight.CHCINT == 'null' && getDate(flight.CHPTOL).getTime() > backTime.getTime());
            })
            getawayFlightBack = {'flightCode':relevantInbound[0].CHOPER + relevantInbound[0].CHFLTN,
                                 'time':getDate(relevantInbound[0].CHPTOL)};
            for (let i = 1; i < relevantInbound.length; i++) {
                const tempTime = getDate(relevantInbound[i].CHPTOL);
                if (getawayFlightBack.time.getTime() > tempTime.getTime()) {
                    getawayFlightBack.flightCode = relevantInbound[i].CHOPER + relevantInbound[i].CHFLTN;
                    getawayFlightBack.time = tempTime;
                }
            }
            console.log(getawayFlight.time);
            console.log(getawayFlightBack.time);
            res.status(200).json(getawayFlight.flightCode, getawayFlightBack.flightCode);
        });
    });
});

app.get('/delayedCount', (req, res) => {
    ckanImport(flights => {
        let ret = 0;
            flights.forEach((flight, i) => {
                if (flight.CHSTOL != flight.CHPTOL) {
                    ret++;
                }
            });
        res.status(200).send(ret.toString());
    });
});
    
app.get('/flightCount', (req, res) => {
    const inputCountry = req.header('country');
    const type = req.header('type');
    const query = inputCountry ? {'CHLOCCT':inputCountry} : '';
    ckanImport(query, flights => {
        if (type === 'all') {
            res.status(200).send(flights.length.toString());
        } else {
            const ret = flights.filter(flight => {
                return flight.CHCINT == 'null';
            }).length;
            res.status(200).send(((type === 'inbound') ?
                ret : flights.length - ret).toString());
        }
    });
});

app.get('/mostPopularDestination', (req, res) => {
    ckanImport(flights => {
        const popularity = new Map();
        let mostPopular = '';
        flights = flights.filter(flight => {
            return flight.CHCINT != 'null';
        });
        flights.forEach(flight => {
            const city = flight.CHLOC1T;
            if (popularity.has(city)) {
                popularity.set(city, 
                    popularity.get(city) + 1);
            } else {
                popularity.set(city, 1);
            }
        })
        mostPopular = popularity.keys().next().value;
        for (const [key, value] of popularity) {
            if (popularity.get(mostPopular) < value) {
                mostPopular = key;
            }
        }
        res.status(200).send(mostPopular);
    });
});

module.exports = app;