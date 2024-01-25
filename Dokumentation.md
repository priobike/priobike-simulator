# Dokumentation

## Adrian

## Charly
## Anbindung in der App (Charles Krüger)
Ich habe das Interface implementiert, um den Server mit der App zu verbinden und die Kommunikation von der App-Seite aus via dem MQTT-Protokoll zu ermöglichen sowie auf Nachrichten des Servers u.a. beim Bestätigen der Verbindung zu reagieren. <br>
Um das umzusetzen, habe ich zuerst eine Einstellungen in den "Internal Features" der PrioBike-App hinzugefügt, sodass der Simulator erstmal grundsätzlich aktiviert werden kann, da die Nutzung des Simulators nur für einen kleinen Bruchteil aller PrioBike-Nutzer von Relevanz ist. Wir hatten uns im Verlauf des Komplex-Praktikums darauf geeinigt, dass wir den Simulator erstmal nur als internes Feature implementieren, wobei auch die Möglichkeit besteht, dieses Feature in der Zukunft öffentlich bereitszustellen, wenn dies Sinn ergibt.<br>
Nachdem man den Simulator in der App aktiviert hat, kann man die automatisch erzeugte individuelle Device-ID nutzen, um sich mit dem Server zu verbinden.<br>
Dazu muss man nur auf dem gewohnten Wege eine Fahrt starten. Die Simulation funktioniert mit beliebigen Routen in Hamburg.<br>
Anstatt aber wie sonst die Fahrt direkt in der App beginnen zu können, wird man mit aktiviertem Simulator aufgefordert, die Verbindung mit dem Server zu bestätigen oder den Simulator auszuschalten. Im Hintergrund wird automatisch ein PairRequest via MQTT an den Server geschickt. Um die Verbindung zu bestätigen, muss man beim Server die Verbindung mit der passenden Device-ID annehmen, woraufhin ein PairConfirm vom Server an die App geschickt wird. Die App wartet auf diese Nachricht.<br>
Sobald das Pairing zwischen App und Server erfolgreich war, kann die Fahrt gestartet werden.<br>
Von der App werden daraufhin alle Weg-Punkte der geplanten Route mit Latitude und Longitude geschickt, sowie alle Ampeln auf der Route und die Start-Position der Fahrt. Der Server kann mit diesen Daten die Simulation vorbereiten, Ampeln an den richtigen Stellen platzieren und sie korrekt ausrichten. Dann beginnt die Fahrt.<br>
Für den Nutzer verläuft ab dem Punkt alle wie jeder normale Fahrt der Priobike-App. Im Hintergrund sendet die App allerdings konstant Daten über den eigenen aktuellen Zustand und den Zustand der Ampeln.<br>
So wird ein Mal pro Sekunde die aktuelle eigene Position mit Latitude, Longitude und Blickwinkel an den Simulator geschickt. Zudem werden alle Änderungen der Zustände der Ampel bereitgestellt, sobald sie für in der App verfügbar sind. Dazu nutzen wir die Daten, die sowieso schon für die Zustände der Ampeln in der PrioBike-App genutzt wurden. Mit diesen Daten weiß der Server, wo man sich gerade befindet und wie die Ampeln darzustellen sind.<br>
Sobald man die Fahrt über die App beendet oder der Server die Simulation stoppt, wird ein StopRide gesendet. Je nachdem wer von beiden diese Nachricht sendet, wird beim jeweils anderen die Fahrt beendet.<br>
Die App befindet sich daraufhin wieder im Ausgangszustand und eine neue Simulation kann gestartet werden.

## Katharina

## Lyn

## Simon

## Tom

## Yenong
