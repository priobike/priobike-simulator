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

// mapbox token von priobike: pk.eyJ1Ijoic25ybXR0aHMiLCJhIjoiY2w0ZWVlcWt5MDAwZjNjbW5nMHNvN3kwNiJ9.upoSvMqKIFe3V_zPt1KxmA
const credJSON = JSON.parse(`{
    "mapBoxToken":"pk.eyJ1Ijoic25ybXR0aHMiLCJhIjoiY2w0ZWVlcWt5MDAwZjNjbW5nMHNvN3kwNiJ9.upoSvMqKIFe3V_zPt1KxmA",
    "mqttUsername":"simulator",
    "mqttPassword":"Qe6irlBho9JJXbWHQQ1PB6qxHjtAHEJ9"
}`);

let map;
mqttHandler();

window.onload = (event) => {
    mapboxgl.accessToken = credJSON.mapBoxToken;
    map = new mapboxgl.Map({
        container: 'map',
        center: [10.007901555262777, 53.54071265251261],
        zoom: 21,
        pitch: 85,
        bearing: -80,
        profile: 'mapbox/cycling',
        // antialising für custom layers; sehr performancelastig
        // antialias: true
    });
    tb = (window.tb = new Threebox(
        map,
        map.getCanvas().getContext('webgl'),
        {
            defaultLights: true
        }
    ));

    displayMap(map);

    createPopupMessage(
        "startMessage",
        `<div class="message-text">
            <span class="header">Zur Zeit ist kein Ger&auml;t verbunden</span>
            <span class="subtext">Um eine Verbindungsanfrage zu stellen, gehe in der App unter "Beta Features" auf "Mit der Simulation verbinden" um eine Anfrage zu stellen.</span>
        </div>`
    );

    const signalLayerIdPrefix = 'custom-threebox-signal-';
    signalColor = signalColors[currentSignalColorIndex];
    signalLayerId = createLayerID();
    //const signalLayerId = 'custom-threebox-signal';
    loadTrafficSignalModel(map,signalColor,signalLayerId);

    const changeLightButton = document.getElementById('changeLight');
    changeLightButton.addEventListener('click', () => {
        signalLayerId = `${signalLayerIdPrefix}${timestamp}`;
        // Update the current index for the next click
        currentSignalColorIndex = (currentSignalColorIndex + 1) % signalColors.length;

        const currentColor = signalColors[currentSignalColorIndex];
        const newSignalLayerId = createLayerID();
        // Change the signal color
        changeSignalColor(map, currentColor, newSignalLayerId, signalLayerId);
    });
    const mockData = [
        { type: "TrafficLight",deviceID:"178be",tlID:"hamburg/328_36",longitude:"9.9507419",latitude:"53.5558168"},
        { type: "TrafficLightChange", deviceID:"178be",tlID:"hamburg/328_36",state:"red" },
    ];
    mockData.forEach(data => {
        if (data.type === "TrafficLight") {
            map.on('load', function() {
                createTrafficLight(map, data.tlID, data.longitude, data.latitude);
            });
        } else if (data.type === "TrafficLightChange") {
            map.on('load', function() {
                updateTrafficLight(map, data.tlID, data.state);
            });
        }
    });
};

