var coordinates = [];

var recivedRoute = [];
distanzBei30KPH = 0.008321900879120575

let base_point = [10.008684549052646,53.5387102609356] // [lng,lat]
let base_point_index = 1;

let target_Point = [10.008684549052646,53.5387102609356] // [lng,lat]
let target_Point_index = 1;

var distanceToLineMin = Infinity;

function recivedRouteHandler(recivedRouteUnParsed){
  // console.log("Route empfangen");
  // console.log(recivedRouteUnParsed);
  recivedRoute = [];
  lastPoint = [0,0];
  // um Route direkt anzuzeigen
  for (let index = 0; index < recivedRouteUnParsed.length; index++){
    try {
      if(lastPoint[0] != recivedRouteUnParsed[index].lon || lastPoint[1] != recivedRouteUnParsed[index].lat){
        // alle Wegpunkte auf der Karte markieren
        // new mapboxgl.Marker().setLngLat([recivedRouteUnParsed[index].lon, recivedRouteUnParsed[index].lat]).addTo(map);
        recivedRoute.push([recivedRouteUnParsed[index].lon, recivedRouteUnParsed[index].lat]);
        lastPoint = [recivedRouteUnParsed[index].lon, recivedRouteUnParsed[index].lat];
      }
    }
    // Falls das Datenformat einen Fehler hat
    catch (error) {
      console.log("Fehler beim parsen der Route"+ error);
      break;
    }
  }
  
  base_point_index = 1;
  base_point = recivedRoute[base_point_index];
  // console.log(recivedRoute);

  target_Point_index = 2;
  target_Point = recivedRoute[target_Point_index];

  //zeige die Route im Simulator und auf der Minimap an
  coordinates = recivedRoute.slice();
  update_map_lines();
}

