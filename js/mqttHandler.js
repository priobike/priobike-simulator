let connectionRequestCounter = 0;

function mqttHandler()
{   
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
    }
}

function pairRequest(deviceID, deviceName)
{
    if(connected) {
        return;
    }
    console.log("PairRequest from: " + deviceName + ", deviceID: " + deviceID);

    connectionRequestCounter++;
    const messageID = 'message' + connectionRequestCounter;
    const html = `
        <h3>Verbindungsanfrage von ` + deviceName + `</h3>
        <p>Verbindungsanfrage</p>
        <button onclick="pair(` + deviceID + `, '` + deviceName + `', ` + messageID + `)">accept</button>
        <button onclick="removeMessage('` + messageID + `')">decline</button>`;
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

    // gib "Verbunden" Statusmeldung
    const messageID = 'connected';
    const html = `
        <h3>` + deviceName + `</h3>
        <p>Verbunden</p>`;
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
    if(!connected || connectedDeviceID != deviceID) {
        return;
    }

    // gib Rückmeldung an App das Verbindung getrennt wurde
    client.publish("simulation", '{"type":"StopRide", "deviceID":"' + connectedDeviceID + '"}');

    connected = false;
    connectedDeviceID = 0;
    connectedDeviceName = '';
    disconnectTimer = 0;
    console.log("Connection Closed");

    removeAllMessages();

    // gib "Getrennt" Statusmeldung
    const messageID = 'disconnected';
    const html = '<h3>Verbindung getrennt</h3>';
    createPopupMessage(messageID, html);
}

function nextCoordinate(deviceID, longitude, latitude, bearing)
{
    if(connectedDeviceID != deviceID) {
        return
    }

    // setze timer zurück da nun wieder Aktivität
    resetLogoutTimer(deviceID);

    moveToHandler(longitude, latitude, bearing);
}