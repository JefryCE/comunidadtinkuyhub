import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, LocateFixed, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const FlyTo = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1 });
  }, [lat, lng, map]);
  return null;
};

const LocationPicker = ({ value, onChange }: LocationPickerProps) => {
  const [center] = useState<[number, number]>(
    value ? [value.lat, value.lng] : [-12.0464, -77.0428]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        onChange(coords);
        setFlyTarget(coords);
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(coords);
        setFlyTarget(coords);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar dirección…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={searching}
          className="h-8 px-2.5"
        >
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLocateMe}
          disabled={locating}
          className="h-8 px-2.5"
          title="Usar mi ubicación"
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm" style={{ height: 280 }}>
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
          <ClickHandler onChange={(coords) => { onChange(coords); setFlyTarget(coords); }} />
          {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}
          {value && <Marker position={[value.lat, value.lng]} />}
        </MapContainer>
      </div>

      {/* Coordinates feedback */}
      {value ? (
        <div className="flex items-center gap-2 text-xs text-primary font-medium bg-primary/10 rounded-lg px-3 py-2 animate-in fade-in duration-300">
          <span>📍</span>
          <span>{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Haz clic en el mapa, busca una dirección o usa tu ubicación</p>
      )}
    </div>
  );
};

export default LocationPicker;
