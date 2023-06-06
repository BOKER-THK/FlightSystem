const ckan = require('ckan')

const client = new ckan.Client('https://data.gov.il');
client.requestType = 'GET';

//used for a fetch command in importData, no longer in use
const API_URL = 'https://data.gov.il/api/3/action/datastore_search?resource_id=e83f763b-b7d7-479e-b172-ae981ddc6de5&limit=300';


// Get the UTC formatted time
exports.getDate = date => {
    return new Date(date + 'Z');
};


// Insert GMT+2 into the time variable.
exports.getIsraelTime = () => {
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
// a Promise, while ckanImport uses a callback function parameter to use the
// data retrieved from the API.

exports.importData = async (query='') => {
    if (query) {
        query += '&q=' + JSON.stringify(query);
    }

    const rawData = await fetch(API_URL + query);
    const data = await rawData.json();
    return data.result.records;
};


// The function accepts two parameters:
//
//    - callback: a function that will be executed on a
//      successful fetching attempt.
//    - query: a ckan query that can filter the API.
//
// In case the fetch fails, we an error is thrown.

exports.ckanImport = (callback, query='') => {

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
// This function retrieves the next flight that's available,
// according to certain conditions:
//
//    - the closest to the 'time' parameter.
//    - not from/to ISRAEL.
//    - inbound or outbound.
//    - departs from a certain country (only for inbound).
//
// The last two conditions are determined by the value of the
// 'country' parameter - null means outbound, and a name of a
// country means it's inbound.

exports.getNextFlight = (flights, time, country) => {

    console.log(time);
    const relevant = flights.filter(flight => {
        return ((country ? (!flight.CHCINT && flight.CHLOCCT === country) : (flight.CHCINT)) &&
            exports.getDate(flight.CHPTOL).getTime() > time.getTime() &&
            flight.CHLOCCT != 'ISRAEL');
    });

    if (!relevant.length) {
        return {};
    }

    getawayFlight = {'flightCode': relevant[0].CHOPER + relevant[0].CHFLTN,
                    'time': exports.getDate(relevant[0].CHPTOL),
                    'country': relevant[0].CHLOCCT};

    for (let i = 1; i < relevant.length; i++) {
        const tempTime = exports.getDate(relevant[i].CHPTOL);
        if (getawayFlight.time.getTime() > tempTime.getTime()) {
            getawayFlight.flightCode = relevant[i].CHOPER + relevant[i].CHFLTN;
            getawayFlight.country = relevant[i].CHLOCCT;
            getawayFlight.time = tempTime;
        }
    }

    console.log(getawayFlight);
    return getawayFlight;
};


// This function calls ckanImport recursively until finding the
// next flight that is available according to the coditions specified
// in the getNextFlight function.
//
// It recieves 6 parameters:
//
//    - time : a Date object that contains the current hour the function
//             currently checks.
//    - resolve : a function to call in case a flight is found.
//    - reject : a function to call in case max_iter was reached.
//    - country : contains the country if the function searches for an
//                inbound flight, and null for an outbound flight.
//    - max_iter : the total number of hours checked by the function. each
//                 hour is checked in a different recursive call.
//    - iteration : a parameter that tracks the number of iterations
//                  executed so far.
//
// The default values are targeted at an outbound country that requires 2
// iterations. Those are the default values used for the outboundFlight call 
// in /getaway.
//
// The global varable iteration is used to track the progress of the function.

let iteration = 0;
exports.consecutiveHoursImport = (time, resolve, reject, country=null, max_iter=2) => {

    if (iteration === max_iter) {
        iteration=0;
        reject();
    }

    else {
        exports.ckanImport(backFlights => {
            const getawayFlight = exports.getNextFlight(backFlights, time, country);

            if (Object.keys(getawayFlight).length) {
                iteration=0;
                resolve(getawayFlight);
            }

            else {
                console.log('calling again');
                iteration++;
                exports.consecutiveHoursImport(new Date(time.getTime() + 1000*60*60),
                    resolve, reject, country, max_iter);
            }
        }, time.toISOString().slice(0, 13));
    }
};
