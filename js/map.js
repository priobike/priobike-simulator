let map;
let minimap;
let tb;

const emptyLineGeometry = {
  type: "geojson",
  data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
};

const emptyFeatureCollection = {
  type: "geojson",
  data: { type: "FeatureCollection", features: [] },
};

function loadMap() {
  mapboxgl.accessToken =
    "pk.eyJ1Ijoic25ybXR0aHMiLCJhIjoiY2w0ZWVlcWt5MDAwZjNjbW5nMHNvN3kwNiJ9.upoSvMqKIFe3V_zPt1KxmA";
  map = new mapboxgl.Map({
    container: "map",
    center: [10.007901555262777, 53.54071265251261],
    zoom: 12,
    pitch: 50,
    bearing: 0,
    interactive: true,
    antialias: true,
    style: "mapbox://styles/paulpickhardt/clskczfvv00cz01qugsppg91b",
  });

  // Initalize the minimap with starting values
  minimap = new mapboxgl.Map({
    container: "minimap",
    center: [10.008, 53.541],
    zoom: 13,
    interactive: false, // deaktiviere Maussteuerung
    profile: "mapbox/cycling",
    antialias: true,
  });

  map.on("load", function () {
    addRouteSourcesAndLayers(map, 30);
    addTrafficLightSourcesAndLayers(map, 1);
    add3DLayer(map);
  });
  map.on("style.load", () => {
    map.setConfigProperty("basemap", "lightPreset", "day");
    map.setFog({ color: "#a0c6e8", "horizon-blend": 1 });
  });
  minimap.on("load", function () {
    addRouteSourcesAndLayers(minimap, 8);
    addTrafficLightSourcesAndLayers(minimap, 0.2);
  });
  map.on("move", function () {
    // Update minimap
    minimap.setCenter(map.getCenter());
    minimap.setZoom(14);
    minimap.setBearing(map.getBearing());
    minimap.setPitch(40);
  });
}

function addRouteSourcesAndLayers(map, width) {
  map.addSource("contrast_line", emptyLineGeometry);
  map.addLayer({
    id: "contrast_line",
    type: "line",
    source: "contrast_line",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#000000", "line-width": width + 1 },
  });
  map.addSource("line", emptyLineGeometry);
  map.addLayer({
    id: "line",
    type: "line",
    source: "line",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#6495ED", "line-width": width },
  });
}

function addTrafficLightSourcesAndLayers(map, size) {
  let finished = 0;
  const images = [
    "../img/online-light-no-check.png",
    "../img/online-red-light.png",
    "../img/online-green-light.png",
    "../img/online-amber-light.png",
  ];
  for (let i = 0; i < images.length; i++) {
    map.loadImage(images[i], (error, image) => {
      if (error) throw error;
      const imageName = images[i].split("/").pop().split(".")[0];
      map.addImage(imageName, image);
      finished++;
      if (finished < images.length) return;

      console.log("All traffic light images loaded");
      map.addSource("traffic_light", emptyFeatureCollection);
      map.addLayer({
        id: "traffic_light_triangle",
        type: "symbol",
        source: "traffic_light",
        layout: {
          "icon-image": "online-light-no-check",
          "icon-size": size,
          "icon-allow-overlap": true,
        },
      });
      map.addLayer({
        id: "traffic_light",
        type: "symbol",
        source: "traffic_light",
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": size,
          "icon-allow-overlap": true,
        },
      });
    });
  }
}

function add3DLayer(map) {
  tb = window.tb = new Threebox(map, map.getCanvas().getContext("webgl"), {
    defaultLights: true,
  });

  map.addLayer({
    id: "custom_layer",
    type: "custom",
    renderingMode: "3d",
    onAdd: function () {},

    render: function () {
      tb.update();
    },
  });
}

var trafficLights3D = {};
var trafficLights = {};

// Expexts a list of objects with the following structure:
// [{
//   "tlID": "1",
//   "longitude": 10.007901555262777,
//   "latitude": 53.54071265251261,
//   "bearing": 0
// }]
function setTrafficLights(newTrafficLights) {
  cleanUpTrafficLights();
  for (let i = 0; i < newTrafficLights.length; i++) {
    let tl = newTrafficLights[i];
    createTrafficLight3D(tl.tlID, tl.longitude, tl.latitude, tl.bearing);
    createTrafficLight(tl.tlID, tl.longitude, tl.latitude, tl.bearing);
  }
}

