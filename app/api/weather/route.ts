import { NextResponse } from 'next/server';

const DEFAULT_LATITUDE = 51.1657;
const DEFAULT_LONGITUDE = 10.4515;

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Klar',
  1: 'Überwiegend klar',
  2: 'Teilweise bewölkt',
  3: 'Bedeckt',
  45: 'Nebel',
  48: 'Raureifnebel',
  51: 'Leichter Nieselregen',
  53: 'Nieselregen',
  55: 'Starker Nieselregen',
  56: 'Leichter gefrierender Nieselregen',
  57: 'Gefrierender Nieselregen',
  61: 'Leichter Regen',
  63: 'Regen',
  65: 'Starker Regen',
  66: 'Leichter gefrierender Regen',
  67: 'Gefrierender Regen',
  71: 'Leichter Schneefall',
  73: 'Schneefall',
  75: 'Starker Schneefall',
  77: 'Schneegriesel',
  80: 'Leichte Regenschauer',
  81: 'Regenschauer',
  82: 'Starke Regenschauer',
  85: 'Leichte Schneeschauer',
  86: 'Starke Schneeschauer',
  95: 'Gewitter',
  96: 'Gewitter mit leichtem Hagel',
  99: 'Gewitter mit Hagel',
};

export async function GET() {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(DEFAULT_LATITUDE));
    url.searchParams.set('longitude', String(DEFAULT_LONGITUDE));
    url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m');
    url.searchParams.set('timezone', 'Europe/Berlin');
    url.searchParams.set('models', 'dwd_icon');

    const response = await fetch(url.toString(), {
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Wetterdienst antwortete mit Status ${response.status}`);
    }

    const data = await response.json();
    const current = data.current ?? {};
    const weatherCode = Number(current.weather_code ?? -1);

    return NextResponse.json({
      source: 'DWD ICON via Open-Meteo',
      location: 'Deutschland',
      temperatureC: Number(current.temperature_2m ?? 0),
      windKmh: Number(current.wind_speed_10m ?? 0),
      weatherCode,
      weatherText: WEATHER_CODE_LABELS[weatherCode] ?? 'Unbekannt',
      updatedAt: current.time ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error('Fehler beim Laden der Wetterdaten:', error);

    return NextResponse.json(
      {
        error: 'Wetterdaten konnten nicht geladen werden',
      },
      { status: 500 }
    );
  }
}
