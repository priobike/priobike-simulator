# priobike-simulator

This repo contains code for a bike simulator that can be connected to the priobike app. This enables to show the priobike app inside with a real bike. A speedsensor and a bike trainer are required.

![priobike-simulator-demo](https://github.com/priobike/priobike-simulator/assets/33689888/66d62ac6-2727-4ba7-84d2-78a0d52ba71b)
Photo made at [Output DD](https://output-dd.de/blog/project-post/priobike-die-gruene-welle-app-fuer-radfahrende-in-hamburg/) 2024 where we presented the priobike app with this simulator.

[Learn more about PrioBike](https://github.com/priobike)

## Quickstart

Start a local server via:
```bash
SIMULATOR_MQTT_PASSWORD="<password>" python3 run-server.py
```

Open `localhost:8000` in the browser. 

In the priobike app. Navigate to internal settings -> "Simulator nutzen" -> Accept in Simulator -> Confirm in app.
When using a speedsensor make sure to select "Speed Sensor Daten" in the "Ortung" setting.
Select a route and start riding.

## API and CLI
### MQTT messages sent between simulator and app:

App(s):
`{"type":"PairRequest", "appID": "123", "deviceName":"abc"}`
-> displayed in the simulator (choose device from multiple requests)

Simulator:  
`{"type":"PairSimulatorAck", "appID": "123", "simulatorID": "456"}`
-> needs to be confirmed in app

App:  
`{"type":"PairAppAck", "appID": "123", "simulatorID": "456"}`

App:
`{"type": "RouteDataStart", "appID": "123", "simulatorID": "456", routeData: [{lon: 9.993682, lat: 53.551086}, {lon: 9.993686, lat: 53.551085}, {lon: 9.993792, lat: 53.551195}, ...]}` -> sends route information to simulator

App:  
`{"type":"NextCoordinate", "appID": "123", "simulatorID": "456", "longitude":"10.12345", "latitude":"50.12345", "bearing":"-80"}` -> updates the simulator about the next coordinate

App:  
`{"type":"TrafficLight", "appID": "123", "simulatorID": "456", "tlID":"456", "longitude":"10.12345", "latitude":"50.12345", "bearing":"-80", "state":"red"}` -> updates the simulator about traffic light information

App:  
`{"type":"TrafficLightChange", "appID": "123", "simulatorID": "456", "tlID":"456", "state":"yellow", "timestamp":"..."}` -> updates the simulator about traffic light changes

App:  
`{"type":"StopRide", "appID": "123", "simulatorID": "456", "stats" : "TODO"}` -> updates the simulator about the ride stop

App/Simulator:  
`{"type":"Unpair", "appID": "123", "simulatorID": "456"}` -> updates the counterpart about unpairing

## Contributing

We highly encourage you to open an issue or a pull request. You can also use our repository freely with the `MIT` license.

Every service runs through testing before it is deployed in our release setup. Read more in our [PrioBike deployment readme](https://github.com/priobike/.github/blob/main/wiki/deployment.md) to understand how specific branches/tags are deployed.

## Anything unclear?

Help us improve this documentation. If you have any problems or unclarities, feel free to open an issue.
