import type { LatLngTuple } from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMapEvents
} from "react-leaflet";
import type { AnswerFeedback } from "../types";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface WorldMapProps {
  mapKey: string;
  feedback: AnswerFeedback | null;
  isLocked: boolean;
  onGuess: (coords: Coordinates) => void;
}

function ClickHandler({
  isLocked,
  onGuess
}: Pick<WorldMapProps, "isLocked" | "onGuess">): null {
  useMapEvents({
    click(event) {
      if (isLocked) {
        return;
      }

      onGuess({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng
      });
    }
  });

  return null;
}

export function WorldMap({
  mapKey,
  feedback,
  isLocked,
  onGuess
}: WorldMapProps): JSX.Element {
  const defaultCenter: LatLngTuple = [20, 0];
  const guessPosition = feedback
    ? ([feedback.guessLatitude, feedback.guessLongitude] as LatLngTuple)
    : null;
  const correctPosition = feedback
    ? ([feedback.correctLatitude, feedback.correctLongitude] as LatLngTuple)
    : null;

  return (
    <MapContainer
      key={mapKey}
      center={defaultCenter}
      zoom={2}
      minZoom={2}
      worldCopyJump
      className="quiz-map"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <ClickHandler isLocked={isLocked} onGuess={onGuess} />

      {guessPosition ? (
        <CircleMarker
          center={guessPosition}
          radius={10}
          pathOptions={{
            color: "#ffcf5c",
            fillColor: "#ffcf5c",
            fillOpacity: 0.95,
            weight: 2
          }}
        />
      ) : null}

      {correctPosition ? (
        <>
          <Circle
            center={correctPosition}
            radius={140000}
            pathOptions={{
              color: "#37d4bf",
              fillColor: "#37d4bf",
              fillOpacity: 0.18,
              weight: 1
            }}
          />
          <CircleMarker
            center={correctPosition}
            radius={11}
            pathOptions={{
              color: "#37d4bf",
              fillColor: "#37d4bf",
              fillOpacity: 1,
              weight: 2
            }}
          />
        </>
      ) : null}

      {guessPosition && correctPosition ? (
        <Polyline
          positions={[guessPosition, correctPosition]}
          pathOptions={{
            color: "#ff7a59",
            weight: 4,
            dashArray: "10 8"
          }}
        />
      ) : null}
    </MapContainer>
  );
}
