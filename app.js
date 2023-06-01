const express = require('express');
const ckan = require('ckan')

const API_URL = 'https://data.gov.il/api/3/action/datastore_search?resource_id=e83f763b-b7d7-479e-b172-ae981ddc6de5&limit=300';

const client = new ckan.Client('https://data.gov.il');
client.requestType = 'GET';

const app = express();

// Get the UTC formatted time
getDate = date => {
    return new Date(date + 'Z');
};

// Insert GMT+2 into the time variable.
getIsraelTime = () => {
    // get the current time
    const time = new Date();

    // add 3 hours to the time to achieve GMT+2
    time.setTime(time.getTime() + 3*60*60*1000);

    // return the time as a string without the millisecond
    return time;
};

// The fucntion I fetched data with when I started working on the project.
// For better readability, I switched to the ckanImport function.
//
// The main difference between the functions is that importData returns 
// a Promise while ckanImport uses a callback function parameter to execute
// code inside the function.

importData = async (query='') => {
    if (query) {
        query += '&q=' + JSON.stringify(query);
    }
    const rawData = await fetch(API_URL + query);
    const data = await rawData.json();
    return data.result.records;
};

// The function accepts two parameters:
//    - callback: a function that will be executed on a
//      successful fetching attempt.
//    - query: a ckan query that can filter the API.
//
// In case the fetch fails, 

ckanImport = (callback, query='') => {
    client.action('datastore_search', {
        resource_id: 'e83f763b-b7d7-479e-b172-ae981ddc6de5',
        q: query,
        limit: '300'
    },
    (error, response) => {
        if (error) { throw new Error(error); }
        else { callback(response.result.records);}
    });
}

// An assistant function to the getaway route.
// This function retrieves the next flight that is available,
// according to certain conditions:
//    - the closest to time parameter.
//    - inbound or outbound.
//    - departs from a certain country, when it's inbound.
// The two last conditions are sent from getaway when the
// function is called.

getNextFlight = (flights, time, condition) => {
    const relevant = flights.filter(flight => {
        return (condition(flight.CHCINT, flight.CHLOCCT) && getDate(flight.CHPTOL).getTime() > time.getTime());
    })
    if (!relevant.length) {
        return {};
    }
    getawayFlight = {'flightCode': relevant[0].CHOPER + relevant[0].CHFLTN,
                    'time': getDate(relevant[0].CHPTOL),
                    'country': relevant[0].CHLOCCT};
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

// The function finds the next closest flight by querying the
// current date to a percision of hours. After storing the values
// in the outboundGeraway constant, the function proceeds to
// search for a returning flight that will return from the same
// country after a time gap that is determined by the 'duration'
// header. 
// If one of the two queries fail, the function will
// return an empty object. if both succeed, it returns both
// flight codes in JSON format.

app.get('/getaway', (req, res, next) => {
    try {
        const time = getIsraelTime();
        const duration = req.header('duration') || 1;
        ckanImport(flights => {
            const outboundGetaway = getNextFlight(flights, time, outbound => { return outbound; });
            const backTime = new Date(outboundGetaway.time.getTime() + duration*60*60*1000);
            ckanImport(backFlights => {
                const inboundGetaway = getNextFlight(backFlights, backTime,
                    (outbound, country) => { return !outbound && (country == outboundGetaway.country); });
                if (!Object.keys(inboundGetaway).length || !Object.keys(outboundGetaway).length) {
                    res.status(200).json({});
                }
                else { 
                    res.status(200).json({departure:outboundGetaway.flightCode, arrival:inboundGetaway.flightCode});
                }
            }, backTime.toISOString().slice(0, 13));
        }, time.toISOString().slice(0, 13));
    }
    catch (error) {
        next(error);
    }
});

// The function searches for all the places the estimated 
// departure time is earlier than the real departure time,
// and returns the amount of such instances.

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
    
// The function accepts two headers:
//    - country: used to query only flights from/to
//               the specified country.
//    - type: used to denote which type of flight the
//            function will count.
//            possibilities: ['all'/'inbound'/'outbound']
// The function will count all flights that were retrieved
// from the API according to the type that was received.
// the default type is 'all'.

app.get('/flightCount', (req, res) => {
    const inputCountry = req.header('country');
    const type = req.header('type');
    const query = inputCountry ? {'CHLOCCT':inputCountry} : '';
    ckanImport(flights => {
        const ret = flights.filter(flight => {
            return !flight.CHCINT;
        }).length;
        if (type === 'inbound') {
            res.status(200).send(ret);
        }
        else if (type === 'outbound') {
            res.status(200).send(flights.length - ret.toString());
        }
        else {
            res.status(200).send(flights.length.toString());
        } 
    }, query);
});

// The function uses a Map object to find out which
// city is the one that accepts most outbound flights,
// and therefore the most popular. It stores the number
// of times each city is found in the Map, and then
// iterates over it to find the largest.

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

// A useful way to handle all other routes as
// 'not found' and redirecting to an appropriate
// error response.

app.use((req, res, next) => {
    const error = new Error("not found")
    error.status = 404;
    next(error);
});

// A function that display the errors that were
// sent by the 'next' parameter all over the 
// application.

app.use((error, req, res, next) => {
    res.status = error.status || 500;
    res.json({
        status: error.status,
        message: error.message,
    })
});

module.exports = app;