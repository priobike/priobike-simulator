function addLayer(map, tb, signalColor, signalLayerId) {
    const newModelOptions = {
        obj: `../3dModells/trafficlight_${signalColor}.gltf`,
        type: 'gltf',
        scale: { x: 1.0, y: 1.0, z: 1.0 },
        units: 'meters',
        rotation: { x: 90, y: 180, z: 0 }
    };

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
                model.setCoords([10.006742457554765, 53.54106874310412]);
                tb.add(model);
            });
        },
        render: function (gl, matrix) {
            tb.update();
        }
    });
}

function loadTrafficSignalModel(map, signalColor, signalLayerId) {
    
    const scale = 1.0; 
    const options = {
        obj: `../3dModells/trafficlight_${signalColor}.gltf`,
        type: 'gltf',
        scale: { x: scale, y: scale, z: scale },
        units: 'meters',
        rotation: { x: 90, y: 180, z: 0 }
    };

    map.on('style.load', () => {
        addLayer(map, tb, signalColor, signalLayerId);
    });
}

function changeSignalColor(map, signalColor, signalLayerId) {
    const allLayers = map.getStyle().layers;
    const signalLayer = map.getLayer(signalLayerId);
    const layerExists = allLayers.some(layer => layer.id === signalLayerId);
    //if(layerExists){
        map.removeLayer(signalLayerId);
        map.on('style.load', () => {
            addLayer(map, tb, signalColor, signalLayerId);
        });

//     } else {
//         console.error(`Layer '${signalLayerId}' does not exist in the map's style.`);
//     }
}







