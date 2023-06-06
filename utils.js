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
// a Promise while ckanImport uses a callback function parameter to execute
// code inside the function.

exports.importData = async (query='') => {
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
// This function retrieves the next flight that is available,
// according to certain conditions:
//    - the closest to time parameter.
//    - not from/to ISRAEL.
//    - inbound or outbound.
//    - departs from a certain country, when it's inbound.
// The two last conditions are sent from getaway when the
// function is called.

exports.getNextFlight = (flights, time, condition) => {
    console.log(time);
    const relevant = flights.filter(flight => {
        return (condition(flight.CHCINT, flight.CHLOCCT) &&
        exports.getDate(flight.CHPTOL).getTime() > time.getTime() &&
        flight.CHLOCCT != 'ISRAEL');
    })
    console.log(relevant);
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