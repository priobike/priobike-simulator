# Dokumentation

## Anbindung in der App (Charles Krüger)
Ich habe das Interface implementiert, um den Server mit der App zu verbinden und die Kommunikation von der App-Seite aus via dem MQTT-Protokoll zu ermöglichen sowie auf Nachrichten des Servers u.a. beim Bestätigen der Verbindung zu reagieren. <br>
Die Funktionalität befindet sich hauptsächlich in `lib/simulator/services/simulator.dart`. <br>

#### Simulator aktivieren
Um den Simulator umzusetzen, habe ich zuerst eine Einstellungen in den "Internal Features" der PrioBike-App hinzugefügt, sodass der Simulator erstmal grundsätzlich aktiviert werden kann, da die Nutzung des Simulators nur für einen kleinen Bruchteil aller PrioBike-Nutzer von Relevanz ist. Wir hatten uns im Verlauf des Komplex-Praktikums darauf geeinigt, dass wir den Simulator erstmal nur als internes Feature implementieren, wobei auch die Möglichkeit besteht, dieses Feature in der Zukunft öffentlich bereitszustellen, wenn dies Sinn ergibt.<br>
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
**Wichtig: Die verwendete Version des Flutter-Blue-Plus-Plugins ist 1.20.8 - eine Nutzung der neuesten Version ist (Stand 01.02.2024) nicht möglich.**<br>
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
Durch Multiplizieren von **V** mit 3,6 erfolgt die Umrechnung von m/s zu km/h.  <br>
Da **b** als byte dargestellt ist, ist davon auszugehen, dass es bei Werten größer 255 wieder bei 0 beginnt. Dafür ist der Wert **c** zu betrachten, welcher uns Aufschluss darüber gibt, ob dies passiert ist. In diesem Fall gilt: <br>
        wenn c > c_alt: <br>
        r_diff += 255 <br>
Logischerweise hat dies vor der Berechnung von **V** zu passieren. 
**Hinweis: Ein modifizierter leicht rechenintensiverer Ansatz ist nötig, wenn sich c zwischen dem Datenerhalt um mehr als 1 erhöhen kann. Bei 28" Radgröße wäre dies bei ca 390km/h der Fall. Die Modifizierung wäre folgende:** <br>
  r_diff += 255 * (c-c_alt) <br>
Da der Geschwindigkeits-Weltrekord mit dem Fahrrad bei 296km/h liegt, wurde dieser Fall jedoch vernachlässigt. 
### Integration - Priobike
Nachdem in der Testapp das Verbinden & anschließende Auslesen des Sensors funktionierte, ging es an die Integration in die Zielapp - Priobike. Hier galt es zunächst, die bisherige Struktur der Anwendung zu verstehen & eine günstige Stelle für die Integration des Sensors zu finden. Da das Ziel die Geschwindigkeitsermittlung mithilfe des gegebenen Sensors ist, bietet sich der RideView der App an. Das dort bereits befindliche "Speedometer" dient bereits der Geschwindigkeitsanzeige. Um den Code aufgeräumter zu halten, habe ich mich zunächst für die Einführung einer neuen Klasse "GarminSpeedSensor" entschieden. Diese sollte im Speedometer (--> view.dart) lediglich aufgerufen werden und die entsprechenden Daten liefern. <br>
Dies verhinderte jedoch die Nutzung der in Flutter verbreiteten "setState()"-Aufrufe. Eine Implementation ohne diese erbrachte nicht die gewünschten Effekte. Das Flutter-Blue-Plus-Plugin zeigte keinerlei Funktionalität mehr & die Verbindung mit dem Sensor war dementsprechend ebenso nicht möglich. Hier vermutete ich zunächst ein dependency-Problem, weshalb ich die Version des Flutter-Blue-Plus-Plugins auf die aktuellste Version anglich. Dies brachte keine Veränderungen. <br>
Da die Implementation als normale Klasse nicht möglich war, erfolgte eine Änderung dieser hin zum Stateful-Widget. Damit sind "setState()"-Aufrufe nun möglich. Dies brachte einen Teilerfolg - die Funktionalität des genutzten Plugins war wiederhergestellt & die Verbindung zum Sensor war nun auch mit Priobike möglich. Das Erhalten der benötigten Services inklusive der Charakteristiken ging allerdings noch immer nicht. Nach einem intensiven Abgleich mit dem Code der Testapp blieb als einzige Lösung das Downgrade der Plugin-Version. Welche den erhofften Erfolg brachte. <br>
 Die zwischenzeitliche Vermutung eines Defekts des Sensors stellte sich als Fehlschluss heraus. <br>
