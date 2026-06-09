/* WMO weather-code → Nederlandse conditie + lucide-iconnaam.
   Gedeeld door de API (server) en de weerkaart (client). */

const WEEKDAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']

export function weekdayName(date: Date): string {
  return WEEKDAYS[date.getDay()]
}

export interface WeatherDescription {
  condition: string
  icon: string
}

export function describeWeatherCode(code: number): WeatherDescription {
  if (code === 0) return { condition: 'Zonnig', icon: 'Sun' }
  if (code === 1 || code === 2) return { condition: 'Half bewolkt', icon: 'CloudSun' }
  if (code === 3) return { condition: 'Bewolkt', icon: 'Cloudy' }
  if (code === 45 || code === 48) return { condition: 'Mist', icon: 'CloudFog' }
  if (code >= 51 && code <= 57) return { condition: 'Motregen', icon: 'CloudDrizzle' }
  if (code >= 61 && code <= 67) return { condition: 'Regen', icon: 'CloudRain' }
  if (code >= 71 && code <= 77) return { condition: 'Sneeuw', icon: 'CloudSnow' }
  if (code >= 80 && code <= 82) return { condition: 'Buien', icon: 'CloudRain' }
  if (code === 85 || code === 86) return { condition: 'Sneeuwbuien', icon: 'CloudSnow' }
  if (code >= 95) return { condition: 'Onweer', icon: 'CloudLightning' }
  return { condition: 'Wisselend', icon: 'Cloud' }
}

/** Codes met neerslag — gebruikt voor de "training afgelast?"-prompt. */
export function isWet(code: number): boolean {
  return code >= 51
}
