const apiAddress = "http://localhost:8080/";


const optionsList = document.getElementById('operations');
const applyButton = document.getElementById('apply_button');
const output = document.getElementById('results');


const upperToName = str => {
    return str.charAt(0) + str.slice(1).toLowerCase();
}


const addHeader = name => {
    const newAttribute = document.createElement('div');
    newAttribute.setAttribute('class', 'header-input');

    const attributeTitle = document.createElement('p');
    const node = document.createTextNode(name + ':');
    attributeTitle.appendChild(node);

    const attributeInput = document.createElement('input');
    attributeInput.setAttribute('id', name + 'Attribute');

    newAttribute.appendChild(attributeTitle);
    newAttribute.appendChild(attributeInput);
    return newAttribute;
};


const addHeaders = () => {
    const output = document.getElementById('attributes');
    output.innerHTML = '';
    const current = optionsList.value;
    const headers = [];
    if (current === 'getaway') {
        headers.push(addHeader('duration'));
    }
    else if (current === 'flightCount') {
        headers.push(addHeader('type'), addHeader('country'));
    }

    headers.forEach(attribute =>
        output.appendChild(attribute));
};


const showResults = async () => {
    output.innerHTML = "";
    const operation = optionsList.value;
    console.log('operation is: ' + operation);

    const headers = new Headers();

    if (operation === 'flightCount') {
        headers.append('type', document.getElementById('typeAttribute').value);
        headers.append('country', document.getElementById('countryAttribute').value);
    }
    else if (operation === 'getaway') {
        headers.append('duration', document.getElementById('durationAttribute').value);
    }

    try {
        const rawData = await fetch(apiAddress + operation, {
            methode: 'GET',
            headers: headers
        });

        const data = (operation === 'getaway') ? 
            await rawData.json() :
            await rawData.text();

        if (operation === 'delayedCount') {
            output.innerText = 'Number of delayed flights: ' + data + '.';
        }
        else if (operation === 'flightCount') {
            output.innerText = 'Number of flights: ' + data + '.';
        }
        else if (operation === 'mostPopularDestination') {
            output.innerText = 'Most popular destination is ' + upperToName(data) + '.';
        }
        else {
            if (Object.keys(data).length > 0) {
            output.innerText = 'Your getaway will depart with flight ' + data.departure +
                ', and arrive back with flight ' + data.arrival + '.';
            }
            else {
                output.innerText = 'Failed to find an available getaway plan; Please try again later.';
            }
        }
    }
    catch (error) {
        console.log('here');
        output.innerText = 'Error retrieving data - check the server status.';
    }
};


optionsList.addEventListener('change', addHeaders);
applyButton.addEventListener('click', showResults);
