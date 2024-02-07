let connected = false;
let connectedDeviceID = '';
let connectedDeviceName = '';
let disconnectTimer;
let connectionRequestCounter = 0;

let currentSignalColorIndex = 0;
const signalColors = ['red', 'yellow', 'green'];
let signalColor = 'red';
let signalLayerId = '';
let timestamp;

const credJSON = {
    "mapBoxToken":"pk.eyJ1Ijoic25ybXR0aHMiLCJhIjoiY2w0ZWVlcWt5MDAwZjNjbW5nMHNvN3kwNiJ9.upoSvMqKIFe3V_zPt1KxmA",
    "mqttUsername":"simulator",
    "mqttPassword":"Qe6irlBho9JJXbWHQQ1PB6qxHjtAHEJ9"
};

let map;
let minimap;
let client;

window.onload = (event) => {
    loadMap();
    connectToMqtt();  
};

function loadMap() {
    mapboxgl.accessToken = credJSON.mapBoxToken;
    map = new mapboxgl.Map({
        container: 'map',
        center: [10.007901555262777, 53.54071265251261],
        zoom: 21,
        pitch: 85,
        bearing: -80,
        profile: 'mapbox/cycling',
        interactive: true,
        antialias: true,
    });

    // Initalize the minimap with starting values
    minimap = new mapboxgl.Map({
        container: 'minimap', 
        center: [10.008, 53.541], 
        zoom: 14,
        interactive: false, // deaktiviere Maussteuerung
        profile: 'mapbox/cycling',
    });

    tb = (window.tb = new Threebox(
        map,
        map.getCanvas().getContext('webgl'),
        {
            defaultLights: true
        }
    ));

    const emptyLineGeometry = {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
    };

    map.on('load', function() {
        map.addSource('contrast_line', emptyLineGeometry);
        map.addLayer({
            id: 'contrast_line',
            type: 'line',
            source: 'contrast_line',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#000000', 'line-width': 26 },
        });    
        map.addSource('line', emptyLineGeometry);
        map.addLayer({
            id: 'line',
            type: 'line',
            source: 'line',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#6495ED', 'line-width': 25 },
        });
    });

    map.on('style.load', () => {
        map.setConfigProperty('basemap', 'lightPreset', 'day');
        map.setFog({ color: '#a0c6e8', 'horizon-blend': 1 });
    });

    map.on('move', function() {
        // Update minimap
        minimap.setCenter(map.getCenter());
        minimap.setZoom(14);
        minimap.setBearing(map.getBearing());
        minimap.setPitch(40);
    });

    minimap.on('load', function() {
        minimap.addSource('minimap_contrast_line', emptyLineGeometry);
        minimap.addLayer({
            id: 'minimap_contrast_line',
            type: 'line',
            source: 'minimap_contrast_line',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#000000', 'line-width': 8 },
        });
    
        // Füge eine leere Linie zur Minimap hinzu
        minimap.addSource('minimap_line', emptyLineGeometry);
        minimap.addLayer({
            id: 'minimap_line',
            type: 'line',
            source: 'minimap_line',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#6495ED', 'line-width': 7 },
        });
    });

    signalColor = signalColors[currentSignalColorIndex];
    signalLayerId = createLayerID();
    loadTrafficSignalModel(map,signalColor,signalLayerId);
}

function connectToMqtt(){
    client = mqtt.connect('ws://priobike.vkw.tu-dresden.de:20037/mqtt', {
        clientId: Math.floor(Math.random() * 10000),
        username: credJSON.mqttUsername,
        password: credJSON.mqttPassword
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
