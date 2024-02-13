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
    profile: "mapbox/cycling",
    interactive: true,
    antialias: true,
  });

  tb = window.tb = new Threebox(map, map.getCanvas().getContext("webgl"), {
    defaultLights: true,
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

var trafficLights = {};
var trafficLights3D = {};

function createTrafficLight3D(tlID, longitude, latitude, bearing) {
  if (trafficLights3D[tlID]) {
    console.log(`Traffic light (3D) ${tlID} already exists`);
    return;
  }
  map.addLayer({
    id: tlID,
    type: "custom",
    renderingMode: "3d",
    onAdd: function () {
      // Creative Commons License attribution:  Metlife Building model by https://sketchfab.com/NanoRay
      // https://sketchfab.com/3d-models/metlife-building-32d3a4a1810a4d64abb9547bb661f7f3
      const scale = 0.5;
      const options = {
        obj: "../3dModells/trafficlight_green.gltf",
        type: "gltf",
        scale: { x: scale, y: scale, z: scale },
        units: "meters",
        rotation: { x: 90, y: 0, z: 0 },
      };

      bearing = (360 - bearing + 180) % 360;

      tb.loadObj(options, (model) => {
        model.setCoords([longitude, latitude]);
        model.setRotation({ x: 0, y: 0, z: bearing });
        tb.add(model);
      });
    },

    render: function () {
      tb.update();
    },
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
  map
    .getSource("traffic_light")
    .setData({ type: "FeatureCollection", features: features });
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
  map
    .getSource("traffic_light")
    .setData({ type: "FeatureCollection", features: features });
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
