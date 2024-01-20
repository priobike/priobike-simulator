var coordinates = [];

var recivedRoute = [];
distanzBei30KPH = 0.008321900879120575

let base_point = [10.008684549052646,53.5387102609356] // [lng,lat]
let base_point_index = 1;

let target_Point = [10.008684549052646,53.5387102609356] // [lng,lat]
let target_Point_index = 1;

var last_index = 0;

var distanceToLineMin = 100;

function recivedRouteHandler(recivedRouteUnParsed){
  console.log("Route empfangen");
  console.log(recivedRouteUnParsed);
  recivedRoute = [];
  lastPoint = [0,0];
  // um Route direkt anzuzeigen
  for (let index = 0; index < recivedRouteUnParsed.length; index++){
    try {
      if(lastPoint[0] != recivedRouteUnParsed[index].lon || lastPoint[1] != recivedRouteUnParsed[index].lat){
        new mapboxgl.Marker().setLngLat([recivedRouteUnParsed[index].lon, recivedRouteUnParsed[index].lat]).addTo(map);
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
  console.log(recivedRoute);

  target_Point_index = 2;
  target_Point = recivedRoute[target_Point_index];

  // zeige die Route im Simulator an
  // coordinates = recivedRoute.slice();
  // update_map_lines();
}

function moveToHandler(coordinate_long, coordinate_lat, bearing_int)
{

  var newCoordinate = [coordinate_long,coordinate_lat];

  // berechne Target Point nur wenn Route gesendet wurde
  if (recivedRoute.length > 0) {
    distanceToLineMin = 100;
    // suche nach Routenstück mit geringster Distanz (geht alle durch, da sonst Probleme in Haarnadelkurven und bei Punkthaufen an Routenzielen auftreten können)
    for (let index = base_point_index; index < recivedRoute.length-1; index++) {
      var distanceToLineVgl = distanceToLine(coordinate_lat,coordinate_long,recivedRoute[index][1],recivedRoute[index][0],recivedRoute[index+1][1],recivedRoute[index+1][0]);

      if(distanceToLineVgl <= distanceToLineMin){
        distanceToLineMin = distanceToLineVgl;
        base_point_index = index;
        if (last_index == 10 && index == 9) {
          console.log("Last9");
        }
      }
    }
    last_index = base_point_index;

    target_Point_index = base_point_index + 1;

    base_point = recivedRoute[base_point_index];
    target_Point = recivedRoute[target_Point_index];

    // bearing berechnung
    var bearing_used = calculateBearing(coordinate_lat,coordinate_long,target_Point[1],target_Point[0]);

    var dist_for_check_close_or_on = Math.abs(calculateDistance(target_Point[1],target_Point[0],coordinate_lat,coordinate_long))

    // if on point use bearing of next target point
    if (dist_for_check_close_or_on < 0.000000001 && target_Point_index < recivedRoute.length-1) {
      bearing_used = calculateBearing(coordinate_lat,coordinate_long,recivedRoute[target_Point_index+1][1],recivedRoute[target_Point_index+1][0]);
      console.log("Point is close to target point, use bearing of next target point");
    }
    // if point is close to target point and direction matches, use bearing of next target point
    else if(dist_for_check_close_or_on < Math.abs(distanzBei30KPH && target_Point_index < recivedRoute.length-1)){
      bearing_used = 0.6*calculateBearing(coordinate_lat,coordinate_long,recivedRoute[target_Point_index+1][1],recivedRoute[target_Point_index+1][0])+0.4*calculateBearing(coordinate_lat,coordinate_long,recivedRoute[target_Point_index][1],recivedRoute[target_Point_index][0]);
      console.log("Point is close Next: "+ calculateBearing(coordinate_lat,coordinate_long,recivedRoute[target_Point_index+1][1],recivedRoute[target_Point_index+1][0]) + " Current: " + calculateBearing(coordinate_lat,coordinate_long,recivedRoute[target_Point_index][1],recivedRoute[target_Point_index][0]));
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
  newDirectionVektor = getFinalLatLong(coordinate_lat,coordinate_long,0.002615522014283345,bearing_used,6371);
  var newDirectionCoordinate = [newDirectionVektor[1],newDirectionVektor[0]];
  
  // UNCOMMENT FOR DEBUGGING adds Line with Direction to Map
  coordinates.push(newCoordinate);
  coordinates.push(newDirectionCoordinate);
  coordinates.push(newCoordinate);
  update_map_lines();

  console.log("Aktueller Target Point: " + target_Point_index + " " + target_Point);
  map.easeTo({
      ...target, // Fly to the selected target
      zoom: 21,
      pitch: 85,
      duration: 1500,
      easing: t => t,
      essential: true
  });
}

function update_map_lines() {
  // Aktualisiere die Linie
  map.getSource('line').setData({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  });
  // Aktualisiere die Kontrast Linie
  map.getSource('contrast_line').setData({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  });
  minimap.getSource('minimap_line').setData({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  });
  minimap.getSource('minimap_contrast_line').setData({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  });
}

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// function calculateXYFokuspointOffset(coordinate_x, coordinate_y, bearing_int){
//     const camera = map.getFreeCameraOptions();
//     const cameraPosition = camera._position.toLngLat();

//     const hardDistanceFokusCamPosKM = 0.031615522014283345
//     if (bearing_int<0) {
//         bearing_int = bearing_int*-1 + 180
//     }
//     winkelImBogenmaß = bearing_int * (Math.PI / 180)
//     x_offset = Math.sin(winkelImBogenmaß)*hardDistanceFokusCamPosKM
//     y_offset = Math.cos(winkelImBogenmaß)*hardDistanceFokusCamPosKM

//     return [x_offset,y_offset]
// }

// function forMovementgetLngLat(refLongitude,refLatitude,xLng,yLat){

//     // Constants related to Earth's radius (in kilometers)
//     const earthRadius = 6371;

//     const metersToRadians = (value) => value / earthRadius;

//     const latitude = refLatitude + (metersToRadians(yLat) * 180) / Math.PI;
//     const longitude = refLongitude + ((metersToRadians(xLng) * 180) / Math.PI) / Math.cos((refLatitude * Math.PI) / 180);

//     console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
//     return [longitude,latitude]
// }
function deg2rad(deg) {
  return deg * (Math.PI / 180.0);
}
  
function rad2deg(rad) {
  return rad * (180.0 / Math.PI);
}
  
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

//haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;

    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
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


function distanceToLine(lat0, lon0, lat1, lon1, lat2, lon2) {
  // Calculate the great-circle distances between the point and the two line endpoints
  const distanceToStart = calculateDistance(lat0, lon0, lat1, lon1);
  const distanceToEnd = calculateDistance(lat0, lon0, lat2, lon2);

  // Länge der Strecke berechnen
  const lineLength = calculateDistance(lat1, lon1, lat2, lon2);

  // Check if the line segment has zero length
  if (lineLength == 0) {
    console.log("Line between Points has zero length");
      // Die Strecke hat eine Länge von 0, also ist die Distanz der Punkt zu einem der beiden Endpunkte
      return Math.min(distanceToStart, distanceToEnd);
  }

  // Use Heron's formula to calculate the area of the triangle formed by the point and the line segment
  const s = (distanceToStart + distanceToEnd + lineLength) / 2;
  const area = Math.sqrt(s * (s - distanceToStart) * (s - distanceToEnd) * (s - lineLength));

  // Check if the area is zero (indicating the point is on the line)
  if (area == 0) {
    // Checke ob Punkt auf Linie liegt, indem der Winkel zwischen den beiden Linienenden und dem Punkt berechnet wird
    if ((calculateBearing(lat0, lon0, lat1, lon1) + calculateBearing(lat0, lon0, lat2, lon2))> 1) {
      console.log("Point is on the line");
      return 0;
    }
    // Alle Drei Punkte liegen auf einer Line, doch der Punkt liegt nicht auf der Strecke zwischen den beiden geg. Punkten
    else{
      console.log("Point is not on the line!!!!!!!");
      return Math.min(distanceToStart, distanceToEnd);
    }
  }

  // Calculate the perpendicular distance from the point to the line
  const distance = (2 * area) / lineLength;

  return distance;
}