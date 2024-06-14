let client;
let connected = false;
let connectedDeviceID = "";
let deviceNameCandidate = "";
let connectedDeviceName = "";
let disconnectTimer;
let connectionRequestCounter = 0;
let currentRouteCoordinates = [];
let simulatorID = Math.floor(Math.random() * 999).toString();

function connectToMqtt() {
  client = mqtt.connect("ws://priobike.vkw.tu-dresden.de:20037/mqtt", {
    clientId: Math.floor(Math.random() * 10000),
    username: "simulator",
    password: "Qe6irlBho9JJXbWHQQ1PB6qxHjtAHEJ9",
  });

  client.on("connect", () => {
    console.log("Connected to MQTT broker");
    client.subscribe("app", (err) => {
      if (err) {
        console.error("Could not subscribe to topic");
      }
    });
  });

  client.on("message", (receivedTopic, message) => {
    console.log(
      `Received message on topic ${receivedTopic}: ${message.toString()}`
    );
    handleMessage(message);
  });

  // Set the simulator id.
  document.getElementById("simulator-info").innerText =
    "SimulatorID " + simulatorID;
}

function handleMessage(message) {
  let json = {};
  try {
    json = JSON.parse(message.toString());
  } catch (error) {
    console.error("Could not parse JSON");
    return;
  }

  // rufe spezifische Funktion für jeden Nachrichtentyp auf
  if (json.type === "PairRequest") {
    pairRequest(json.appID, json.deviceName);
    return;
  }

  if (json.simulatorID !== simulatorID) {
    return;
  }

  if (json.type == "PairAppAck") {
    connect(json.appID);
    return;
  }

  if (!connected || connectedDeviceID !== json.appID) {
    return;
  }

  if (json.type === "StopRide") {
    stopRide(json.appID);
    cleanUpTrafficLights();
  } else if (json.type === "Unpair") {
    unpair(json.appID);
    cleanUpTrafficLights();
  } else if (json.type === "NextCoordinate") {
    moveToHandler(json.longitude, json.latitude);
    speedChange(json.speed);
  } else if (json.type === "TrafficLights") {
    setTrafficLights(json.trafficLights);
  } else if (json.type === "TrafficLightChange") {
    updateTrafficLight3D(json.tlID, json.state);
    updateTrafficLight(json.tlID, json.state);
  } else if (json.type === "RouteDataStart") {
    currentRouteCoordinates = interpolate(json.routeData.slice(0), 100, 50).map(
      (p) => [p.lon, p.lat]
    );
    updateRouteLine(currentRouteCoordinates);
    unsetDriveInfo();
  } else if (json.type === "RideSummary") {
    displayRideSummary(json.rideSummary);
  } else {
    console.log("Invalid Message");
  }
}

function pairRequest(deviceID, deviceName) {
  if (connected) {
    return;
  }
  console.log("PairRequest from: " + deviceName + ", deviceID: " + deviceID);

  // entferne "Zur Zeit ist kein Gerät verbunden" message
  if (connectionRequestCounter === 0) {
    removeAllMessages();
  }
  connectionRequestCounter++;

  // gib message aus, das ein Gerät eine Anmeldungsanfrage gesendet hat
  const messageID = "message" + connectionRequestCounter;
  const html =
    `
        <div class="message-text">
            <span class="header">` +
    deviceName +
    ` (` +
    deviceID +
    `)</span>
            <span class="subtext">Verbindungsanfrage</span>
        </div>
        <div class="pair-buttons">
            <button onclick="onCloseClick(event)" data-message-id='` +
    messageID +
    `' aria-label="Decline pair request" class="btn-secondary">
                <span class="material-symbols-outlined md-28">close</span>
            </button>
            <button onclick="pair('` +
    deviceID +
    `', '` +
    deviceName +
    `', ` +
    messageID +
    `)" aria-label="Accept pair request">
                <span class="material-symbols-outlined md-36">check</span>
            </button>
        </div>`;
  createPopupMessage(messageID, html);
}

