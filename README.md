# Quickstart

Start a local server via

```bash
SIMULATOR_MQTT_PASSWORD="<password>" python3 run-server.py
```

# Requests / Responses

App(s):  
`{"type":"PairRequest", "appID": "123", "deviceName":"abc"}`
-> displayed in the simulator (choose device from multiple requests)

Simulator:  
`{"type":"PairSimulatorAck", "appID": "123", "simulatorID": "456"}`
-> needs to be confirmed

App:  
`{"type":"PairAppAck", "appID": "123", "simulatorID": "456"}`

App:
`{"type": "RouteDataStart", "appID": "123", "simulatorID": "456", routeData: [{lon: 9.993682, lat: 53.551086}, {lon: 9.993686, lat: 53.551085}, {lon: 9.993792, lat: 53.551195}, ...]}` -> sends route information

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
