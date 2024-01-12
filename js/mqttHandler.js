let client;

function mqttHandler()
{
    client = connectToMQTTBroker(credJSON.mqttUsername, credJSON.mqttPassword);

    const topic = "simulation";

    client.on('connect', () => {
        console.log('Connected to MQTT broker');
        client.subscribe(topic, (err) => {
            if (!err) {
                console.log(`Subscribed to topic: ${topic}`);
            } else {
                console.error("Could not subscribe to topic");
            }
        });
    });

    client.on('message', (receivedTopic, message) => {
        console.log(`Received message on topic ${receivedTopic}: ${message.toString()}`);
        handleMessage(message);
    });
}

function handleMessage(message)
{
    let json = {};
    try {
        json = JSON.parse(message.toString());
    } catch (error) {
        console.error("Could not parse JSON");
        return;
    }

    if(json.type === "PairRequest") {
        pairRequest(json.deviceID, json.deviceName);
    } else if(json.type === "StopRide") {
        stopRide(json.deviceID);
    } else if(json.type === "NextCoordinate") {
        nextCoordinate(json.deviceID, json.longitude, json.latitude, json.bearing);
    } else if(json.type === "TrafficLight") {
        trafficLight(json.deviceID, json.tlID, json.longitude, json.latitude, json.bearing);
    } else if(json.type === "TrafficLightChange") {
        trafficLightChange(json.deviceID, json.tlID, json.state);
    } else if(json.type === "FirstCoordinate") {
        firstCoordinate(json.deviceID, json.longitude, json.latitude, json.bearing);
    } else if(Array.isArray(json) && json[0].type === "RouteDataStart") {
        routeDataStart(json[0].deviceID, json.slice(1));
    } else {
        console.log("Invalid Message");
    }
}

function pairRequest(deviceID, deviceName)
{
    if(connected) {
        return;
    }
    console.log("PairRequest from: " + deviceName + ", deviceID: " + deviceID);

    // remove the "Zur Zeit ist kein Gerät verbunden" message initially
    if(connectionRequestCounter === 0) {
        removeAllMessages();
    }
    connectionRequestCounter++;

    const messageID = 'message' + connectionRequestCounter;
    const html = `
        <div class="message-text">
            <span class="header">` + deviceName + ` (` + deviceID + `)</span>
            <span class="subtext">Verbindungsanfrage</span>
        </div>
        <div class="pair-buttons">
            <button onclick="onCloseClick(event)" data-message-id='` + messageID + `' aria-label="Decline pair request" class="btn-secondary">
                <span class="material-symbols-outlined md-28">close</span>
            </button>
            <button onclick="pair('` + deviceID + `', '` + deviceName + `', ` + messageID + `)" aria-label="Accept pair request">
                <span class="material-symbols-outlined md-36">check</span>
            </button>
        </div>`;
    createPopupMessage(messageID, html);
}

function pair(deviceID, deviceName)
{
    connected = true;
    connectedDeviceID = deviceID;
    connectedDeviceName = deviceName;
    console.log("Connected to " + deviceName + ", deviceID: " + deviceID);

    // gib Rückmeldung an App das verbunden wurde
    client.publish("simulation", '{"type":"PairStart", "deviceID":"' + connectedDeviceID + '"}');

    removeAllMessages();
    connectionRequestCounter = 0;

    // gib "Verbunden" Statusmeldung
    const messageID = 'connected';
    const html = `
        <div class="message-text">
            <span class="header">` + deviceName + `</span>
            <span class="subtext">Verbunden</span>
        </div>
        <div class="pair-buttons">
            <button onclick="stopRide('` + deviceID + `')" aria-label="Close connection">
                <span class="material-symbols-outlined md-28">close</span>
            </button>
        </div>`;
    createPopupMessage(messageID, html);

    startLogoutTimer(deviceID);
}

// melde automatisch nach 60s ab wenn User keine Nachricht geschickt hat
function startLogoutTimer(deviceID) {
    disconnectTimer = setTimeout(function() {
      console.log('Automatic Logoff');
      stopRide(deviceID);
    }, 60000);
}

function resetLogoutTimer(deviceID) {
    clearTimeout(disconnectTimer);
    startLogoutTimer(deviceID);
}

function stopRide(deviceID)
{
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }

    connected = false;
    connectedDeviceID = '';
    connectedDeviceName = '';
    disconnectTimer = 0;
    console.log("Connection Closed");

    // gib Rückmeldung an App das Verbindung getrennt wurde
    client.publish("simulation", '{"type":"StopRide", "deviceID":"' + connectedDeviceID + '"}');

    removeAllMessages();

    // gib "Getrennt" Statusmeldung
    const messageID = 'disconnected';
    const html = '<h3>Verbindung getrennt</h3>';
    createPopupMessage(messageID, html);
}

function nextCoordinate(deviceID, longitude, latitude, bearing)
{
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }

    // setze timer zurück da nun wieder Aktivität
    resetLogoutTimer(deviceID);

    moveToHandler(longitude, latitude, bearing);
}

function trafficLight(deviceID, tlID, longitude, latitude, bearing)
{
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }

    // setze timer zurück da nun wieder Aktivität
    resetLogoutTimer(deviceID);

    createTrafficLight(map, tlID, longitude, latitude, bearing);
}

function trafficLightChange(deviceID, tlID, state)
{
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }

    // setze timer zurück da nun wieder Aktivität
    resetLogoutTimer(deviceID);

    updateTrafficLight(map, tlID, state);
}

function firstCoordinate(deviceID, longitude, latitude, bearing)
{
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }

    // setze timer zurück da nun wieder Aktivität
    resetLogoutTimer(deviceID);

    map.flyTo({
        center: [longitude, latitude],
        bearing: bearing,
        zoom: 21,
        pitch: 85,
        duration: 5000,
        essential: true
    });
}

function routeDataStart(deviceID, route)
{
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }

    // setze timer zurück da nun wieder Aktivität
    resetLogoutTimer(deviceID);

    // Sortiere, falls indexe nicht in der richtigen Reihenfolge sind
    route.sort(function(a, b) {
        return a.index - b.index;
    });
    
    // nur Koordinaten als array
    const coordinates = route.map(function(item) {
        return {
            "lon": item.lon,
            "lat": item.lat
        };
    });

    console.log(coordinates);
}

// TODO: Minimap
// TODO: Route zeichnen
// TODO: Ampeln kleiner