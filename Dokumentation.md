# Dokumentation

## Anbindung in der App (Charles Krüger)
Ich habe das Interface implementiert, um den Server mit der App zu verbinden und die Kommunikation von der App-Seite aus via dem MQTT-Protokoll zu ermöglichen sowie auf Nachrichten des Servers u.a. beim Bestätigen der Verbindung zu reagieren. <br>

#### Simulator aktivieren
Um das umzusetzen, habe ich zuerst eine Einstellungen in den "Internal Features" der PrioBike-App hinzugefügt, sodass der Simulator erstmal grundsätzlich aktiviert werden kann, da die Nutzung des Simulators nur für einen kleinen Bruchteil aller PrioBike-Nutzer von Relevanz ist. Wir hatten uns im Verlauf des Komplex-Praktikums darauf geeinigt, dass wir den Simulator erstmal nur als internes Feature implementieren, wobei auch die Möglichkeit besteht, dieses Feature in der Zukunft öffentlich bereitszustellen, wenn dies Sinn ergibt.<br>
Nachdem man den Simulator in der App aktiviert hat, kann man die automatisch erzeugte individuelle Device-ID nutzen, um sich mit dem Server zu verbinden.<br>

#### Simulation starten
Dazu muss man nur auf dem gewohnten Wege eine Fahrt starten. Die Simulation funktioniert mit beliebigen Routen in Hamburg.<br>
Anstatt aber wie sonst die Fahrt direkt in der App beginnen zu können, wird man mit aktiviertem Simulator aufgefordert, die Verbindung mit dem Server zu bestätigen oder den Simulator auszuschalten. Im Hintergrund wird automatisch ein `PairRequest` via MQTT an den Server geschickt. Um die Verbindung zu bestätigen, muss man beim Server die Verbindung mit der passenden Device-ID annehmen, woraufhin ein `PairConfirm` vom Server an die App geschickt wird. Die App wartet auf diese Nachricht.<br>
Sobald das Pairing zwischen App und Server erfolgreich war, kann die Fahrt gestartet werden.<br>
Von der App werden daraufhin alle Weg-Punkte der geplanten Route mit Latitude und Longitude geschickt, sowie alle Ampeln auf der Route und die Start-Position der Fahrt. Der Server kann mit diesen Daten die Simulation vorbereiten, Ampeln an den richtigen Stellen platzieren und sie korrekt ausrichten. Dann beginnt die Fahrt.<br>
Für den Nutzer verläuft ab dem Punkt alle wie jeder normale Fahrt der Priobike-App. Im Hintergrund sendet die App allerdings konstant Daten über den eigenen aktuellen Zustand und den Zustand der Ampeln.<br>
So wird ein Mal pro Sekunde die eigene Position mit Latitude, Longitude und Blickwinkel an den Simulator geschickt. Zudem werden alle Änderungen der Zustände der Ampel bereitgestellt, sobald sie für in der App verfügbar sind. Dazu nutzen wir die Daten, die sowieso schon für die Zustände der Ampeln in der PrioBike-App genutzt wurden. Mit diesen Daten weiß der Server, wo man sich gerade befindet und wie die Ampeln darzustellen sind.<br>

#### Simulation beenden
Sobald man die Fahrt über die App beendet oder der Server die Simulation stoppt, wird ein `StopRide` gesendet. Je nachdem wer von beiden diese Nachricht sendet, wird beim jeweils anderen die Fahrt beendet.<br>
Die App befindet sich daraufhin wieder im Ausgangszustand und eine neue Simulation kann gestartet werden.

