import { Field, SegmentedControl } from '../ui/Field'
import DateRangeSlider, { DATE_RANGE_DAYS } from '../ui/DateRangeSlider'
import {
  COURSE_RANGE_DAYS,
  MED_SCHEDULE_OPTIONS,
  courseEndLabel,
  courseStartLabel,
} from '../../utils/medSchedule'

export default function MedScheduleFields({
  schedule,
  range,
  onScheduleChange,
  onRangeChange,
  hint = 'Same start/end selector as Search. The right end is no end date — the next weekly or monthly dose stays unchecked on Today until you log it.',
}) {
  const [start, end] = range
  const rangeActive = start > 0 || end < COURSE_RANGE_DAYS

  return (
    <>
      <Field label="Schedule">
        <SegmentedControl
          value={schedule}
          onChange={onScheduleChange}
          options={MED_SCHEDULE_OPTIONS}
          ariaLabel="Med schedule"
          columns={2}
        />
      </Field>
      <div className="text-left">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Course</p>
          {rangeActive ? (
            <button
              type="button"
              className="text-xs font-semibold text-[#F59E0B]"
              onClick={() => onRangeChange([0, DATE_RANGE_DAYS])}
            >
              No end
            </button>
          ) : null}
        </div>
        <DateRangeSlider
          start={start}
          end={end}
          onChange={onRangeChange}
          startLabel={courseStartLabel(start)}
          endLabel={courseEndLabel(end)}
          max={DATE_RANGE_DAYS}
        />
        <p className="mt-1 text-xs font-normal text-slate-400">{hint}</p>
      </div>
    </>
  )
}
