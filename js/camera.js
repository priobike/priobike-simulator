function moveToHandler(coordinate_long, coordinate_lat) {
  if (currentRouteCoordinates.length === 0) {
    console.log("Keine Route empfangen");
    return;
  }
  // Calc nearest point on interpolated route
  const line = turf.lineString(currentRouteCoordinates);
  const point = turf.point([coordinate_long, coordinate_lat]);
  const snapped = turf.nearestPointOnLine(line, point);
  const nearestPoint = snapped.geometry.coordinates;
  let center = [nearestPoint[0], nearestPoint[1]];
  // Calc bearing based on the current route segment
  const index = snapped.properties.index;
  // Check if last segment
  if (index === currentRouteCoordinates.length - 1) {
    console.log("Ende der Route erreicht");
    return;
  }
  const segment = [currentRouteCoordinates[index], currentRouteCoordinates[index + 1]];
  const routeBearing = turf.bearing(turf.point(segment[0]), turf.point(segment[1]));

  // Using turf, calculate a point in 100m distance from the target point
  const targetPoint = center;
  const bearing = routeBearing;
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Caclulate the resolution ratio.
  const resolutionRatio = (w * h) / (1920 * 1080);
  // Dependend on the resolution, the distance is calculated
  // TODO this needs to be optimized to fit screen sizes.
  const distance = 33 * resolutionRatio;
  console.log(distance);
  const unit = 'meters';
  const options = {units: unit};
  const destination = turf.destination(targetPoint, distance, bearing, options);
  center = turf.getCoord(destination);
  
  map.easeTo({
      center: center, 
      bearing: routeBearing, // Fokuspunkt und Bearing als Ziel
      zoom: 21,
      pitch: 85,
      duration: 1500, // höhere Werte -> langsamer (potentiell smoother)
      easing: t => t,
      essential: true
  });
}

function runningMean(arr, k) {
  var n = arr.length;
  var result = [];
  for (var i = 0; i < n; i++) {
      var sum = 0;
      var count = 0;
      for (var j = Math.max(0, i - k); j < Math.min(n, i + k + 1); j++) {
          sum += arr[j];
          count++;
      }
      result.push(sum / count);
  }
  return result;
}

function interpolate(route, pointsPerSegment, runningMeanK) {
  const xs = route.map((p) => p.lat);
  const ys = route.map((p) => p.lon);
  // Insert points per segment
  var xsInterpolated = [];
  var ysInterpolated = [];
  for (var i = 0; i < xs.length - 1; i++) {
      var x0 = xs[i];
      var x1 = xs[i + 1];
      var y0 = ys[i];
      var y1 = ys[i + 1];
      var dx = (x1 - x0) / pointsPerSegment;
      var dy = (y1 - y0) / pointsPerSegment;
      for (var j = 0; j < pointsPerSegment; j++) {
          xsInterpolated.push(x0 + j * dx);
          ysInterpolated.push(y0 + j * dy);
      }
  }
  xsInterpolated = runningMean(xsInterpolated, runningMeanK);
  ysInterpolated = runningMean(ysInterpolated, runningMeanK);
  return xsInterpolated.map((x, i) => ({ lat: x, lon: ysInterpolated[i] }));
}