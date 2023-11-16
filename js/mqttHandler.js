function mqttHandler(client)
{   
    const topic = "simulation";
    
    client.on('connect', () => {
        console.log('Connected to MQTT broker');
        client.subscribe(topic, (err) => {
            if (!err) {
                console.log(`Subscribed to topic: ${topic}`);
            }
        });
    });
    
    client.on('message', (receivedTopic, message) => {
        console.log(`Received message on topic ${receivedTopic}: ${message.toString()}`);
        if(receivedTopic === "simulation") {
            handleMessage(message);
        }
    });

    client.publish(topic, "ein test");
}

function handleMessage(message)
{
    let json = {};
    try {
        json = JSON.parse(message.toString());   
    } catch (error) {
        console.log(error);
        return;
    }
    if(json.type === "PairRequest") {
        pairRequest(json.deviceID);
    } else if(json.type === "NextCoordinate") {

    }
}

function pairRequest(deviceID)
{
    if(!connected) {
        alert(deviceID);
        document.getElementById("connect").style.display = "block";
    }
}