function displayMap(map)
{
    // Add 1st 3D Building On Button Click
    const button = document.getElementById('building1');
    button.addEventListener('click', () => {
        // Load GLTF model using Three.js
        map.addLayer({
                id: 'custom-threebox-model1',
                type: 'custom',
                renderingMode: '3d',
                onAdd: function () {
                    // Creative Commons License attribution:  Metlife Building model by https://sketchfab.com/NanoRay
                    // https://sketchfab.com/3d-models/metlife-building-32d3a4a1810a4d64abb9547bb661f7f3
                    const scale = 3.2;
                    const options = {
                        obj: 'https://docs.mapbox.com/mapbox-gl-js/assets/metlife-building.gltf',
                        type: 'gltf',
                        scale: { x: scale, y: scale, z: 2.7 },
                        units: 'meters',
                        rotation: { x: 90, y: -90, z: 0 }
                    };

                    tb.loadObj(options, (model) => {
                        model.setCoords([10.006742457554765, 53.54106874310412]);
                        model.setRotation({ x: 0, y: 0, z: 241 });
                        tb.add(model);
                    });
                },

                render: function () {
                    tb.update();
                }
        });
    });

    // Add 2nd 3D Building On Button Click
    const button2 = document.getElementById('building2');
    button2.addEventListener('click', () => {
        // Load GLTF model using Three.js
        map.addLayer({
                id: 'custom-threebox-model2',
                type: 'custom',
                renderingMode: '3d',
                onAdd: function () {
                    // Creative Commons License attribution:  Metlife Building model by https://sketchfab.com/NanoRay
                    // https://sketchfab.com/3d-models/metlife-building-32d3a4a1810a4d64abb9547bb661f7f3
                    const scale = 3.2;
                    const options = {
                        obj: 'https://docs.mapbox.com/mapbox-gl-js/assets/metlife-building.gltf',
                        type: 'gltf',
                        scale: { x: scale, y: scale, z: 2.7 },
                        units: 'meters',
                        rotation: { x: 90, y: -90, z: 0 }
                    };

                    tb.loadObj(options, (model) => {
                        model.setCoords([10.005742457554765, 53.54206874310412]);
                        model.setRotation({ x: 0, y: 0, z: 241 });
                        tb.add(model);
                    });
                },

                render: function () {
                    tb.update();
                }
        });
    });

    // Füge eine leere Linie zur Karte hinzu
    map.on('load', function() {
        map.addSource('line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          }
        });
        map.addLayer({
          id: 'line',
          type: 'line',
          source: 'line',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#888',
            'line-width': 8
          }
        });
      });


    // Fly By Clicking Button
    let nextPosition = 1;
    document.getElementById('fly').addEventListener('click', () => {
        if(nextPosition > 7)
        {
            nextPosition = 0;
        }
        const target = testRoute2[nextPosition];

        moveToHandler(target["center"][0],target["center"][1],target["bearing"])

        document.getElementById('info3').innerHTML = 'aktuelle Zielkoordinaten:' + JSON.stringify(target);

        nextPosition++;
    });

    // eslint-disable-next-line no-undef
    const tb = (window.tb = new Threebox(
        map,
        map.getCanvas().getContext('webgl'),
        {
            defaultLights: true
        }
    ));

    // lade GL 3 Standard Style
    map.on('style.load', () => {
      map.setConfigProperty('basemap', 'lightPreset', 'dusk');

    //   map.addLayer({
    //     id: 'custom-threebox-model1',
    //     type: 'custom',
    //     renderingMode: '3d',
    //     onAdd: function () {
    //         // Creative Commons License attribution:  Metlife Building model by https://sketchfab.com/NanoRay
    //         // https://sketchfab.com/3d-models/metlife-building-32d3a4a1810a4d64abb9547bb661f7f3
    //         const scale = 3.2;
    //         const options = {
    //             obj: 'https://docs.mapbox.com/mapbox-gl-js/assets/metlife-building.gltf',
    //             type: 'gltf',
    //             scale: { x: scale, y: scale, z: 2.7 },
    //             units: 'meters',
    //             rotation: { x: 90, y: -90, z: 0 }
    //         };

    //         tb.loadObj(options, (model) => {
    //             model.setCoords([10.006742457554765, 53.54106874310412]);
    //             model.setRotation({ x: 0, y: 0, z: 241 });
    //             tb.add(model);
    //         });
    //     },

    //     render: function () {
    //         tb.update();
    //     }
    //     });
    });

    // zeige Koordinaten
    map.on('mousemove', (e) => {
        document.getElementById('info1').innerHTML =
        'DOM Mausposition: ' +
        JSON.stringify(e.point) +
        '<br />Mausposition: ' +
        JSON.stringify(e.lngLat.wrap());
    });

    map.on('move', function() {
        const camera = map.getFreeCameraOptions();
        const cameraPosition = camera._position.toLngLat();

        document.getElementById('info2').innerHTML =
            'Kameraposition:\t' +
            cameraPosition +
            '<br />Fokuspunkt:\t' +
            map.getCenter() +
            '<br />Differenz CamPos Fokuspunkt:\t' +
            calculateDistance(map.getCenter()["lat"], map.getCenter()["lng"],cameraPosition["lat"], cameraPosition["lng"])+"\t"+
            '<br />aktueller Zoom: ' +
            map.getZoom() +
            '<br />aktueller Winkel: ' +
            map.getPitch() +
            '<br />aktueller Kameragradzahl: ' +
            map.getBearing() +
            '<br />Differenz CamPos Fokuspunkt:\t' +
            calculateDistance(testRoute2[nextPosition]["center"][1], testRoute2[nextPosition]["center"][0],cameraPosition["lat"], cameraPosition["lng"])
        ;
    });
}
