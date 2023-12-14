const signalLayerIdPrefix = 'custom-threebox-signal-';
var trafficLights = {}; //the dictionary stores the tlID and the corresponding layerId and coords.

function addLayer(map, tb, signalColor, signalLayerId, coords) {
    const newModelOptions = {
        obj: `../3dModells/trafficlight_${signalColor}.gltf`,
        type: 'gltf',
        scale: { x: 1.0, y: 1.0, z: 1.0 },
        units: 'meters',
        rotation: { x: 90, y: 180, z: 0 }
    };

    if (!map.getLayer(signalLayerId)) {
        map.addLayer({
            id: signalLayerId,
            type: 'custom',
            renderingMode: '3d',
            onAdd: function (map, mbxContext) {
                window.tb = new Threebox(
                    map,
                    mbxContext,
                    { defaultLights: true }
                );
                tb.loadObj(newModelOptions, (model) => {
                    model.setCoords(coords);
                    tb.add(model);
                });
            },
            render: function (gl, matrix) {
                tb.update();
            }
        });
    }
}

//A test to see if the traffic lights on the initial page can be loaded.
function loadTrafficSignalModel(map, signalColor, signalLayerId) {
    
    map.on('style.load', () => {
        const coords = [10.006742457554765, 53.54106874310412];
        addLayer(map, tb, signalColor, signalLayerId, coords);
    });
}

//A test to see if the color of traffic lights on the initial page can be switched.
function changeSignalColor(map, signalColor, newSignalLayerId, signalLayerId) {
    const coords = [10.006742457554765, 53.54106874310412];
    addLayer(map, tb, signalColor, newSignalLayerId, coords);
    setTimeout(() => {
        if (map.getLayer(signalLayerId)) {
            map.removeLayer(signalLayerId);
        }
    }, 500);
}
//create layerID using timestamp
function createLayerID(){
    const Timestamp = new Date().getTime();
    const signalLayerId = `${signalLayerIdPrefix}${Timestamp}`;
    return signalLayerId;
}
//data.type === "TrafficLight"
function createTrafficLight(map, tlID, longitude, latitude){
    if (!window.tb) {
        console.error("tb is not defined.");
        return;
    }
    console.log("Creating traffic light:", tlID, longitude, latitude);
    var signalLayerId = createLayerID();
    var coords = [longitude, latitude];
    trafficLights[tlID] = {
        signalLayerId: signalLayerId,
        coords: coords,
    }
    //console.log("trafficLights[tlID]:" + trafficLights[tlID].signalLayerId + trafficLights[tlID].coords);
    addLayer(map, tb, 'grey', signalLayerId, coords);
}
//data.type === "TrafficLightChange"
function updateTrafficLight(map, tlID, state){
    console.log("Updating traffic light:", tlID, state);
    var oldTrafficLight = trafficLights[tlID];
    var newSignalLayerId = createLayerID();
    var coords = oldTrafficLight.coords;
    addLayer(map, tb, state, newSignalLayerId, coords);
    setTimeout(() => {
        if (oldTrafficLight && map.getLayer(oldTrafficLight.signalLayerId)) {
            map.removeLayer(oldTrafficLight.signalLayerId);
            delete trafficLights[tlID]; 
        }
    }, 500);
    trafficLights[tlID] = {
        signalLayerId: newSignalLayerId,
        coords: coords,
    }
}