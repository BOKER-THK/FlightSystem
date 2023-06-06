const express = require('express');
const utils = require('./utils');

const app = express();


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

        const time = utils.getIsraelTime();
        const duration = req.header('duration') || 1;

        utils.consecutiveHoursImport(time,
            (outboundGetaway) => {
                const backTime = new Date(outboundGetaway.time.getTime() + duration*60*60*1000);
                utils.consecutiveHoursImport(backTime,
                    (inboundGetaway) => {
                        res.status(200).json({ departure:outboundGetaway.flightCode,
                            arrival:inboundGetaway.flightCode });
                    }, 
                    () => { res.status(200).json({}); },
                    outboundGetaway.country, 24);
            },
            () => { res.status(200).json({}); }
        );
    }
    catch (error) {
        next(error);
    }
});

// The function searches for all the places the estimated 
// departure time is earlier than the real departure time,
// and returns the amount of such instances.

app.get('/delayedCount', (req, res) => {

    utils.ckanImport(flights => {
        let ret = 0;
        flights.forEach((flight, i) => {
            if (utils.getDate(flight.CHSTOL).getTime() < utils.getDate(flight.CHPTOL).getTime()) {
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

    utils.ckanImport(flights => {
        const ret = flights.filter(flight => {
            return !flight.CHCINT;
        }).length;

        if (type === 'inbound') {
            res.status(200).send(ret.toString());
        }
        else if (type === 'outbound') {
            res.status(200).send((flights.length - ret).toString());
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

    utils.ckanImport(flights => {
        const popularity = new Map();
        let mostPopular = '';

        flights = flights.filter(flight => {
            return flight.CHCINT;
        });

        flights.forEach(flight => {
            const city = flight.CHLOC1T;

            if (popularity.has(city)) {
                popularity.set(city, popularity.get(city) + 1);
            } 
            else {
                popularity.set(city, 1);
            }
        });

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
