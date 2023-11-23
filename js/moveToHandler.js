function moveToHandler(coordinate_x, coordinate_y, bearing_int)
{
    // movmentVector = calculateXYFokuspointOffset(coordinate_x,coordinate_y,bearing_int)
    // newLngLat = forMovementgetLngLat(coordinate_x,coordinate_y, movmentVector[0],movmentVector[1]) 
    
    winkelImBogenmaß = bearing_int * (Math.PI / 180)
    newLngLat = getFinalLatLong(coordinate_y,coordinate_x,0.031615522014283345,bearing_int,6371)
    
    const target = {center: [newLngLat[1],newLngLat[0]],
                    bearing: bearing_int}

    map.easeTo({
        ...target, // Fly to the selected target
        zoom: 21,
        pitch: 85,
        duration: 1500,
        easing: t => t,
        essential: true
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