## Speedsensor (Katharina)
### Ausgangslage
Der für das Praktikum bereitgestellte "Garmin SpeedSensor2" war unbenutzt, daher war von einer vollen Funktionalität auszugehen. Vonseiten des Herstellers gab es über die Bedienungsanleitung hinaus keine weitere Dokumentation des Sensors. Weder das Datenformat, noch andere Parameter waren klar ersichtlich. 
### Erste Schritte
Ursprünglich war eine Nutzung des Ant+ Protokolls angedacht. Daher ging es zunächst auf die Suche nach einem geeigneten Flutter-Plugin, welches dieses Protokoll unterstützt. Die gefundenen Plugins waren entweder für das sehr gleichnamige Ant-Media oder aber schlecht maintained. <br>
Daher weitete ich die Suche nach Bluetooth-Low-Energy-Plugins aus. Das so gefundene "Flutter-Blue-Plus"-Plugin erschien geeignet.
### Integration - Testapp
Vor Integration in die Priobike-App erschien es sinnvoll, zunächst eine zusätzliche Flutter-App zu erstellen, die sich mit dem Sensor verbinden & die empfangenen Daten auswerten kann. Das Flutter-Blue-Plus-Plugin stellt eine Beispiel-App bereit, welche ich dafür zunächst verwendet habe. Mithilfe dieser konnte ich mich mit dem Speedsensor verbinden und anschließend alle angebotenen Bluetooth-Services sowieso deren Charakteristiken auslesen. <br>
**Wichtig: Die verwendete Version des Flutter-Blue-Plus-Plugins ist 1.20.4 - eine Nutzung der neuesten Version ist (Stand 01.02.2024) nicht möglich.**<br>
Nach Auslesen aller Charakteristiken ergab sich, dass der für die Geschwindigkeitsermittlung relevante Service die UUID _00001816-0000-1000-8000-00805F9B34FB_ hat. Die benötigte Charakteristik innerhalb dieses Services hat die UUID _00002A5B-0000-1000-8000-00805F9B34FB_. Unter Nutzung der neuesten Plugin-Version sind diese leider nicht mehr vorzufinden. <br>
Das Verbinden mit dem Sensor sowie das Subscriben auf die benötigte Charakteristik soll fortan auch automatisch passieren. Dafür wurde die Testapp um den entsprechenden Code erweitert. 
#### Datenformat
Das vorgefundene Datenformat besteht aus 7 byte. Durch Aufnehmen mehrerer Messreihen mit unterschiedlichen Drehungsverhalten konnte ich folgende Bedeutungen der vorgefundenen Daten herleiten:<br>
[a, b, c, d, e, f, g]<br>
  a= [constantly 1] -> probably status byte<br>
  b= current number of rotations<br>
  c= increased by one, if b would have been higher than 255<br>
  -> c++, if new_b % 255 < previous_b % 255<br>
  f= current angle<br>
  g= difference between current f and previously sent f<br>
  d= [constantly 0]<br>
  e= [constantly 0]
#### Geschwindigkeitsberechnung
Nachdem die Datenlage klar war, ging es weiter mit der ersten Implementation der Geschwindigkeitsberechnung. Dies geschah ebenfalls noch in der Testapp. Der dafür relevante Wert **b** muss dafür betrachtet werden. Um die Rotationsdifferenz **r_diff** zwischen dem aktuellen Wert **b** und dem vorherigen zu erhalten, muss der in der vorherigen Iteration erhaltene Wert **b** (b_alt) vom aktuellen Wert **b** substrahiert werden. <br>
Ebenso muss die Zeitdifferenz **t_diff** (in Sekunden) zwischen beiden Datenerhalten gemessen werden. Aus diesen beiden Werten lässt sich anschließend die Geschwindigkeit **V** wie folgt berechnen: <br>
    t_diff = t - t_alt <br>
    r_diff = b - b_alt <br>
    V = r_diff/t_diff * umfang_rad_in_meter <br>
Durch Multiplizieren von **V** mit 3,6 erfolgt die Umrechnung von m/s zu km/h.  <b>
Da **b** als byte dargestellt ist, ist davon auszugehen, dass es bei Werten größer 255 wieder bei 0 beginnt. Dafür ist der Wert **c** zu betrachten, welcher uns Aufschluss darüber gibt, ob dies passiert ist. In diesem Fall gilt: <br>
    wenn c größer c_alt:
        r_diff += 255 <br>
Logischerweise hat dies vor der Berechnung von **V** zu passieren. 
### Integration - Priobike
N

## Kommunikation zwischen App und Simulator (Lyn)
Meine primäre Aufgabe war es, ein Konzept für die Kommunikation zwischen App und Simultor zu entwickeln und die Infrastruktur dafür aufzusetzen. Außerdem habe ich noch bei der Sensor-Einbindung in die Priobike App mitgearbeitet.

### Kommunikation zwischen App und Simulator
#### Grundlegende Überlegungen
Ich habe zunächst gesammelt, welche Anforderungen wir haben, welche Möglichkeiten es für die Kommunikation gäbe und was deren Vor- und Nachteile für uns wären.

