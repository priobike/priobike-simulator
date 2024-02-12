let client;
let connected = false;
let connectedDeviceID = '';
let connectedDeviceName = '';
let disconnectTimer;
let connectionRequestCounter = 0;
let currentRouteCoordinates = [];

function connectToMqtt() {
    client = mqtt.connect('ws://priobike.vkw.tu-dresden.de:20037/mqtt', {
        clientId: Math.floor(Math.random() * 10000),
        username: "simulator",
        password: "Qe6irlBho9JJXbWHQQ1PB6qxHjtAHEJ9"
    });

    client.on('connect', () => {
        console.log('Connected to MQTT broker');
        client.subscribe("simulation", (err) => {
            if (err) {
                console.error("Could not subscribe to topic");
            }
        });
    });

    client.on('message', (receivedTopic, message) => {
        console.log(`Received message on topic ${receivedTopic}: ${message.toString()}`);
        handleMessage(message);
    });
}

function handleMessage(message) {
    let json = {};
    try {
        json = JSON.parse(message.toString());
    } catch (error) {
        console.error("Could not parse JSON");
        return;
    }

    // rufe spezifische Funktion für jeden Nachrichtentyp auf
    if(json.type === "PairRequest") {
        pairRequest(json.deviceID, json.deviceName);
    } else if(json.type === "StopRide") {
        stopRide(json.deviceID);
    } else if(json.type === "Unpair") {
        unpair(json.deviceID);
    } else if(json.type === "NextCoordinate") {
        moveToHandler(json.longitude, json.latitude);
        speedChange(json.speed);
    } else if(json.type === "TrafficLight") {
        createTrafficLight(json.tlID, json.longitude, json.latitude, json.bearing);
    } else if(json.type === "TrafficLightChange") {
        updateTrafficLight(json.tlID, json.state);
    } else if(Array.isArray(json) && json[0].type === "RouteDataStart") {
        /// TODO update with new data format.
        currentRouteCoordinates = interpolate(json.slice(1), 100, 50).map((p) => [p.lon, p.lat]);
        updateRouteLine(currentRouteCoordinates);
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

    // entferne "Zur Zeit ist kein Gerät verbunden" message
    if(connectionRequestCounter === 0) {
        removeAllMessages();
    }
    connectionRequestCounter++;

    // gib message aus, das ein Gerät eine Anmeldungsanfrage gesendet hat
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
            <button onclick="sendUnpair('` + deviceID + `')" aria-label="Close connection">
                <span class="material-symbols-outlined md-28">close</span>
            </button>
        </div>`;
    createPopupMessage(messageID, html);
}

/// Unpairs the simulator from the connected device.
function unpair(deviceID)
{
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }

    const tmpDeviceID = connectedDeviceID;

    connected = false;
    connectedDeviceID = '';
    connectedDeviceName = '';
    disconnectTimer = 0;
    console.log("Connection Closed");

    removeAllMessages();
    // gib "Getrennt" Statusmeldung
    const messageID = 'disconnected';
    const html = '<h3>Verbindung getrennt</h3>';
    createPopupMessage(messageID, html);
}

/// Unpairs the simulator from the connected device.
function sendUnpair(deviceID)
{
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }

    const tmpDeviceID = connectedDeviceID;

    connected = false;
    connectedDeviceID = '';
    connectedDeviceName = '';
    disconnectTimer = 0;
    console.log("Connection Closed");

    removeAllMessages();
    // gib "Getrennt" Statusmeldung
    const messageID = 'disconnected';
    const html = '<h3>Verbindung getrennt</h3>';
    createPopupMessage(messageID, html);

    // Send upair request 
    client.publish("simulation", '{"type":"Unpair", "deviceID":"' + tmpDeviceID + '"}');
}

function stopRide(deviceID) {
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }

    // Remove the traffic lights and map data.
    map.removeLayer('traffic_light');
    map.removeLayer('traffic_light_triangle');
    map.removeSource('traffic_light');
    updateRouteLine([]);

    // TODO Display info board.


    // Zoom out to start position.
    map.flyTo({
        center: [10.007901555262777, 53.54071265251261],
        zoom: 12,
        pitch: 50,
        bearing: 0,
        duration: 5000,
        essential: true
    });
}
