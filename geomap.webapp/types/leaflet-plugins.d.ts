// types/leaflet-plugins.d.ts

import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Control {
    class Measure extends L.Control {
      constructor(options?: any);
    }
  }

  namespace AwesomeMarkers {
    function icon(options?: any): L.Icon;
  }

  let AwesomeMarkers: AwesomeMarkers;
}