function cleanUpTrafficLights() {
  minimap.getSource("traffic_light").setData(emptyFeatureCollection);
  for (let i = 0; i < trafficLights3D.length; i++) {
    if ("model" in trafficLights3D[i]) {
      tb.remove(trafficLights3D[i]["model"]);
    }
  }
  trafficLights3D = {};
  trafficLights = {};
}

function createTrafficLight3D(tlID, longitude, latitude, bearing) {
  if (tlID in trafficLights3D) {
    console.log(`Traffic light (3D) ${tlID} already exists`);
    return;
  }

  bearing = (360 - bearing + 180) % 360;

  trafficLights3D[tlID] = {
    getCoords: () => [longitude, latitude],
    getRotation: () => ({ z: bearing }),
  };

  const scale = 0.5;

  const options = {
    obj: `../3dModells/trafficlight_grey.gltf`,
    type: "gltf",
    scale: { x: scale, y: scale, z: scale },
    units: "meters",
    rotation: { x: 90, y: 0, z: 0 },
  };

  tb.loadObj(options, function (model) {
    model.setCoords([longitude, latitude]);
    model.setRotation({ x: 0, y: 0, z: bearing });
    tb.add(model);
    trafficLights3D[tlID]["model"] = model;
  });
}

function updateTrafficLight3D(tlID, state) {
  console.log(`Updating traffic light (3D) ${tlID} to state ${state}`);
  if (!(tlID in trafficLights3D)) {
    console.log(`Traffic light (3D) ${tlID} does not exist`);
    return;
  }

  let longitude = trafficLights3D[tlID].getCoords()[0];
  let latitude = trafficLights3D[tlID].getCoords()[1];
  let bearing = trafficLights3D[tlID].getRotation().z;

  let oldModel = trafficLights3D[tlID]["model"];

  const scale = 0.5;

  const options = {
    obj: `../3dModells/trafficlight_${state}.gltf`,
    type: "gltf",
    scale: { x: scale, y: scale, z: scale },
    units: "meters",
    rotation: { x: 90, y: 0, z: 0 },
  };

  tb.loadObj(options, function (model) {
    model.setCoords([longitude, latitude]);
    model.setRotation({ x: 0, y: 0, z: bearing });
    tb.add(model);
    trafficLights3D[tlID]["model"] = model;
    tb.remove(oldModel);
  });
}

function createTrafficLight(tlID, longitude, latitude, bearing) {
  if (trafficLights[tlID]) {
    console.log(`Traffic light ${tlID} already exists`);
    return;
  }
  const trafficLight = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    properties: {
      tlID: tlID,
      bearing: bearing,
      icon: "online-light-no-check",
    },
  };
  trafficLights[tlID] = trafficLight;

  // Update the source
  let features = [];
  for (let tlID in trafficLights) {
    features.push(trafficLights[tlID]);
  }

  minimap
    .getSource("traffic_light")
    .setData({ type: "FeatureCollection", features: features });
}

function updateTrafficLight(tlID, state) {
  console.log(`Updating traffic light ${tlID} to state ${state}`);
  let icon = "online-light-no-check";
  if (state === "red") {
    icon = "online-red-light";
  } else if (state === "green") {
    icon = "online-green-light";
  } else if (state === "amber") {
    icon = "online-amber-light";
  }
  trafficLights[tlID].properties.icon = icon;
  // Reset all others to no-check
  for (let tlIDOther in trafficLights) {
    if (tlID !== tlIDOther) {
      trafficLights[tlIDOther].properties.icon = "online-light-no-check";
    }
  }

  // Update the source
  let features = [];
  for (let tlID in trafficLights) {
    features.push(trafficLights[tlID]);
  }

  minimap
    .getSource("traffic_light")
    .setData({ type: "FeatureCollection", features: features });
}

function updateRouteLine(coordinates) {
  const lineData = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coordinates },
  };
  map.getSource("line").setData(lineData);
  map.getSource("contrast_line").setData(lineData);
  minimap.getSource("line").setData(lineData);
  minimap.getSource("contrast_line").setData(lineData);
}
