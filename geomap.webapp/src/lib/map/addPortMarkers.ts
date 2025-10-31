import L from 'leaflet';
import { PortItem, GeoJSONFeatureCollection } from '@/lib/types2';
import { generatePopupHtml } from '@/lib/map/generatePopupHtml';

export const addPortMarkers = (
  data: GeoJSONFeatureCollection,
  map: L.Map,
  portsCluster: L.MarkerClusterGroup,
  statusColorMap: Record<string, string>,
  setSelectedPlantName: (name: string) => void
) => {
  if (!data || !Array.isArray(data.features)) {
    console.warn('Missing or invalid Port data');
    return;
  }

  data.features.forEach((feature) => {
    const props = feature.properties as PortItem;
    if (feature.geometry.type !== 'Point' || !props.latitude || !props.longitude) {
      console.warn('Skipping Port feature with invalid coordinates:', { feature });
      return;
    }

    const icon = L.AwesomeMarkers.icon({
      markerColor: statusColorMap[props.status?.toLowerCase() || 'other/unknown'] || statusColorMap['other/unknown'],
      iconColor: 'white',
      icon: 'ship',
      prefix: 'fa',
    });

    const popupHtml = generatePopupHtml(props, 'Port');

    const marker = L.marker([props.latitude, props.longitude], { icon })
      .bindTooltip(props.name || 'Unnamed', { sticky: true })
      .bindPopup(popupHtml)
      .on('click', () => {
        if (props.name) {
          const params = new URLSearchParams();
          params.set('plantName', props.name);
          setSelectedPlantName(props.name);
          window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
          map.setView([props.latitude!, props.longitude!], 12);
        }
      });

    portsCluster.addLayer(marker);
  });
};