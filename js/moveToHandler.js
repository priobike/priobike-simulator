function moveToHandler(map, coordinate_x, coordinate_y, bearing_int)
{
    const target = {center: [coordinate_x,coordinate_y],
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