/* eslint-disable */

// a js file, which we will integrate into our html and which will
// then run on the client side

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiYXVndXN0YXMzayIsImEiOiJja2F3bHg4ODczdnl5MzFwNjh3M3Q5YWxrIn0.akcQTLD8OaXDavkqgoCM_A';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/augustas3k/ckawmqyg30xhl1ilc9pw0zwv6',
    scrollZoom: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // create marker
    const el = document.createElement('div');
    el.className = 'marker';

    //   add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    // extend bounds to include the location in question
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