Damit die Nutzung des Sensors optional bleibt, wurde gleichzeitig im Optionsmenü der App eine entsprechende Option hinzugefügt. Bei jedem Fahrtbeginn wird so zunächst geprüft, ob die Option aktiviert wurde. Ist dies der Fall, beginnt der Verbindungsprozess automatisch. Ansonsten ist weiterhin die Auswahl per Tippen auf das Speedometer aktiv. Ebenso die mittig angezeigte Geschwindigkeit wird nun vom Sensor-Widget geliefert. Dieses returned ein Text-Widget, welches die aktuelle Geschwindigkeit als Text enthält. <br>
Damit die Geschwindigkeit auch app-intern weiterverwendet werden kann, wird dem Sensor-Widget das "Positioning" als Parameter mitgegeben. Dieses berechnet u.a. aus der aktuellen Geschwindigkeit die neue Position. Nach jedem Erhalt neuer Daten, wird nun auch vom Sensor-Widget selbst, das Positioning geupdated. <br>
Da die vom Sensor erhaltenen Werte nicht immer korrekt waren, ist ebenso eine Behandlung fehlerhafter Werte vonnöten. Ebenso erscheint eine Glättung der erhaltenen Geschwindigkeitswerte für angebracht, um das Fahrgefühl zu verbessern. <br>
Um die Glättung angenehmer für den Nutzer zu gestalten, erschien mir die Verwendung einer exponentiellen Glättung angebrachter, als die simplerere lineare, da die exponentielle Glättung neue Werte mit höherer Gewichtung einbringt. Die Implementation der Behandlung fehlerhafter Daten sowie der Glättung geschah durch Lyn.

### Fehlerbehandlung, Glättung (Lyn)
Uns ist aufgefallen, dass die Umdrehungszahl und somit die berechnete Geschwindigkeit manchmal kurz auf 0 springt. Es stellte sich heraus, dass der Sensor ab und zu die letzten Messwerte exakt wiederholt. Diesen Fall konnte ich behandeln, indem genau duplizierte Messwerte einmalig ignoriert werden. Da auch wenn der Sensor zum Stillstand gebracht wird mehrfach die gleichen Messwerte auftreten, führt dies leider zu einer *Verzögerung beim Anhalten*. Man könnte noch versuchen, anhand des Winkel-Änderungs-Messwerts eine Fallunterscheidung zu machen, ob der Sensor still steht oder tatsächlich den letzten Wert in Bewegung fälschlicherweise wiederholt hat. 

Da die Messwerte auch bei konstanter Geschwindigkeit fluktuieren, habe ich eine lineare Glättung der Drehzahl anhand der letzten 5 Werte implementiert. Eine exponentielle Glättung erschien aber doch sinnvoller, und hat sich dann auch im Test als besser herausgestellt. Momentan verwenden wir einen hohen Glättungsfaktor von 0.9, was dafür sorgt dass der neueste Messwert mit hohem Gewicht in den geglätteten Wert eingeht und somit Geschwindigkeitsänderungen trotz der Glättung relativ schnell umgesetzt werden. Ein Nebeneffekt war, dass sich der berechnete Wert nach dem Anhalten langsam immer mehr an 0 angenähert hat, bis der kleinstmögliche Wert des verwendeten Datentyps erreicht war. Deswegen habe ich noch einen Cutoff eingebaut, sodass wir schneller zum vollständigen Stillstand kommen.

Zuletzt habe ich den Arbeitsstand zum Geschwindigkeitssensor (branch `feature/speed_sensor_integration`) noch mit dem zur Simulator-Integration zusammengeführt (branch `feature/stimulator_speedsensor_merged`). Nun konnten wir endlich die Funktionalität insgesamt testen.

