import { useMemo } from 'react';
import { Clock, Hash, ToggleLeft, Type } from 'lucide-react';
import { ColumnTypeBadge } from '@/components/ColumnTypeBadge';
import { MultiCalendarDatePicker } from '@/components/MultiCalendarDatePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type FilterOperator,
  buildDatetimeFilterValue,
  datetimeHasTimeComponent,
  getDefaultOperator,
  getOperatorLabelKey,
  getOperatorsForType,
  normalizeFilterDataType,
  operatorNeedsValue,
  parseFilterDate,
  parseFilterTime,
  type MetadataFilterField,
} from '@/lib/metadataFilters';
import type { ColumnType } from '@/types';

interface SearchMetadataFilterProps {
  fields: MetadataFilterField[];
  field: string;
  operator: FilterOperator;
  value: string;
  onFieldChange: (field: string) => void;
  onOperatorChange: (operator: FilterOperator) => void;
  onValueChange: (value: string) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

function typeIcon(dataType: ReturnType<typeof normalizeFilterDataType>) {
  switch (dataType) {
    case 'number':
      return Hash;
    case 'boolean':
      return ToggleLeft;
    case 'datetime':
    case 'time':
      return Clock;
    case 'text':
    case 'string':
    default:
      return Type;
  }
}

export function SearchMetadataFilter({
  fields,
  field,
  operator,
  value,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  t,
  isRtl,
}: SearchMetadataFilterProps) {
  const selectedField = fields.find((item) => item.field === field);
  const dataType = normalizeFilterDataType(selectedField?.type ?? 'string');
  const operators = getOperatorsForType(selectedField?.type ?? 'string');
  const needsValue = operatorNeedsValue(operator);
  const includeTime = datetimeHasTimeComponent(selectedField?.exampleValue);
  const selectedDate = parseFilterDate(value);
  const selectedTime = parseFilterTime(value);
  const gregorianDatePart = value.split('T')[0] ?? '';
  const TypeIcon = typeIcon(dataType);

  const columnType = (selectedField?.type ?? 'string') as ColumnType;

  const valueControl = useMemo(() => {
    if (!field || !needsValue) return null;

    switch (dataType) {
      case 'boolean':
        return (
          <RadioGroup
            value={value || ''}
            onValueChange={onValueChange}
            className="flex gap-4 h-9 items-center"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="true" id="filter-bool-true" />
              <Label htmlFor="filter-bool-true" className="text-sm font-normal cursor-pointer">
                {t('search.booleanTrue')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="false" id="filter-bool-false" />
              <Label htmlFor="filter-bool-false" className="text-sm font-normal cursor-pointer">
                {t('search.booleanFalse')}
              </Label>
            </div>
          </RadioGroup>
        );

      case 'datetime':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <MultiCalendarDatePicker
              value={gregorianDatePart}
              onChange={(isoDate) =>
                onValueChange(buildDatetimeFilterValue(parseFilterDate(isoDate), selectedTime, includeTime))
              }
              placeholder={t('search.pickDate')}
              isRtl={isRtl}
              t={t}
            />
            {includeTime && (
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) =>
                  onValueChange(
                    buildDatetimeFilterValue(selectedDate, e.target.value, true)
                  )
                }
                className="h-9 w-[130px] font-mono"
              />
            )}
          </div>
        );

      case 'time':
        return (
          <Input
            type="time"
            step={1}
            value={selectedTime || value}
            onChange={(e) => onValueChange(e.target.value)}
            className="h-9 w-[140px] font-mono"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            step={selectedField?.type === 'float' ? 'any' : '1'}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={selectedField?.exampleValue || t('search.filterValue')}
            className="h-9 font-mono"
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={selectedField?.exampleValue || t('search.filterValue')}
            className="h-9"
          />
        );
    }
  }, [
    dataType,
    field,
    gregorianDatePart,
    includeTime,
    isRtl,
    needsValue,
    onValueChange,
    selectedDate,
    selectedField?.exampleValue,
    selectedField?.type,
    selectedTime,
    t,
    value,
  ]);

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <TypeIcon className="h-3.5 w-3.5" />
        {t('search.metadataFilter')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4 space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('search.filterField')}</Label>
          <Select
            value={field || '__none__'}
            onValueChange={(v) => {
              if (v === '__none__') {
                onFieldChange('');
                onOperatorChange('eq');
                onValueChange('');
                return;
              }
              const meta = fields.find((item) => item.field === v);
              onFieldChange(v);
              onOperatorChange(getDefaultOperator(meta?.type ?? 'string'));
              onValueChange('');
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('search.noFilter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t('search.noFilter')}</SelectItem>
              {fields.map((item) => (
                <SelectItem key={item.field} value={item.field}>
                  <span className="font-mono">{item.field}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3 space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('search.filterOperator')}</Label>
          <Select
            value={operator}
            onValueChange={(v) => onOperatorChange(v as FilterOperator)}
            disabled={!field}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('search.filterOperator')} />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op} value={op}>
                  {t(getOperatorLabelKey(dataType, op))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-5 space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('search.filterValue')}</Label>
          {!field ? (
            <div className="h-9 flex items-center text-xs text-muted-foreground px-3 rounded-md border border-dashed border-border">
              {t('search.selectFieldFirst')}
            </div>
          ) : !needsValue ? (
            <div className="h-9 flex items-center text-xs text-muted-foreground px-3 rounded-md border border-border bg-background">
              {t('search.noValueNeeded')}
            </div>
          ) : (
            valueControl
          )}
        </div>
      </div>

      {selectedField && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <ColumnTypeBadge type={columnType} />
          {selectedField.exampleValue ? (
            <span className="text-[11px] text-muted-foreground font-mono truncate max-w-full">
              {t('search.exampleValue')}: {selectedField.exampleValue}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
