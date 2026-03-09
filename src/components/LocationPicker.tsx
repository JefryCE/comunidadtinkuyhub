import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Leaflet + Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
}

const ClickHandler = ({ onChange }: { onChange: (coords: { lat: number; lng: number }) => void }) => {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

const InvalidateSize = () => {
  const map = useMap();
  useEffect(() => {
    // Leaflet needs a resize after dialog opens
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const LocationPicker = ({ value, onChange }: LocationPickerProps) => {
  const [center] = useState<[number, number]>(
    value ? [value.lat, value.lng] : [-12.0464, -77.0428]
  );

  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 220 }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <InvalidateSize />
          <ClickHandler onChange={onChange} />
          {value && <Marker position={[value.lat, value.lng]} />}
        </MapContainer>
      </div>
      {value ? (
        <p className="text-xs text-muted-foreground">
          📍 {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Haz clic en el mapa para seleccionar la ubicación</p>
      )}
    </div>
  );
};

export default LocationPicker;
