import * as Application from 'expo-application';

const REPO = 'Mierul01/resione_taman';
const ASSET_NAME = 'neighbourly.apk';

export type UpdateInfo = {
  available: boolean;
  latestVersion?: string;
  downloadUrl?: string;
};

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
    if (!res.ok) return { available: false };
    const json = await res.json();
    const latestVersion: string = json.tag_name ?? '';
    const currentVersion = Application.nativeApplicationVersion ?? '0.0.0';
    if (!latestVersion || !isNewer(latestVersion, currentVersion)) {
      return { available: false };
    }
    const asset = (json.assets ?? []).find((a: any) => a.name === ASSET_NAME);
    const downloadUrl: string =
      asset?.browser_download_url ?? `https://github.com/${REPO}/releases/latest/download/${ASSET_NAME}`;
    return { available: true, latestVersion, downloadUrl };
  } catch {
    return { available: false };
  }
}
