let client;
let connected = false;
let connectedDeviceID = '';
let deviceNameCandidate = '';
let connectedDeviceName = '';
let disconnectTimer;
let connectionRequestCounter = 0;
let currentRouteCoordinates = [];
let simulatorID = Math.floor(Math.random() * 999)

function connectToMqtt() {
    client = mqtt.connect('ws://priobike.vkw.tu-dresden.de:20037/mqtt', {
        clientId: Math.floor(Math.random() * 10000),
        username: "simulator",
        password: "Qe6irlBho9JJXbWHQQ1PB6qxHjtAHEJ9"
    });

    client.on('connect', () => {
        console.log('Connected to MQTT broker');
        client.subscribe("app", (err) => {
            if (err) {
                console.error("Could not subscribe to topic");
            }
        });
    });

    client.on('message', (receivedTopic, message) => {
        console.log(`Received message on topic ${receivedTopic}: ${message.toString()}`);
        handleMessage(message);
    });

    // Set the simulator id.
    document.getElementById("simulator-info").innerText = "SimulatorID " + simulatorID
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
        pairRequest(json.appID, json.deviceName);
        return;
    } 
    
    if(!connected || connectedDeviceID !== json.appID || json.simulatorID !== simulatorID) {
        return;
    }
    
    if (json.type == "PairAppAck") {
        connect(json.appID);
    } else if(json.type === "StopRide") {
        stopRide(json.appID);
    } else if(json.type === "Unpair") {
        unpair(json.appID);
    } else if(json.type === "NextCoordinate") {
        moveToHandler(json.longitude, json.latitude);
        speedChange(json.speed);
    } else if(json.type === "TrafficLight") {
        createTrafficLight(json.tlID, json.longitude, json.latitude, json.bearing);
    } else if(json.type === "TrafficLightChange") {
        updateTrafficLight(json.tlID, json.state);
    } else if(json.type === "RouteDataStart") {
        /// TODO update with new data format.
        currentRouteCoordinates = interpolate(json.routeData).map((p) => [p.lon, p.lat]);
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
    deviceNameCandidate = deviceName;
    console.log("Device Candidate " + deviceName + ", deviceID: " + deviceID);

    // gib Rückmeldung an App das verbunden wurde
    client.publish("simulator", '{"type":"PairSimulatorAck", "appID":"' + deviceID + '", "simulatorID": "' + simulatorID + '"}');

    removeAllMessages();
    connectionRequestCounter = 0;

    // gib "Verbunden" Statusmeldung
    const messageID = 'connected';
    const html = `
        <div class="message-text">
            <span class="header">` + deviceName + `</span>
            <span class="subtext">Warten auf Bestätigung</span>
        </div>
        <div class="pair-buttons">
            <button onclick="sendUnpair('` + deviceID + `')" aria-label="Close connection">
                <span class="material-symbols-outlined md-28">close</span>
            </button>
        </div>`;
    createPopupMessage(messageID, html);
}

function connect(deviceID)
{
    connected = true;
    connectedDeviceID = deviceID;
    connectedDeviceName = deviceNameCandidate
    deviceNameCandidate = ''
    console.log("Connected to " + deviceName + ", deviceID: " + deviceID);

    // gib Rückmeldung an App das verbunden wurde
    client.publish("simulator", '{"type":"PairSimulatorAck", "appID":"' + connectedDeviceID + '", "simulatorID": "' + simulatorID + '"}');

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
function sendUnpair()
{
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
    client.publish("simulator", '{"type":"Unpair", "appID":"' + tmpDeviceID + ', "simulatorID": ' + simulatorID + '"}');
}

function stopRide() {
    // Remove the traffic lights and map data.
    map.removeLayer('traffic_light');
    map.removeLayer('traffic_light_triangle');
    map.removeSource('traffic_light');
    updateRouteLine([]);

    // TODO Display info board.
    const infoContainer = document.getElementById("drive-info")

    const html = ""

    infoContainer.innerHTML = html



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
