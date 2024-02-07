function mqttHandler() {
    // verbinde mit mqtt broker 
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
    } else if(json.type === "NextCoordinate") {
        moveToHandler(json.longitude, json.latitude)
    } else if(json.type === "TrafficLight") {
        createTrafficLight(map, json.tlID, json.longitude, json.latitude, json.bearing)
    } else if(json.type === "TrafficLightChange") {
        updateTrafficLight(map, json.tlID, json.state)
    } else if(json.type === "FirstCoordinate") {
        map.flyTo({
            center: [json.longitude, json.latitude],
            bearing: json.bearing,
            zoom: 21,
            pitch: 0,
            duration: 5000,
            essential: true
        });
    } else if(Array.isArray(json) && json[0].type === "RouteDataStart") {
        recivedRouteHandler(json.slice(1));
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
            <button onclick="stopRide('` + deviceID + `')" aria-label="Close connection">
                <span class="material-symbols-outlined md-28">close</span>
            </button>
        </div>`;
    createPopupMessage(messageID, html);
}

function stopRide(deviceID) {
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

    // gib Rückmeldung an App das Verbindung getrennt wurde
    client.publish("simulation", '{"type":"StopRide", "deviceID":"' + tmpDeviceID + '"}');
}
