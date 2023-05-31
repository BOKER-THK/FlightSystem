const express = require('express');
const ckan = require('ckan')

const app = express();
const API_URL = 'https://data.gov.il/api/3/action/datastore_search?resource_id=e83f763b-b7d7-479e-b172-ae981ddc6de5&limit=300';

const client = new ckan.Client('https://data.gov.il');
client.requestType = 'GET';

// Get the UTC formatted time
const getDate = date => {
    return new Date(date + 'Z');
}

// Insert GMT+2 into the time variable.
const getIsraelTime = () => {
    // get the current time
    const time = new Date();

    // add 3 hours to the time to achieve GMT+2
    time.setTime(time.getTime() + 3*60*60*1000);

    // return the time as a string without the millisecond
    return time;
}

// The fucntion I fetched datawith  when I started working on the project.
// For better readability, I switched to the ckanImport function.
//
// The main difference between the functions is that importData returns 
// a Promise while ckanImport uses a callback function parameter to execute
// code inside the function.

const importData = async (query='') => {
    if (query) {
        query += '&q=' + JSON.stringify(query);
    }
    const rawData = await fetch(API_URL + query);
    const data = await rawData.json();
    return data.result.records;
}

const ckanImport = (callback, query='') => {
    client.action('datastore_search', {
        resource_id: 'e83f763b-b7d7-479e-b172-ae981ddc6de5',
        q: query,
        limit: '300'
    },
    (error, response) => {
        if (error) { console.error(error); }
        else { callback(response.result.records);}
    });
};

const getNextFlight = (flights, time, condition) => {
    const relevant = flights.filter(flight => {
        return (condition(flight.CHCINT, flight.CHLOCCT) && getDate(flight.CHPTOL).getTime() > time.getTime());
    })
    if (!relevant.length) {
        return {};
    }
    getawayFlight = {'flightCode':relevant[0].CHOPER + relevant[0].CHFLTN,
                     'time':getDate(relevant[0].CHPTOL),
                     'country':relevant[0].CHLOCCT};
    for (let i = 1; i < relevant.length; i++) {
        const tempTime = getDate(relevant[i].CHPTOL);
        if (getawayFlight.time.getTime() > tempTime.getTime()) {
            getawayFlight.flightCode = relevant[i].CHOPER + relevant[i].CHFLTN;
            getawayFlight.country = relevant[i].CHLOCCT;
            getawayFlight.time = tempTime;
        }
    }
    return getawayFlight;
};

app.get('/getaway', (req, res) => {
    const time = getIsraelTime();
    const duration = req.header('duration') || 1;
    ckanImport(flights => {
        const outboundGetaway = getNextFlight(flights, time, outbound => { return outbound; });
        const backTime = new Date(outboundGetaway.time.getTime() + duration*60*60*1000);
        for (let i = 0; i < 24; i++) {
            tempDate = new Date(backTime.getTime() + 1000*60*60*i);
            ckanImport(backFlights => {
                const inboundGetaway = getNextFlight(backFlights, tempDate,
                    (outbound, country) => { return !outbound && (country == outboundGetaway.country); });
                if (Object.keys(inboundGetaway).length || Object.keys(outboundGetaway).length) {
                    console.log('here1');
                    res.status(200).json({ departure:outboundGetaway.flightCode,
                                           arrival:inboundGetaway.flightCode });
                }
            }, tempDate.toISOString().slice(0, 13));
        }
        if (!res.headersSent) {
            console.log('here2');
            res.status(200).json({});
        }
    }, time.toISOString().slice(0, 13));
});

app.get('/delayedCount', (req, res) => {
    ckanImport(flights => {
        let ret = 0;
            flights.forEach((flight, i) => {
                if (getDate(flight.CHSTOL).getTime() < getDate(flight.CHPTOL).getTime()) {
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
    ckanImport(flights => {
        if (type === 'all') {
            res.status(200).send(flights.length.toString());
        } else {
            const ret = flights.filter(flight => {
                return flight.CHCINT == 'null';
            }).length;
            res.status(200).send(((type === 'inbound') ?
                ret : flights.length - ret).toString());
        }
    }, query);
});

app.get('/mostPopularDestination', (req, res) => {
    ckanImport(flights => {
        const popularity = new Map();
        let mostPopular = '';
        flights = flights.filter(flight => {
            return flight.CHCINT;
        });
        flights.forEach(flight => {
            const city = flight.CHLOC1T;
            if (popularity.has(city)) {
                popularity.set(city, popularity.get(city) + 1);
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