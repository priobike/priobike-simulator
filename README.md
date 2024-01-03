# Server
Start a local server via python `python -m http.server` (will make webpage available @ <http://localhost:8000>) or use something like XAMPP

# MQTT
Use console or a MQTT client like *MQTT Explorer*.

## Login data:  
Protocol: ws://,   
Host: priobike.vkw.tu-dresden.de,  
Port: 20037,  
Basepath: mqtt,  
Username: simulatorb  
Password: Qe6irlBho9JJXbWHQQ1PB6qxHjtAHEJ9  

## Example requests
App:  
`{"type":"PairRequest", "deviceID":"123", "deviceName":"abc"}`
-> im Simulator anzeigen, auswählen  

Simulator:  
`{"type":"PairStart", "deviceID":"123"}`
-> in App bestätigen  

App:  
`{"type":"PairConfirm", "deviceID":"123"}`

App:  
`{"type":"NextCoordinate", "deviceID":"123", "longitude":"10.12345", "latitude":"50.12345", "bearing":"-80"}`

App:  
`{"type":"TrafficLight", "deviceID":"123", "tlID":"456", "longitude":"10.12345", "latitude":"50.12345", "bearing":"-80", "state":"red"}`

App:  
`{"type":"TrafficLightChange", "deviceID":"123", "tlID":"456", "state":"yellow", "timestamp":"..."}`

App/Simulator:  
`{"type":"StopRide", "deviceID":"123"}`