function pair(deviceID, deviceName) {
  deviceNameCandidate = deviceName;
  console.log("Device Candidate " + deviceName + ", deviceID: " + deviceID);

  // gib Rückmeldung an App das verbunden wurde
  client.publish(
    "simulator",
    '{"type":"PairSimulatorAck", "appID":"' +
      deviceID +
      '", "simulatorID": "' +
      simulatorID +
      '"}'
  );

  removeAllMessages();
  connectionRequestCounter = 0;

  const messageID = "waitingForConfirmation";
  const html =
    `
        <div class="message-text">
            <span class="header">` +
    deviceName +
    `</span>
            <span class="subtext">Warten auf Best&auml;tigung</span>
        </div>
        <div class="pair-buttons">
            <button onclick="sendUnpair('` +
    deviceID +
    `')" aria-label="Close connection">
                <span class="material-symbols-outlined md-28">close</span>
            </button>
        </div>`;
  createPopupMessage(messageID, html);
}

function connect(deviceID) {
  connected = true;
  connectedDeviceID = deviceID;
  connectedDeviceName = deviceNameCandidate;
  deviceNameCandidate = "";
  console.log(
    "Connected to " + connectedDeviceName + ", deviceID: " + deviceID
  );

  removeAllMessages();
  connectionRequestCounter = 0;

  // gib "Verbunden" Statusmeldung
  const messageID = "connected";
  const html =
    `
        <div class="pair-buttons">
            <button onclick="sendUnpair('` +
    deviceID +
    `')" aria-label="Close connection">
                <span class="material-symbols-outlined md-28">close</span>
            </button>
        </div>`;
  createPopupMessage(messageID, html);
}

/// Unpairs the simulator from the connected device.
function unpair(deviceID) {
  if (!connected || connectedDeviceID !== deviceID) {
    return;
  }

  removeAllMessages();
  // gib "Getrennt" Statusmeldung
  const messageID = "disconnected";
  const html = `
        <div class="message-text">
            <span class="header">Verbindung getrennt</span>
            <span class="subtext">Warten auf Anfragen</span>
        </div>
       `;
  createPopupMessage(messageID, html);
}

/// Unpairs the simulator from the connected device.
function sendUnpair(deviceID) {
  connected = false;
  connectedDeviceID = "";
  connectedDeviceName = "";
  disconnectTimer = 0;
  console.log("Connection Closed");

  removeAllMessages();

  // Reset to init position since this can be called any time.
  map.flyTo({
    center: [10.007901555262777, 53.54071265251261],
    zoom: 12,
    pitch: 50,
    bearing: 0,
    duration: 5000,
    essential: true,
  });

  // gib "Getrennt" Statusmeldung
  const messageID = "disconnected";
  const html = `
        <div class="message-text">
            <span class="header">Verbindung getrennt</span>
            <span class="subtext">Warten auf Anfragen</span>
        </div>
       `;
  createPopupMessage(messageID, html);

  // Send upair request
  client.publish(
    "simulator",
    '{"type":"Unpair", "appID":"' +
      deviceID +
      '", "simulatorID": "' +
      simulatorID +
      '"}'
  );
}

function stopRide() {
  // Remove the traffic lights and map data.
  // check if route layer exists
  if (map.getLayer("traffic_light")) {
    map.removeLayer("traffic_light");
  }
  if (map.getLayer("traffic_light_triangle")) {
    map.removeLayer("traffic_light_triangle");
  }

  updateRouteLine([]);

  // Zoom out to start position.
  map.flyTo({
    center: [10.007901555262777, 53.54071265251261],
    zoom: 12,
    pitch: 50,
    bearing: 0,
    duration: 5000,
    essential: true,
  });
}

function displayRideSummary(rideSummary) {
  // Format strings and display them in the info dialog.
  let distanceText = rideSummary.distanceKilometers + " km";
  let speedText = rideSummary.averageSpeed + " km/h";

  // Display info board.
  const infoContainer = document.getElementById("drive-info");

  const html =
    `
            <div class="drive-info">
                <div class="info-text">
                    <span class="header">Fahrt beendet!</span>
                </div>
                <div class="ride-summary">
                    <div class="content"><span>Zeit </span><span>` +
    rideSummary.formattedTime +
    `</span></div>
                    <div class="content"><span>Distanz </span><span>` +
    distanceText +
    `</span></div>
                    <div class="content"><span>Durchschnittsgeschwindigkeit</span><span>` +
    speedText +
    `</span></div>
                </div>
                <div class="info-text" style="padding-top: 2rem;">
                    <span class="header">Starte die n&auml;chste Fahrt oder trenne die Verbindung &uuml;ber die App.</span>
                </div>
            </div>
        `;

  infoContainer.innerHTML = html;
}

function unsetDriveInfo() {
  const infoContainer = document.getElementById("drive-info");
  infoContainer.innerHTML = "";
}
