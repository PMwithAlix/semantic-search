import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SearchResult } from '@/types';
import {
  getDestinationCountry,
  getMapResults,
  getResultSubtitle,
  getResultTitle,
  getTerminalCountry,
} from '@/lib/searchResultDisplay';

interface SearchResultsMapProps {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  className?: string;
  coverageLabel?: string;
}

const scoreColor = (score: number) => {
  if (score >= 0.7) return '#16a34a';
  if (score >= 0.55) return '#2563eb';
  return '#f59e0b';
};

export function SearchResultsMap({ results, onSelect, className, coverageLabel }: SearchResultsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([31.0, 44.0], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    const points = getMapResults(results);

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    if (points.length === 0) {
      map.setView([31.0, 44.0], 6);
      return;
    }

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));

    points.forEach(({ result, lat, lng }) => {
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        color: scoreColor(result.score),
        fillColor: scoreColor(result.score),
        fillOpacity: 0.85,
        weight: 2,
      }).addTo(map);

      const dest = getDestinationCountry(result.row);
      const origin = getTerminalCountry(result.row);
      const routeLine =
        dest || origin
          ? `<div style="font-size:11px;margin:4px 0;color:#333">${dest ? `Dest: ${dest}` : ''}${dest && origin ? ' · ' : ''}${origin ? `Origin: ${origin}` : ''}</div>`
          : '';

      marker.bindPopup(
        `<div style="min-width:220px;font-family:system-ui,sans-serif">
          <div style="font-weight:600;margin-bottom:4px">#${result.rank} · ${result.score.toFixed(2)}</div>
          <div style="font-size:12px;margin-bottom:6px">${getResultTitle(result.row)}</div>
          ${routeLine}
          <div style="font-size:11px;color:#555;line-height:1.4">${getResultSubtitle(result.row, result.embeddingText)}</div>
        </div>`
      );
      marker.on('click', () => onSelect(result));
    });

    map.fitBounds(bounds.pad(0.15));
  }, [results, onSelect]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const mappableCount = getMapResults(results).length;

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="h-[420px] w-full rounded-lg border border-border overflow-hidden z-0"
      />
      {coverageLabel && mappableCount < results.length && (
        <p className="text-xs text-muted-foreground mt-2">
          {mappableCount} / {results.length} {coverageLabel}
        </p>
      )}
    </div>
  );
}