Folgende Kriterien hielten wir für wichtig:
- möglichst niedrige Latenz zwischen dem Treten in die Pedale und der Simulation
- möglichst unkompliziertes Setup und einfache Nutzbarkeit
- parallele Nutzbarkeit von potenziell mehreren Simulatoren, sowie Pairing des Simulators mit einem Smartphone
- Authentisierung der Verbindung

Eine grundlegende Frage war, ob wir eine direkte Verbindung zwischen App und dem Simulator benutzen wollen, oder den Umweg über einen Server nehmen. Letzteres hat zwar den Nachteil leicht höherer Latenz, ist aber dafür wesentlich einfacher: Man kann auf einem beliebigen Rechner den Simulator im Browser aufrufen, und braucht keine weitere Software und muss keine Ports freigeben. Die Verbindung kann so auch einfach übers Internet laufen, anstatt dass man im gleichen lokalen Netzwerk sein muss. Wir haben uns daher schnell dazu entschieden, einen Server zu verwenden.

Als nächstes war zu klären, ob wir MQTT oder ein eigenes kleines Backend (mit Kommunikation über WebSockets) nutzen wollen. Ein eigens entwickeltes Backend würde die Flexibilität bieten, exakt unsere Anforderungen umzusetzen, aber bedeutet natürlich auch mehr Arbeit für uns sowie Maintenance Burden. Ich vermutete aber, dass MQTT für unseren Anwendungsfall gut geeignet wäre, und nach Absprache mit der Gruppe haben wir uns auch dafür entschieden.

