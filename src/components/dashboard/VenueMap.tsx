import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function VenueMap({ incidents, activeRoute }: { incidents: any[], activeRoute?: any }) {
  return (
    <MapContainer 
      center={[40.7128, -74.0060]} 
      zoom={16} 
      style={{ height: '100%', width: '100%', background: '#121212' }}
    >
      <TileLayer 
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />
      
      {/* Live Incident Markers */}
      {incidents.map(inc => (
        <CircleMarker 
          key={inc.id} 
          center={[inc.centroid.lat, inc.centroid.lng]} 
          radius={10} 
          pathOptions={{ 
            color: inc.severity >= 4 ? '#c62828' : '#ef6c00', 
            fillColor: inc.severity >= 4 ? '#ef5350' : '#ffb74d', 
            fillOpacity: 0.8 
          }}
        >
          <Popup>
            <strong style={{ color: '#333' }}>Priority {inc.severity} Incident</strong>
          </Popup>
        </CircleMarker>
      ))}

      {/* P1 Item 12: Responder Routing Polyline */}
      {activeRoute && activeRoute.pathCoords && (
        <Polyline 
          positions={activeRoute.pathCoords} 
          pathOptions={{ color: '#2196f3', weight: 5, dashArray: '10, 10' }} 
        />
      )}
    </MapContainer>
  );
}