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
let minimap;
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

    // Initalize the minimap with starting values
    var minimap = new mapboxgl.Map({
        container: 'minimap', 
        center: [10.008, 53.541], 
        zoom: 11
    });

    tb = (window.tb = new Threebox(
        map,
        map.getCanvas().getContext('webgl'),
        {
            defaultLights: true
        }
    ));

    displayMap(map,minimap);

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

    // replace minimap marker with arrow
    const markerWrapper = document.getElementsByClassName('mapboxgl-marker')[0];
    markerWrapper.style.marginTop = "65px";
    markerWrapper.innerHTML = `
    <?xml version="1.0" encoding="iso-8859-1"?>
        <!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
        <svg fill="#000000" height="35px" width="35px" version="1.1" viewBox="0 0 511.995 511.995" xml:space="preserve">
        <g>
            <g>
                <path d="M509.758,480.649L275.091,11.315c-7.232-14.464-30.955-14.464-38.187,0L2.238,480.649
                    c-4.267,8.576-2.304,18.944,4.8,25.365c7.147,6.464,17.664,7.317,25.749,2.176l223.211-142.037l223.21,142.037
                    c3.52,2.219,7.488,3.328,11.456,3.328c5.141,0,10.261-1.856,14.293-5.504C512.062,499.593,514.024,489.225,509.758,480.649z"/>
            </g>
        </g>
    </svg>`;
};

function displayMap(map,minimap)
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

    // Füge eine leere Linie zur Minimap hinzu
    minimap.on('load', function() {
        map.addSource('minimap_line', {
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
            id: 'minimap_line',
            type: 'line',
            source: 'minimap_line',
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


    const marker = new mapboxgl.Marker({ color: 'black', rotation: 0 })
        .setLngLat([10.007901555262777, 53.54071265251261])
        .addTo(minimap);

    // on map move, update the minimap
    map.on('move', function() {
        minimap.setCenter(map.getCenter());
        minimap.setZoom(16);
        minimap.setBearing(map.getBearing());
        minimap.setPitch(10);
        marker.setLngLat(map.getCenter());
    });
}
