import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'screensaver-config.json');

interface ScreensaverConfig {
  timeoutMinutes: number;
}

const DEFAULT_CONFIG: ScreensaverConfig = {
  timeoutMinutes: 5,
};

async function getConfig(): Promise<ScreensaverConfig> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function saveConfig(config: ScreensaverConfig): Promise<void> {
  const dir = path.dirname(CONFIG_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function GET() {
  try {
    const config = await getConfig();
    return Response.json(config);
  } catch (error) {
    console.error('Fehler beim Laden der Screensaver-Konfiguration:', error);
    return Response.json(DEFAULT_CONFIG);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { timeoutMinutes } = body;

    if (!Number.isFinite(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > 60) {
      return Response.json(
        { error: 'timeoutMinutes muss zwischen 1 und 60 liegen' },
        { status: 400 }
      );
    }

    const config: ScreensaverConfig = {
      timeoutMinutes: Math.round(timeoutMinutes),
    };

    await saveConfig(config);
    return Response.json(config);
  } catch (error) {
    console.error('Fehler beim Speichern der Screensaver-Konfiguration:', error);
    return Response.json({ error: 'Fehler beim Speichern' }, { status: 500 });
  }
}
