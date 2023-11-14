// simulator wartet auf app meldung mit der device id der app (ready to pair)
// alle simulatoren bekommen diese message und dann muss man da auf akzeptieren drücken und die handy id abspeichern

function connectToMQTTBroker(username, password)
{
    const url = 'ws://priobike.vkw.tu-dresden.de:20037/mqtt';

    const options = {
        clientId: "1",
        // username: username,
        // password: password
    };
    
    return mqtt.connect(url, options);
}