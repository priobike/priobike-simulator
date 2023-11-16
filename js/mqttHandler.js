function mqttHandler(client)
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

    client.publish(topic, "ein test");
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
        pairRequest(json.deviceID);
    } else if(json.type === "StopRide") {
        stopRide(json.deviceID);
    } else if(json.type === "NextCoordinate") {
        nextCoordinate(json.deviceID);
    }
}

function pairRequest(deviceID)
{
    if(connected || connecting) {
        return;
    }
    connecting = true;
    console.log("PairRequest from: " + deviceID);
    document.getElementById("messages").innerHTML = '<div id="connect"><h3>Verbindungsanfrage von ' + deviceID + '</h3><button class="mt-2" id="acceptPairBtn">Akzeptieren</button></div>';
    
    let waiting = true;
    const button = document.getElementById("acceptPairBtn");
    button.addEventListener('click', function handler() {
        waiting = false;
        this.removeEventListener('click', handler);
        document.getElementById("connect").remove();
        pair(deviceID);
    });
    
    // wait 10s until user clicks pairing button
    setTimeout(function handler() {
        if(waiting) {
            console.log('Pairing Request aborted');
            button.removeEventListener('click', handler);
            document.getElementById("connect").remove();
            connecting = false;
        }
    }, 10000);
}

function pair(deviceID)
{
    connected = true;
    connectedDeviceID = deviceID;
    console.log("Connected to " + deviceID);

    document.getElementById("messages").innerHTML = '<div id="connectSuccess"><h3>Verbindung zu ' + deviceID + ' aufgebaut</h3></div>';
    setTimeout(function handler() {
        document.getElementById("connectSuccess").remove();
    }, 3000);

    connecting = false;
}

function stopRide(deviceID)
{
    if(!connected || connectedDeviceID !== deviceID) {
        return;
    }
    connected = false;
    connectedDeviceID = '';
    console.log("Connection Closed");
    document.getElementById("messages").innerHTML = '<div id="connectClose"><h3>Verbindung zu ' + deviceID + ' getrennt</h3></div>';
    setTimeout(function handler() {
        document.getElementById("connectClose").remove();
    }, 3000);
}

function nextCoordinate(deviceID)
{
    
}