import type { OpeningHour } from './api';

const DAY_INDEX = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function isOpenNow(hours: OpeningHour[], now: Date = new Date()): boolean {
  const today = DAY_INDEX[now.getDay()];
  const todayHours = hours.find((h) => h.day === today);
  if (!todayHours?.opensAt || !todayHours.closesAt) return false;

  const [openH, openM] = todayHours.opensAt.split(':').map(Number);
  const [closeH, closeM] = todayHours.closesAt.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= openH * 60 + openM && nowMinutes <= closeH * 60 + closeM;
}

export function todayHoursLabel(hours: OpeningHour[], now: Date = new Date()): string | null {
  const today = DAY_INDEX[now.getDay()];
  const todayHours = hours.find((h) => h.day === today);
  if (!todayHours?.opensAt || !todayHours.closesAt) return null;
  return `${todayHours.opensAt} - ${todayHours.closesAt}`;
}