## Kommunikation zwischen App und Simulator (Lyn)
Meine primäre Aufgabe war es, ein Konzept für die Kommunikation zwischen App und Simulator zu entwickeln und die Infrastruktur dafür aufzusetzen. Außerdem habe ich noch bei der Sensor-Einbindung in die Priobike App mitgearbeitet und ein Dockerfile für den Simulator erstellt.

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
App und Simulator kommunizieren über MQTT in Form von JSON-Nachrichten.

Um das Pairing von einer App mit einem Simulator durchzuführen, findet ein kurzer Handshake statt. Mit diesem Verfahren kann sichergestellt werden, dass sich die richtige App mit dem Simulator verbindet.

Die App meldet sich als bereit zum Verbinden, indem sie eine PairRequest-Nachricht sendet:  
`{"type":"PairRequest", "deviceID":"<unique id>", "deviceName":"<name>"}`  
Die deviceID kann eine UUID des Gerätes sein oder alternativ von der App zufällig generiert werden, und soll das Gerät eindeutig identifizieren. Sie wird für jegliche weitere Kommunikation zwischen Simulator und App als Identifikation verwendet. Der deviceName kann im Simulator genutzt werden, um die Verbindungsanfragen leichter zu unterscheiden.

Der Simulator antwortet auf eine vom User ausgewählte Anfrage mit einer PairStart-Nachricht: `{"type":"PairStart", "deviceID":"..."}`

Letzlich muss die App noch eine Bestätigung in Form einer PairConfirm-Nachricht senden, sodass beide Seiten wissen, dass die Verbindung geklappt hat: `{"type":"PairConfirm", "deviceID":"..."}`

Nun kann die eigentliche Kommunikation beginnen. Die App sendet nun die Startkoordinaten und -ausrichtung, die IDs und Positionen der Ampeln, sowie die Wegpunkte der Route:  
`{"type":"FirstCoordinate", "deviceID":"...", "longitude":"10.01", "latitude":"2.2", "bearing":"0"}`  
`{"type":"TrafficLight", "deviceID":"...", "tlID":"<unique id>", "longitude":"11.1", "latitude":"22.2", "bearing":"20"}`  
`[{"type":"RouteDataStart", "deviceID":"..."}, {"lon":"5.55", "lat":"6.66"}, ..., {"lon":"3.33", "lat":"4.44"}]`

Weiterhin sendet die App regelmäßig Updates der Position und Ampelzustände:  
`{"type":"NextCoordinate", "deviceID":"...", "longitude":"10.10", "latitude":"10.11", "bearing":"40"}`  
`{"type":"TrafficLightChange", "deviceID":"...", "tlID":"...", "state":"green"}`

Es ist von beiden Seiten aus möglich, die Kommunikation zu beenden: `{"type":"StopRide", "deviceID":"..."}`  
Es soll auch vom Ende der Kommunikation ausgegangen werden, falls keine Nachrichten von der App mehr ankommen.

#### Sicherheit
Aktuell wäre es noch möglich, dass jemand die Credentials für MQTT aus der App extrahieren oder mitschneiden könnte, und somit die Kommunikation durch gefälschte Nachrichten stören könnte. Ich habe überlegt, wie man die Kommunikation besser absichern könnte. Da keine sensiblen Daten übermittelt werden, erschien mir weniger relevant, dass niemand mitlesen kann. Jedoch wäre es nützlich, den Absender der Nachrichten verifizieren zu können.

Meine Idee war, dass Simulator und App jeweils ein Key-Pair erzeugen. Sämtliche Nachrichten werden signiert und bei der jeweils ersten Nachricht (PairRequest/PairConfirm) wird der public key mitgesendet. So ließe sich sicherstellen, dass niemand anderes gefälschte Nachrichten sendet (bzw. würden diese wegen der inkorrekten Signatur verworfen werden). Allerdings hätte das vermutlich den Rahmen des Komplexpraktikums überstiegen und hätte einigen zusätzlichen Aufwand erfordert, weshalb wir die Idee nicht weiter verfolgt haben.

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