function moveToHandler(coordinate_long, coordinate_lat, bearing_int)
{

  var newCoordinate = [coordinate_long,coordinate_lat];

  // berechne Target Point nur wenn Route gesendet wurde
  if (recivedRoute.length > 0) {
    distanceToLineMin = Infinity;
    // suche nach Routenstück mit geringster Distanz (geht alle durch, da sonst Probleme in Haarnadelkurven und bei Punkthaufen an Routenzielen auftreten können)
    for (let index = 0; index < recivedRoute.length-1; index++) {
      var distanceToLineVgl = distanceToLine(coordinate_lat,coordinate_long,recivedRoute[index][1],recivedRoute[index][0],recivedRoute[index+1][1],recivedRoute[index+1][0],index);

      if(distanceToLineVgl <= distanceToLineMin){
        distanceToLineMin = distanceToLineVgl;
        base_point_index = index;
      }
    }
    target_Point_index = base_point_index + 1;

    // Base Point = letzter Punkt der überfahren wurde (berechnet als Anfangspunkt der Strecke mit geringster Distanz zum aktuellen Punkt)
    base_point = recivedRoute[base_point_index];
    // Target Point = nächster Punkt der überfahren werden soll (berechnet als Endpunkt der Strecke mit geringster Distanz zum aktuellen Punkt)
    target_Point = recivedRoute[target_Point_index];

    // bearing berechnung
    var bearing_used = calculateBearing(coordinate_lat,coordinate_long,target_Point[1],target_Point[0]);

    var dist_for_check_close_or_on = Math.abs(calculateDistance(target_Point[1],target_Point[0],coordinate_lat,coordinate_long))
    // if on point use bearing of next target point
    if (dist_for_check_close_or_on < 0.000000001 && target_Point_index < recivedRoute.length-1) {
      bearing_used = calculateBearing(coordinate_lat,coordinate_long,recivedRoute[target_Point_index+1][1],recivedRoute[target_Point_index+1][0]);
      // console.log("Point is close to target point, use bearing of next target point");
    }
    // if point is close to target point and direction matches, use bearing of next target point
    // use calc180to360 to get the bearing in the range of 0-360 (mapbox can recive both 0-360 and -180-180)
    else if(dist_for_check_close_or_on < distanzBei30KPH && target_Point_index < recivedRoute.length-1){
      const bearing_to_target_point = calculateBearing(coordinate_lat,coordinate_long,recivedRoute[target_Point_index][1],recivedRoute[target_Point_index][0]);
      const bearing_to_next_point = calculateBearing(coordinate_lat,coordinate_long,recivedRoute[target_Point_index+1][1],recivedRoute[target_Point_index+1][0]);
      const bearing_to_next_next_point = calculateBearing(coordinate_lat, coordinate_long, recivedRoute[target_Point_index + 2][1], recivedRoute[target_Point_index + 2][0]);
      // if (bearing_to_next_point*bearing_to_target_point < 0) {
      //   // wenn übersprung -> 180° addieren und wieder in den Bereich -180 bis 180 bringen
      //   bearing_used = (0.5*bearing_to_target_point+ 0.5*bearing_to_next_point + 180);
      //   if(bearing_used > 180){
      //     bearing_used = bearing_used - 360;
      //   }
      // }
      // else{
      //   bearing_used = 0.5*bearing_to_target_point+ 0.5*bearing_to_next_point;
      // }
      // console.log("Point is close Next: "+ bearing_to_next_point + " Current: " + bearing_to_target_point + " Use: " + bearing_used);
      if (Math.abs(bearing_to_next_point - bearing_to_next_next_point) < 180) {
        bearing_used = 0.5 * bearing_to_target_point + 0.5 * bearing_to_next_point;
      } else {
        bearing_used = 0.5 * bearing_to_target_point + 0.5 * bearing_to_next_point + 180;
        if (bearing_used > 180) {
          bearing_used = bearing_used - 360;
        }
      }
    }

    
  }
  else {
    console.log("ACHTUNG keine Route gesendet -> nur gesendetes Bearing wird verwendet");
    var bearing_used = bearing_int;
  }

  // Eigentliche Fokuspunkt berechung ab hier
  newLngLat = getFinalLatLong(coordinate_lat,coordinate_long,0.031615522014283345,bearing_used,6371);
  
  const target = {center: [newLngLat[1],newLngLat[0]],
                  bearing: bearing_used};

  // TODO just for DEBUGGING Füge der line, die Direction hinzu
  // UNCOMMENT FOR DEBUGGING adds Line with Direction to Map

  // newDirectionVektor = getFinalLatLong(coordinate_lat,coordinate_long,0.002615522014283345,bearing_used,6371);
  // var newDirectionCoordinate = [newDirectionVektor[1],newDirectionVektor[0]];
  // coordinates.push(newCoordinate);
  // coordinates.push(newDirectionCoordinate);
  // coordinates.push(newCoordinate);
  // update_map_lines();

  // console.log("Aktueller Target Point: " + target_Point_index + " " + target_Point);
  map.easeTo({
      ...target, // Fly to the selected target
      zoom: 21,
      pitch: 85,
      duration: 1500, // höhere Werte -> langsamer (potentiell smoother)
      easing: t => t,
      essential: true
  });
}

function update_map_lines() {
  // Aktualisiere die Linie auf der Straße
  map.getSource('line').setData({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  });
  // Aktualisiere die Kontrast Linie der Straße
  map.getSource('contrast_line').setData({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  });
  // Aktualisiere die Linie auf der Minimap
  minimap.getSource('minimap_line').setData({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  });
  // Aktualisiere die Kontrast Linie der Minimap
  minimap.getSource('minimap_contrast_line').setData({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  });
}

// Umrechnung von Grad in Radiant und umgekehrt
function deg2rad(deg) {
  return deg * (Math.PI / 180.0);
}

function rad2deg(rad) {
  return rad * (180.0 / Math.PI);
}

// Berechnung des Viewpoints, der in der Mitte des Bildschirms sein soll
function getFinalLatLong(lat1, long1, distance, angle, radius) {
  var delta = distance / radius,
    theta = deg2rad(lat1),
    phi = deg2rad(long1),
    gamma = deg2rad(angle);

  var c_theta = Math.cos(theta),
    s_theta = Math.sin(theta);
  var c_phi = Math.cos(phi),
    s_phi = Math.sin(phi);
  var c_delta = Math.cos(delta),
    s_delta = Math.sin(delta);
  var c_gamma = Math.cos(gamma),
    s_gamma = Math.sin(gamma);

  var x =
    c_delta * c_theta * c_phi - s_delta * (s_theta * c_phi * c_gamma + s_phi * s_gamma);
  var y =
    c_delta * c_theta * s_phi - s_delta * (s_theta * s_phi * c_gamma - c_phi * s_gamma);
  var z = s_delta * c_theta * c_gamma + c_delta * s_theta;

  var theta2 = Math.asin(z),
    phi2 = Math.atan2(y, x);

  return [rad2deg(theta2), rad2deg(phi2)];
}