#### MQTT Broker
Die Entscheidung ist auf den populären Broker Mosquitto gefallen, der konfigurierbare Authentisierung sowie die Möglichkeit bietet, alternativ zu MQTT über WebSockets eine Verbindung aufzubauen, was wichtig für die Verwendung im Browser ist. Ich habe erst bei mir lokal probiert, eine Mosquitto-Instanz mit Docker-Compose aufzusetzen, und habe dann [eine PR](https://github.com/priobike/priobike-deployment-docker/pull/21) im priobike-deployment-docker Repo erstellt. Hier konnte ich mich an bereits bestehenden Mosquitto-Deployments von Priobike orientieren. Ich habe je einen User mit Passwort für die App und den Simulator angelegt und vorerst eingestellt, dass die App lesen und schreiben darf, und der Simulator nur lesen.

Es haben sich leider Probleme bei der Verbindung via WebSockets ergeben, deren Ursache wir nicht finden konnten. Deswegen wurde für uns eine HiveMQ-Instanz als Ersatz aufgesetzt. Damit funktionierte dann alles problemlos. Nur die Authentisierung musste noch konfiguriert werden, was sich als etwas komplizierter als bei Mosquitto herausgestellt hat. Ich musste dafür ein Dockerfile schreiben, was dem HiveMQ-Image ein Plugin für die Authentisierung hinzufügt. Auch dafür habe ich [eine PR](https://github.com/priobike/priobike-deployment-docker/pull/29) erstellt.

#### Protokoll


## Simulator: Bewegung und Route (Simon)
Meine Aufgabe war es, den Simulator den empfangenen GPS-Koordinaten folgen zu lassen. Die gesamte Route wurde erst später in der Entwicklung übermittelt und wird nun im Simulator sowie auf der Minimap angezeigt.
#### Grundidee hinter Bewegung des Simulators
Während der Fahrt werden in etwa einsekündigen Abständen neue GPS-Koordinaten übermittelt, zu denen der Simulator mithilfe der Mapbox-Funktion map.easeTo(...) bewegt wird. Dabei werden als Parameter ein hoher Zoom und ein Pitch übergeben, um die Kamera knapp über dem Boden zu positionieren. <br>

Eine Herausforderung bestand darin, dass die Kameraposition nicht direkt festgelegt wird, sondern anhand des Fokuspunkts (ungefähr in der Bildmitte) und weiterer Parameter bestimmt wird. Die Funktion getFinalLatLong() berechnet daher einen Punkt auf der Erde basierend auf dem gegebenen Bearing (Blickrichtung/Winkel) und einer festgelegten Distanz. <br>

Ein weiteres Problem ist die nur sekündlich erfolgende Aktualisierung der Position, wodurch der Simulator eine Latenz von mindestens 1-2 Sekunden hat. Für den Fahrer sollte jedoch nur die 1-sekündige Latenz spürbar sein, da die Geschwindigkeitsänderung erst zu diesem Zeitpunkt dargestellt wird. Dass die Position erst eine weitere Sekunde später korrekt ist, sollte für den Fahrer aufgrund fehlender Orientierungspunkte im Simulator nicht erkennbar sein. <br>

#### Einbezug der gegebenen Route zur Blickrichtungsbestimmung
Die Vorgabe die Positionsänderung anhand der GPS-Updates der App vorzunehmen, ergab das Problem, mit welcher Blickrichtung die Kamerafahrt abgeschlossen werden soll. Die App übergibt ein Bearing, welches entweder grob der Richtung zum nächsten Punkt entspricht oder das Bearing ist welches die Karte verwendet. Das von der Karte verwendete Bearing richtiet sich auf Ampeln aus und ist teilweise seltsam in Kurven. Deshalb ist es nicht gut geeignet für den Simulator. Das Bearing zum nächsten Punkt hingegen hat bei scharfen Kurven das Problem, dass die Fahrt sehr ruckelt. <br>

Deshalb berechnet die funktion moveToHandler() ein eigenes Bearing. <br>

Dafür wird für alle Routensegmente der Abstand zum GPS-Punkt berechnet. Die Grundlegende Formel dafür ist die Heron Formel, die die Fläche des Aufgespannten Dreiecks der Segmentendpunkte und des GPS-Punktes zur Berechnung des Abstandes verwendet. Dabei wird vor der Berechnung überprüft, ob die Routenendpunkte am GPS-Punkt einen größeren Winkelabstand als 90 Grad haben. In diesem Fall wird das Routensegment nicht betrachtet. Dies ist notwendig falls der GPS-Punkt auf der verlängerten Line der Endpunkte liegt, da die Fläche in diesem Fall ebenfalls sehr klein werden kann. <br>

Wenn der GPS-Punkt kurz vor dem nächsten Routenpunkt angelangt ist, wird als Bearing ein Mittelwert aus dem Bearing zum nächsten und übernächsten Routenpunkt verwendet. Der Mittelwert wird in der Funktion findBearingMiddleValue360() berechnet. Dabei ist wichtig zu beachten, dass bei einem Überlauf in der Berechnung der invertierte Winkel berechnet werden kann. Deshalb wird der Winkel von einem Format (-180 bis 180 Grad) in das Format mit 0-360 Grad umgerechnet, da dort nur ein Überlauf bei 0 Grad beachtet werden muss. Die Funktion findBearingMiddleValue360() wählt entsprechend den Winkel mit dem kleineren Abstand zu den ursprünglich gegebenen Winkeln. <br>


#### Verwendung des Codes
Die moveToHandler() Funktion ruft alle weiteren Funktionen im Zusammenhang mit der Bewegung im Simulator von sich aus auf. Für die eigene Bearing Berechnung muss dafür zuvor die recivedRouteHandler() Funktion aufgerufen werden und die zu fahrende Route übergeben werden. Falls dies nicht möglich ist, wird das an moveToHandler übergebene Bearing verwendet. <br>

#### Anzeigen der Route
Es gibt sowohl die Route der Minimap als auch die Route auf der Straße. Zu beiden Routen gehört auch eine schwarze Konturlinie, die etwas größer unter der Hauptlinie liegt. Initialisiert werden die Linien in der `main.js`. Verändert wird die Route mit update_map_lines(), die die in der coordinates Liste liegenden Punkte als Polygonzug verbindet. Zu Debugging zwecken gibt es einen Code Abschnitt, der die Route immer bei Erhalt eines neuen GPS-Punktes nachzieht zsm. mit dem genutzten Bearing. Mit new mapboxgl.Marker() können alle Routenpunkte mit Markern angezeigt werden.

#### Bekannte Bugs
Da auf der Route größere Punkthaufen existieren können, die durch das Routing der App entstehen können, kann es vorkommen, dass bel. viele Punkte im Laufe der Route übersprungen werden. Deshalb werden immer alle Abstände zu allen Strecken berechnet, da bei einer Lokalen Suche es sonst zu einer Rückwärtsfahrt kommen kann. Dadurch entsteht das Problem, dass an Schnittpunkten der Route die Entfernung des GPS-Punktes zu dem falschen Routenabschnitt kürzer sein könnte. Dies geschieht jedoch nur sehr selten und hat ein einmaliges Ausbrechen der Kamera zur Folge. <br>
Die mathematische Komplexität des Codes verbunden mit leichten Ungenauigkeiten durch float Berechnungen könnten jedoch weitere Bugs schwer zu finden machen. Auch musste ich meinen Code bereits mehrfach stark überarbeiten. Es ist wie immer gut möglich, dass es weiterhin unvorhergesehene Bugs geben könnte.  
 

## Simulator MQTT Message Handling (Tom Starke)
Ich habe die Verarbeitung von MQTT Messages im Simulator implementiert, sowie das HTML- und JS-Grundgerüst angelegt.
#### Verbindungsaufbau zum MQTT Broker
Beim Starten des Simulators wird in der Datei `mqttHandler.js` eine Verbindung zum MQTT-Broker und zum Kanal "simulation" aufgebaut. Die Verbindungs-credentials sind dabei unter `main.js` und die Broker-Verbindungsdaten unter `mqttHandler.js` angelegt. <br>
Nach erfolgreicher Verbindung werden alle im Kanal publizierten Nachrichten entgegengenommen und in der Konsole ausgegeben.
#### Verarbeitung von Nachrichten
Eingehende MQTT Nachrichten werden als JSON geparsed und dann je nach "type" in eigenen Funktionen behandelt (`mqttHandler.js`). <br>
Dabei können mehrere Simulator-Umgebungen gleichzeitig laufen, denn der MQTT-Kanal ist für jeden Simulator der gleiche. Jede empfangene Nachricht wird  vorher auf ihre Device-ID geprüft. Nur Nachrichten, die die Device-ID des aktuell über die App mit dem Simulator verbundenen Geräts haben, werden verarbeitet. Anonsonsten wird eine Nachricht nicht beachtet. <br>
Solange der Simulator nicht mit der App verbunden ist, werden nur "PairRequest" Nachrichten angezeigt, sodass ein User sich über das Popup am oberen rechten Bildschirmrand mit der App verbinden kann.
#### Verbindung mit der App
PairRequest-Nachrichten erzeugen (vorausgesetzt der Simulator ist im Moment nicht mit der App verbunden) eine PopupMessage. Dabei wird dem Bestätigen-Button die Device-ID der App übergeben, die die Verbindungsanfrage gestellt hat. Sobald der User die Verbindung akzeptiert, wird die DeviceID als die aktuell verbundene gespeichert. <br>
Der Simulator gibt daraufhin eine PairStart-Nachricht an die App zurück um die erfolgreiche Paarung zu signalisieren.<br>
Zudem wird ein LogoutTimer gestartet. Dieser dient dem Zweck, eine Verbindung zur App nach einer festgelegten Zeit automatisch zu trennen, um den Simulator wieder für andere Nutzer freizugeben, wenn die App keine Nachrichten mehr sendet. Der Timer wird bei jeder eingehenden Nachricht der verbunden App zurückgesetzt, triggert also nur einen Logoff, wenn die verbundene App nichts mehr sendet. <br>
Beim Abmelden wird eine StopRide-Nachricht an die App gesendet, um der App die Abmeldung mitzuteilen.<br>
Alternativ kann eine Verbindung auch händisch über das x in der Popup Nachricht beendet werden, die oben rechts nach erfolgreichem Verbindungsaufbau angezeigt wird.
#### HTML
Das `index.html` file enthält zunächst CDN Links zu den verwendeten JS-Dateien, sowie zu den Simulator-eigenen.<br>
Die Infobox enthält Debugging Informationen, wie z.B. aktuelle Lon/Lat Koordinaten, Bearing, Zoomstufe und weitere Parameter. Standardmäßig wird sie über eine CSS-Anweisung ausgeblendet und kann für Debugging-Zwecke eingeblendet werden.<br>
Zuletzt gibt es noch eine Liste mit den angezeigten Popup Messages in der oberen rechten Bildschirmecke. Diese wird dynamisch mit Nachrichten gefüllt.

## Yenong

## Adrian

