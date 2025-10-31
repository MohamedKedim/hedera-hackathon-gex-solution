import L from 'leaflet';
import { PipelineItem, GeoJSONFeatureCollection } from '@/lib/types2';
import { generatePopupHtml } from '@/lib/map/generatePopupHtml';

export const addPipelineMarkers = (
  data: GeoJSONFeatureCollection,
  map: L.Map,
  pipelineLayer: L.FeatureGroup,
  statusColorMap: Record<string, string>,
  setSelectedPlantName: (name: string) => void
) => {
  if (!data || !Array.isArray(data.features)) {
    console.warn('Missing or invalid Pipeline data');
    return;
  }

  data.features.forEach((feature) => {
    const props = feature.properties as PipelineItem;
    if (
      feature.geometry.type !== 'LineString' ||
      !Array.isArray(feature.geometry.coordinates) ||
      feature.geometry.coordinates.length < 2 ||
      !feature.geometry.coordinates.every((c) => Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number')
    ) {
      console.warn('Skipping Pipeline feature with invalid coordinates:', { feature });
      return;
    }

    const latlngs = (feature.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
    const popupHtml = generatePopupHtml(props, 'Pipeline');
    const polyline = L.polyline(latlngs, {
      color: 'blue', // Force pipeline color to blue
      weight: 4,
    })
      .bindPopup(popupHtml)
      .on('click', () => {
        if (props.pipeline_name) {
          const params = new URLSearchParams();
          params.set('plantName', props.pipeline_name);
          setSelectedPlantName(props.pipeline_name);
          window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
          if (latlngs.length > 0) {
            map.setView(latlngs[0], 10);
          }
        }
      });

    pipelineLayer.addLayer(polyline);
  });
};