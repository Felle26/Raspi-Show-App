'use client';

import React from 'react';

interface ScreensaverProps {
  onActivity: () => void;
}

interface WeatherData {
  source: string;
  location: string;
  temperatureC: number;
  windKmh: number;
  weatherCode: number;
  weatherText: string;
  updatedAt: string;
}

function getDayPartLabel(hour: number): string {
  if (hour >= 5 && hour <= 10) {
    return 'Morgens';
  }

  if (hour >= 11 && hour <= 13) {
    return 'Mittags';
  }

  if (hour >= 14 && hour <= 17) {
    return 'Nachmittags';
  }

  if (hour >= 18 && hour <= 22) {
    return 'Abends';
  }

  return 'Nachts';
}

export function Screensaver({ onActivity }: ScreensaverProps) {
  const [now, setNow] = React.useState(() => new Date());
  const [weatherData, setWeatherData] = React.useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  React.useEffect(() => {
    const handleActivity = () => {
      onActivity();
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [onActivity]);

  React.useEffect(() => {
    let ignore = false;

    const loadWeather = async () => {
      try {
        if (!ignore) {
          setWeatherLoading(true);
        }

        const response = await fetch('/api/weather', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Fehler beim Laden der Wetterdaten');
        }

        const data = (await response.json()) as WeatherData;
        if (!ignore) {
          setWeatherData(data);
        }
      } catch {
        if (!ignore) {
          setWeatherData(null);
        }
      } finally {
        if (!ignore) {
          setWeatherLoading(false);
        }
      }
    };

    loadWeather();
    const intervalId = window.setInterval(loadWeather, 10 * 60 * 1000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const timeText = now.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateText = now.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const dayPartLabel = getDayPartLabel(now.getHours());

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-50">
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-80 animated-bg" />

      {/* Animated circles */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-1/2 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Quartered layout */}
      <div className="relative z-10 grid h-full w-full grid-cols-2 grid-rows-2">
        {/* 1. Feld: Uhrzeit, Datum und Tageszeit */}
        <section className="border border-white/10 p-8 flex flex-col items-center justify-center text-center">
          <p className="text-sm tracking-[0.2em] uppercase text-cyan-200/80 mb-4">Aktuelle Zeit</p>
          <p className="text-6xl md:text-7xl font-bold text-white leading-none mb-4">{timeText}</p>
          <p className="text-lg md:text-xl text-slate-200 mb-2 capitalize">{dateText}</p>
          <span className="inline-flex w-fit rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-1 text-cyan-100 text-base font-semibold">
            {dayPartLabel}
          </span>
        </section>

        {/* 2. Feld */}
        <section className="border border-white/10 p-8 flex flex-col items-center justify-center text-center">
          <p className="text-sm tracking-[0.2em] uppercase text-orange-200/80 mb-4">Wetterbericht</p>
          {weatherLoading ? (
            <p className="text-slate-300/80 text-lg">Wetter wird geladen...</p>
          ) : weatherData ? (
            <>
              <p className="text-5xl md:text-6xl font-bold text-white leading-none mb-2">
                {Math.round(weatherData.temperatureC)}°C
              </p>
              <p className="text-lg md:text-xl text-slate-200 mb-2">{weatherData.weatherText}</p>
              <p className="text-base text-slate-300 mb-1">Wind: {Math.round(weatherData.windKmh)} km/h</p>
              <p className="text-sm text-slate-400 mb-4">Ort: {weatherData.location}</p>
              <p className="text-xs text-slate-500">Quelle: {weatherData.source}</p>
            </>
          ) : (
            <p className="text-slate-300/80 text-lg">Wetterdaten aktuell nicht verfügbar</p>
          )}
        </section>

        {/* 3. Feld */}
        <section className="border border-white/10 p-8 flex items-center justify-center">
          <p className="text-slate-300/80 text-xl">Feld 3</p>
        </section>

        {/* 4. Feld */}
        <section className="border border-white/10 p-8 flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-3">💤</div>
          <h2 className="text-2xl font-bold text-white mb-2">Screensaver</h2>
          <p className="text-base text-slate-300">Berühre den Bildschirm, um fortzufahren</p>
        </section>

        {/* Animated dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex justify-center gap-3 mt-8">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-white rounded-full animate-bounce animation-delay-200" />
          <div className="w-3 h-3 bg-white rounded-full animate-bounce animation-delay-400" />
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animated-bg {
          background: linear-gradient(135deg, #0f172a, #6d28d9, #0f172a, #312e81, #000000);
          background-size: 300% 300%;
          animation: backgroundShift 150s ease-in-out infinite;
        }

        @keyframes backgroundShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
}
