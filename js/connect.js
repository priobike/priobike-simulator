function connectToMQTTBroker(username, password)
{
    const url = 'ws://priobike.vkw.tu-dresden.de:20037/mqtt';

    const options = {
        clientId: Math.floor(Math.random() * 10000),
        username: username,
        password: password
    };
    
    return mqtt.connect(url, options);
}