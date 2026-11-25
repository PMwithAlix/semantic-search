import DateObject from 'react-date-object';
import arabic from 'react-date-object/calendars/arabic';
import gregorian from 'react-date-object/calendars/gregorian';
import persian from 'react-date-object/calendars/persian';
import arabic_ar from 'react-date-object/locales/arabic_ar';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import persian_fa from 'react-date-object/locales/persian_fa';

export type CalendarSystem = 'shamsi' | 'qamari' | 'miladi';

const SYSTEMS: CalendarSystem[] = ['shamsi', 'qamari', 'miladi'];

export function getCalendarConfig(system: CalendarSystem) {
  switch (system) {
    case 'shamsi':
      return { calendar: persian, locale: persian_fa, format: 'YYYY/MM/DD' };
    case 'qamari':
      return { calendar: arabic, locale: arabic_ar, format: 'YYYY/MM/DD' };
    default:
      return { calendar: gregorian, locale: gregorian_en, format: 'YYYY-MM-DD' };
  }
}

export function getDefaultCalendarSystem(isRtl: boolean): CalendarSystem {
  return isRtl ? 'shamsi' : 'miladi';
}

export function gregorianIsoToDateObject(
  isoDate: string,
  system: CalendarSystem
): DateObject | undefined {
  const datePart = isoDate.split('T')[0]?.trim();
  if (!datePart) return undefined;

  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return undefined;

  const base = new DateObject({
    calendar: gregorian,
    locale: gregorian_en,
    year,
    month,
    day,
  });

  if (system === 'miladi') return base;

  const { calendar, locale } = getCalendarConfig(system);
  return base.convert(calendar, locale);
}

export function dateObjectToGregorianIso(date: DateObject): string {
  const gregorianDate = new DateObject(date).convert(gregorian, gregorian_en);
  const year = gregorianDate.year;
  const month = String(gregorianDate.month.number).padStart(2, '0');
  const day = String(gregorianDate.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatGregorianIsoInCalendar(isoDate: string, system: CalendarSystem): string {
  const dateObject = gregorianIsoToDateObject(isoDate, system);
  if (!dateObject) return '';
  return dateObject.format(getCalendarConfig(system).format);
}

export function formatAllCalendarLabels(isoDate: string): Record<CalendarSystem, string> {
  return {
    shamsi: formatGregorianIsoInCalendar(isoDate, 'shamsi'),
    qamari: formatGregorianIsoInCalendar(isoDate, 'qamari'),
    miladi: formatGregorianIsoInCalendar(isoDate, 'miladi'),
  };
}

export { SYSTEMS as CALENDAR_SYSTEMS };