## Simulator: Ampeln (Yenong)
Ich war für die Darstellung von Ampeln und Lichtfarbwechseln im Simulator verantwortlich.
### Modellierung von 3D-Ampeln
Die Modellierung wurde mit Blender durchgeführt. Ich habe vier Texturen für die Ampeln definiert, die den vier Ampelzuständen entsprechen. Wenn der Simulator keine Nachricht von der App über die Farbe der Ampel erhalten hat, ist die Ampel grau. Wenn die App dem Simulator eine Nachricht über eine Änderung der Ampelfarbe sendet, ist die Ampel je nach Farbe rot, grün oder gelb. Ich habe diese Modelle "trafficlight_"+colour genannt. Für die Darstellung in Mapbox werden diese Modelle im gltf-Format exportiert. Dieses Format erleichtert die Präsentation und den Austausch von 3D-Modellen im Web.
### Darstellung von 3D-Ampeln
Um 3D-Modelle auf Mapbox-Karten anzuzeigen, habe ich Threebox eingeführt, eine JavaScript-Bibliothek zum Hinzufügen von 3D-Inhalten zu Mapbox GL. Sie basiert auf Three.js und wird in unserem Code zum Speichern und Laden von 3D-Rendering-Verarbeitungsobjekten verwendet.

Ich habe eine addLayer-Funktion definiert, um der Karte einen neuen Layer hinzuzufügen, auf der das angegebene 3D-Modell angezeigt wird. Wenn man einen neuen Layer hinzufügt, muss man das Mapobjekt, das 3D-Rendering-Verarbeitungsobjekt, den Pfad zur 3D-Modelldatei, die Layer-ID sowie die Positionskoordinaten und den Drehwinkel des Modells angeben. 

Theoretisch ist die Drehrichtung eines 3D-Modells ein 3D-Vektor, aber die Drehrichtung eines Ampels(bearing) wirkt sich nur auf die Drehung des Modells um die y-Achse aus. Daher ist der Drehwinkel, den ich an addLayer übergebe, nur ein Float.

In Mapbox wird ein Layer zum Organisieren und Gestalten von geografischen Daten auf einer Karte verwendet. Jeder Layer hat seine eigene eindeutige ID. In unserem Code wird vor der Erstellung jeder neuen Layer der Timestamp verwendet, um eine neue Layer-ID zu erstellen.
Die Positionskoordinaten des Modells ist ein Array mit longitude und latitude.
### Laden von Ampeln-Modelle
Nachdem die App und der Simulator verbunden sind und eine Route gestartet wurde, sendet die App zu Beginn alle Ampeln auf dieser Route an den Simulator. Die Informationen, die der Simulator erhält, umfassen die Ampel-ID, den longitude, den latitude und den bearing.

Nach Erhalt dieser Nachrichten ruft mqttHandler.js eine Funktion namens createTrafficLight auf. Diese Funktion wurde geschrieben, um diese Ampeln im Anfangszustand zu erzeugen. Da der Simulator zu diesem Zeitpunkt noch keine Informationen über die Farbe der Ampeln erhalten hat, wird das graue Ampelmodell einheitlich in diese Layers geladen. Ich speichere die Informationen über die Ampel in einem Objektliteral, so dass ich die richtige Ampellayer anhand ihrer ID finden kann, wenn ich später die Farbe der Ampel umschalte.
### Aktualisieren des Ampelstatus
Während der Fahrt sendet die App dem Simulator Informationen über den Wechsel der Lichtfarbe an der nächstgelegenen Ampel auf dieser Strecke. In den meisten Fällen ist der Zustand der Ampel in der Nachricht red oder green, gelegentlich auch amber oder redAmber, was bedeutet, dass die Farbe der Ampel in diesem Moment gelb ist. Ich suche zunächst den Layer des Ampelmodells, der zuvor dort platziert war, anhand seiner ID und erstelle dann an seiner Stelle einen neuen Layer, um das Ampelmodell der aktuellen Farbe zu platzieren. Um zu verhindern, dass das Modell zwischen den Modellwechseln kurzzeitig verschwindet, setze ich ein Timeout, um die alte Ampel-Ebene danach zu löschen.

## Adrian