//haversine formula to calculate distance between two points on a sphere
function calculateDistance(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;

    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadiusKm * c; // Distance in kilometers

    return distance;
}

function calculateBearing(startLat, startLng, destLat, destLng){
  startLat = deg2rad(startLat);
  startLng = deg2rad(startLng);
  destLat = deg2rad(destLat);
  destLng = deg2rad(destLng);

  y = Math.sin(destLng - startLng) * Math.cos(destLat);
  x = Math.cos(startLat) * Math.sin(destLat) -
        Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
  brng = Math.atan2(y, x);
  brng = rad2deg(brng);
  return (brng);
}


function distanceToLine(lat0, lon0, lat1, lon1, lat2, lon2,index) {
  // Calculate the great-circle distances between the point and the two line endpoints
  const distanceToStart = Math.abs(calculateDistance(lat0, lon0, lat1, lon1));
  const distanceToEnd = Math.abs(calculateDistance(lat0, lon0, lat2, lon2));

  // Länge der Strecke berechnen
  const lineLength = Math.abs(calculateDistance(lat1, lon1, lat2, lon2));

  // Check if the line segment has zero length
  if (lineLength< 0.000000001) {
    console.log("Line between Points has zero length");
      // Die Strecke hat eine Länge von 0, also ist die Distanz der Punkt zu einem der beiden Endpunkte
      return Math.min(distanceToStart, distanceToEnd);
  }

  // Use Heron's formula to calculate the area of the triangle formed by the point and the line segment
  const s = (distanceToStart + distanceToEnd + lineLength) / 2;
  const area = Math.sqrt(Math.abs(s * (s - distanceToStart) * (s - distanceToEnd) * (s - lineLength)));

  // Prüfe ob die Fläche = 0 ist, da der Punkt dann auf der Geraden liegt (entweder innerhalb der Strecke oder außerhalb)
  if (area === 0) {
    // Checke ob Punkt auf Linie liegt, indem der Winkel zwischen den beiden Linienenden und dem Punkt berechnet wird
    const bearing_1 = calculateBearing(lat0, lon0, lat1, lon1) 
    const bearing_2 = calculateBearing(lat0, lon0, lat2, lon2)
    // das "oder/||" fängt den Fall ab, wenn die Bearings 0 und 180 sind, da diese ebenfalls entgegen gesetzt sind
    if (Math.abs(bearing_1 - bearing_2) < 0.000000001 || Math.abs(bearing_1 + bearing_2) == 180) {
      // console.log("Point is on the line: "+ index);
      return 0.0;
    }
    // Alle Drei Punkte liegen auf einer Line, doch der Punkt liegt nicht auf der Strecke zwischen den beiden geg. Punkten
    else{
      console.log("Point is not on the line!!!!!!!: "+ index+" Dist1: "+ (calculateBearing(lat0, lon0, lat1, lon1) +" Dist2: "+ calculateBearing(lat0, lon0, lat2, lon2))+ " DistanceToStart: " + distanceToStart + " DistanceToEnd: " + distanceToEnd + " lineLength: " + lineLength + " area: " + area + " s: " + s);
      return Math.min(distanceToStart, distanceToEnd);
    }
  }

  // Calculate the perpendicular distance from the point to the line
  const distance = (2 * area) / lineLength;

  // console.log("Distance to Line: " + distance + " Index: " + index);
  // kann eigentlich nicht passieren, da die Strecke nicht 0 ist (Fall wird abgefangen) und Fläche != NaN, da unter der Wurzel eigentlich nur positive Zahlen sein können. Doch bei JS/floats bin ich mir nie sicher
  if(isNaN(distance)){
    // console.log("Distanz = NaN: "+ index+ " distanceToStart: " + distanceToStart + " distanceToEnd: " + distanceToEnd + " lineLength: " + lineLength + " area: " + area + " s: " + s);
    return Math.min(distanceToStart, distanceToEnd);
  }
  return distance;
}