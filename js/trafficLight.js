const signalLayerIdPrefix = 'custom-threebox-signal-';
var trafficLights = {}; //the dictionary stores the tlID and the corresponding layerId and coords.
// let sportscycleModel;
function addLayer(map, tb, obj, signalLayerId, coords, bearing) {
    const newModelOptions = {
        obj: obj,
        type: 'gltf',
        scale: { x: 0.5, y: 0.5, z: 0.5 },
        units: 'meters',
        rotation: { x: 90, y: bearing, z: 0 }
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
                    // if(obj == `../3dModells/sportscycle.gltf`){
                    //     sportscycleModel = model;
                    // }
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
// function loadCycleModel(map, coords, bearing) {
//     //console.log("Load Cycle Model, coords + bearing:", coords, bearing);
//     var obj = `../3dModells/sportscycle.gltf`;
//     var signalLayerId = createLayerID();
//     map.on('style.load', () => {
//         addLayer(map, tb, obj, signalLayerId, coords, bearing);
//     });
// }
// function moveCycleModel(coords, bearing){
//     //console.log("update Cycle Model, coords + bearing:", coords, bearing);
//     sportscycleModel.setCoords(coords);
//     sportscycleModel.setRotation({ x: 0, y: 0 , z: -bearing});
// }

//A test to see if the traffic lights on the initial page can be loaded.
function loadTrafficSignalModel(map, signalColor, signalLayerId) {
    var obj = `../3dModells/trafficlight_${signalColor}.gltf`;
    map.on('style.load', () => {
        const coords = [10.006742457554765, 53.54106874310412];
        addLayer(map, tb, obj, signalLayerId, coords, 180);
    });
}

//A test to see if the color of traffic lights on the initial page can be switched.
function changeSignalColor(map, signalColor, newSignalLayerId, signalLayerId) {
    const coords = [10.006742457554765, 53.54106874310412];
    var obj = `../3dModells/trafficlight_${signalColor}.gltf`;
    addLayer(map, tb, obj, newSignalLayerId, coords, 180);
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
function createTrafficLight(map, tlID, longitude, latitude, bearing){
    if (!window.tb) {
        console.error("tb is not defined.");
        return;
    }
    var obj = `../3dModells/trafficlight_grey.gltf`;
    console.log("Creating traffic light:", tlID, longitude, latitude);
    var signalLayerId = createLayerID();
    var coords = [longitude, latitude];
    trafficLights[tlID] = {
        signalLayerId: signalLayerId,
        coords: coords,
        bearing: bearing,
    }
    //console.log("trafficLights[tlID]:" + trafficLights[tlID].signalLayerId + trafficLights[tlID].coords);
    addLayer(map, tb, obj, signalLayerId, coords, bearing);
}
//data.type === "TrafficLightChange"
function updateTrafficLight(map, tlID, state){
    console.log("Updating traffic light:", tlID, state);
    var oldTrafficLight = trafficLights[tlID];
    var newSignalLayerId = createLayerID();
    if(state == "green" || state == "red"){
        var obj = `../3dModells/trafficlight_${state}.gltf`;
    }
    else{
        var obj = `../3dModells/trafficlight_${yellow}.gltf`;
    }
    
    var coords = oldTrafficLight.coords;
    var bearing = oldTrafficLight.bearing;
    console.log("Change traffic light:", bearing);
    addLayer(map, tb, obj, newSignalLayerId, coords, bearing);
    delete trafficLights[tlID]; 
    setTimeout(() => {
        if (oldTrafficLight && map.getLayer(oldTrafficLight.signalLayerId)) {
            map.removeLayer(oldTrafficLight.signalLayerId);
        }
    }, 500);
    trafficLights[tlID] = {
        signalLayerId: newSignalLayerId,
        coords: coords,
        bearing: bearing,
    }
}