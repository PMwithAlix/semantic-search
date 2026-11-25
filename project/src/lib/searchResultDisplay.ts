import type { SearchResult } from '@/types';

export function getRowField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined) {
      const text = String(value).trim();
      if (text && text.toLowerCase() !== 'nan') return text;
    }
  }
  return '';
}

export function getResultTitle(row: Record<string, unknown>): string {
  const recordId = getRowField(row, 'record_id', 'ticket_id', 'ID', 'id');
  const imei = getRowField(row, 'IMEI', 'imei', 'source_imei');
  const title = getRowField(row, 'title', 'Subject');
  if (recordId && imei) return `${recordId} · IMEI ${imei}`;
  if (recordId) return recordId;
  if (imei) return `IMEI ${imei}`;
  if (title) return title;
  return '—';
}

export function getTerminalCountry(row: Record<string, unknown>): string {
  return getRowField(row, 'Country');
}

export function getDestinationCountry(row: Record<string, unknown>): string {
  return getRowField(row, 'OtherPartyCountry');
}

export function getOtherPartyNumber(row: Record<string, unknown>): string {
  return getRowField(row, 'OtherPartyNumber');
}

export function getResultSubtitle(row: Record<string, unknown>, embeddingText?: string): string {
  const story = getRowField(row, 'IntelligenceStory', 'intelligence_story');
  if (story) return story.replace(/\s+/g, ' ').slice(0, 180);
  const description = getRowField(row, 'description');
  const title = getRowField(row, 'title');
  if (title && description) return `${title} — ${description}`.slice(0, 180);
  if (description) return description.slice(0, 180);
  if (embeddingText) return embeddingText.replace(/\s+/g, ' ').slice(0, 180);
  const country = getRowField(row, 'Country', 'OtherPartyCountry');
  const cause = getRowField(row, 'EstablishmentCause');
  if (country || cause) return [cause, country].filter(Boolean).join(' · ');
  return '—';
}

export function getResultCoords(row: Record<string, unknown>): { lat: number; lng: number } | null {
  const latRaw = row.N ?? row.lat ?? row.latitude ?? row.Latitude;
  const lngRaw = row.E ?? row.lng ?? row.longitude ?? row.Longitude;
  const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
  const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function getMapResults(results: SearchResult[]) {
  return results
    .map((result) => {
      const coords = getResultCoords(result.row);
      if (!coords) return null;
      return { result, ...coords };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export const METADATA_FILTER_FIELDS = [
  { value: 'Country', labelKey: 'search.meta.country' },
  { value: 'OtherPartyCountry', labelKey: 'search.meta.otherPartyCountry' },
  { value: 'EstablishmentCause', labelKey: 'search.meta.establishmentCause' },
  { value: 'source_imei', labelKey: 'search.meta.sourceImei' },
  { value: 'IMEI', labelKey: 'search.meta.imei' },
  { value: 'Spot', labelKey: 'search.meta.spot' },
] as const;

export const METADATA_FILTER_PRESETS: Record<string, string[]> = {
  Country: ['Iraq', 'Iran', 'Kuwait'],
  OtherPartyCountry: ['Thuraya', 'Qatar', 'Iraq', 'United Arab Emirates', 'Iran'],
  EstablishmentCause: [
    'Mobile Originated Call',
    'In Response to Paging',
    'Short Message Services',
    'Location Update',
  ],
};
