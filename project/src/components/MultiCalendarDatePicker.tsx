import { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'react-multi-date-picker';
import type DateObject from 'react-date-object';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  CALENDAR_SYSTEMS,
  type CalendarSystem,
  dateObjectToGregorianIso,
  formatAllCalendarLabels,
  formatGregorianIsoInCalendar,
  getCalendarConfig,
  getDefaultCalendarSystem,
  gregorianIsoToDateObject,
} from '@/lib/calendarUtils';

interface MultiCalendarDatePickerProps {
  value: string;
  onChange: (gregorianIsoDate: string) => void;
  placeholder: string;
  isRtl: boolean;
  t: (key: string) => string;
  className?: string;
}

export function MultiCalendarDatePicker({
  value,
  onChange,
  placeholder,
  isRtl,
  t,
  className,
}: MultiCalendarDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [system, setSystem] = useState<CalendarSystem>(() => getDefaultCalendarSystem(isRtl));
  const { calendar, locale } = getCalendarConfig(system);

  useEffect(() => {
    setSystem(getDefaultCalendarSystem(isRtl));
  }, [isRtl]);

  const pickerValue = useMemo(
    () => (value ? gregorianIsoToDateObject(value, system) : undefined),
    [value, system]
  );

  const allLabels = value ? formatAllCalendarLabels(value) : null;
  const activeLabel = value ? formatGregorianIsoInCalendar(value, system) : '';

  const handleChange = (selected: DateObject | DateObject[] | null) => {
    if (!selected || Array.isArray(selected)) return;
    onChange(dateObjectToGregorianIso(selected));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 min-w-[180px] justify-start text-start font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 me-2 shrink-0" />
          <span className="truncate">{value ? activeLabel : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="mb-3 flex flex-wrap gap-1">
          {CALENDAR_SYSTEMS.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={system === item ? 'default' : 'outline'}
              className="h-7 px-2.5 text-xs"
              onClick={() => setSystem(item)}
            >
              {t(`search.calendar.${item}`)}
            </Button>
          ))}
        </div>

        <div className="multi-calendar-picker" dir={isRtl ? 'rtl' : 'ltr'}>
          <Calendar
            value={pickerValue}
            onChange={handleChange}
            calendar={calendar}
            locale={locale}
          />
        </div>

        {allLabels && (
          <div className="mt-3 space-y-1 rounded-md border border-border bg-muted/30 p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('search.calendar.equivalents')}
            </div>
            {CALENDAR_SYSTEMS.map((item) => (
              <div key={item} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{t(`search.calendar.${item}`)}</span>
                <span className="font-mono font-medium">{allLabels[item]}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
