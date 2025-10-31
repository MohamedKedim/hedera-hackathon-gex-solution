import L from 'leaflet';
import { StorageItem, GeoJSONFeatureCollection } from '@/lib/types2';
import { generatePopupHtml } from '@/lib/map/generatePopupHtml';

export const addStorageMarkers = (
  data: GeoJSONFeatureCollection,
  map: L.Map,
  storageCluster: L.MarkerClusterGroup,
  statusColorMap: Record<string, string>,
  setSelectedPlantName: (name: string) => void
) => {
  if (!data || !Array.isArray(data.features)) {
    console.warn('Missing or invalid Storage data');
    return;
  }

  data.features.forEach((feature) => {
    const props = feature.properties as StorageItem;
    if (feature.geometry.type !== 'Point' || !props.latitude || !props.longitude) {
      console.warn('Skipping Storage feature with invalid coordinates:', { feature });
      return;
    }

    const icon = L.AwesomeMarkers.icon({
      markerColor: statusColorMap[props.status?.toLowerCase() || 'other/unknown'] || statusColorMap['other/unknown'],
      iconColor: 'white',
      icon: 'database',
      prefix: 'fa',
    });

    const popupHtml = generatePopupHtml(props, 'Storage');

    const marker = L.marker([props.latitude, props.longitude], { icon })
      .bindTooltip(props.project_name || 'Unnamed', { sticky: true })
      .bindPopup(popupHtml)
      .on('click', () => {
        if (props.project_name) {
          const params = new URLSearchParams();
          params.set('plantName', props.project_name);
          setSelectedPlantName(props.project_name);
          window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
          map.setView([props.latitude!, props.longitude!], 12);
        }
      });

    storageCluster.addLayer(marker);
  });
};