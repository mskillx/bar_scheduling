import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { format, addDays, parseISO } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import { shiftsApi } from '@/api/shifts'
import type { ShiftCreate, ShiftCreateMulti, ShiftUpdate } from '@/types/shift'

interface ShiftFormProps {
  defaultValues?: Partial<ShiftCreate & { id?: number }>
  onSubmit: (data: ShiftCreate | ShiftUpdate | ShiftCreateMulti) => void
  onCancel: () => void
  loading?: boolean
  multiEmployee?: boolean
}

function toLocalDatetimeValue(isoString?: string): string {
  if (!isoString) return ''
  return format(new Date(isoString), "yyyy-MM-dd'T'HH:mm")
}

function extractDate(datetimeLocal: string | undefined): string {
  if (datetimeLocal) return datetimeLocal.split('T')[0]
  return format(new Date(), 'yyyy-MM-dd')
}

export default function ShiftForm({ defaultValues, onSubmit, onCancel, loading, multiEmployee }: ShiftFormProps) {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: shiftsApi.listTemplates })

  const activeEmployees = users.filter((u) => u.active && u.employee_id)

  const initialStart = toLocalDatetimeValue(defaultValues?.start_datetime)

  // Separate date state drives the template picker; stays in sync with start_datetime
  const [shiftDate, setShiftDate] = useState<string>(extractDate(initialStart || undefined))

  // For multi-employee mode
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>(
    defaultValues?.employee_id ? [defaultValues.employee_id] : []
  )
  const [employeeError, setEmployeeError] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShiftCreate>({
    defaultValues: {
      employee_id: defaultValues?.employee_id,
      start_datetime: initialStart,
      end_datetime: toLocalDatetimeValue(defaultValues?.end_datetime),
      notes: defaultValues?.notes || '',
      status: defaultValues?.status || 'scheduled',
    },
  })

  const watchedStart = watch('start_datetime')
  const watchedEnd = watch('end_datetime')

  useEffect(() => {
    const startVal = toLocalDatetimeValue(defaultValues?.start_datetime)
    reset({
      employee_id: defaultValues?.employee_id,
      start_datetime: startVal,
      end_datetime: toLocalDatetimeValue(defaultValues?.end_datetime),
      notes: defaultValues?.notes || '',
      status: defaultValues?.status || 'scheduled',
    })
    setShiftDate(extractDate(startVal || undefined))
    if (defaultValues?.employee_id) {
      setSelectedEmployeeIds([defaultValues.employee_id])
    } else if (multiEmployee) {
      setSelectedEmployeeIds([])
    }
  }, [defaultValues, reset, multiEmployee])

  // Keep shiftDate in sync when user edits start_datetime manually
  useEffect(() => {
    if (watchedStart) {
      const d = watchedStart.split('T')[0]
      setShiftDate((prev) => (prev !== d ? d : prev))
    }
  }, [watchedStart])

  const handleDateChange = (newDate: string) => {
    setShiftDate(newDate)
    const startTime = watchedStart?.split('T')[1]
    const endTime = watchedEnd?.split('T')[1]
    if (startTime) setValue('start_datetime', `${newDate}T${startTime}`)
    if (endTime) setValue('end_datetime', `${newDate}T${endTime}`)
  }

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === Number(templateId))
    if (!tpl) return
    const startTime = tpl.start_time.slice(0, 5)
    const endTime = tpl.end_time.slice(0, 5)
    const startHour = parseInt(tpl.start_time.split(':')[0])
    const endHour = parseInt(tpl.end_time.split(':')[0])
    // End crosses midnight when end hour is earlier than start hour
    const endDateStr =
      endHour < startHour
        ? format(addDays(parseISO(shiftDate), 1), 'yyyy-MM-dd')
        : shiftDate
    setValue('start_datetime', `${shiftDate}T${startTime}`)
    setValue('end_datetime', `${endDateStr}T${endTime}`)
  }

  const toggleEmployee = (empId: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    )
    setEmployeeError(false)
  }

  const submit = (data: ShiftCreate) => {
    if (multiEmployee) {
      if (selectedEmployeeIds.length === 0) {
        setEmployeeError(true)
        return
      }
      onSubmit({
        employee_ids: selectedEmployeeIds,
        start_datetime: new Date(data.start_datetime).toISOString(),
        end_datetime: new Date(data.end_datetime).toISOString(),
        notes: data.notes,
        status: data.status,
      } as ShiftCreateMulti)
    } else {
      onSubmit({
        ...data,
        start_datetime: new Date(data.start_datetime).toISOString(),
        end_datetime: new Date(data.end_datetime).toISOString(),
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* Date picker — drives template application */}
      <div>
        <label className="label">Date</label>
        <input
          type="date"
          className="input"
          value={shiftDate}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      </div>

      {/* Template selector */}
      {templates.length > 0 && (
        <div>
          <label className="label">Apply Template</label>
          <select
            className="input"
            onChange={(e) => applyTemplate(e.target.value)}
            defaultValue=""
          >
            <option value="">Choose template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.start_time.slice(0, 5)} – {t.end_time.slice(0, 5)})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Start</label>
        <input
          type="datetime-local"
          className="input"
          {...register('start_datetime', { required: 'Start time is required' })}
        />
        {errors.start_datetime && (
          <p className="text-xs text-red-400 mt-1">{errors.start_datetime.message}</p>
        )}
      </div>

      <div>
        <label className="label">End</label>
        <input
          type="datetime-local"
          className="input"
          {...register('end_datetime', { required: 'End time is required' })}
        />
        {errors.end_datetime && (
          <p className="text-xs text-red-400 mt-1">{errors.end_datetime.message}</p>
        )}
      </div>

      {/* Employee selection */}
      {multiEmployee ? (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Employees</label>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                onClick={() => {
                  setSelectedEmployeeIds(activeEmployees.map((u) => u.employee_id!))
                  setEmployeeError(false)
                }}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                onClick={() => setSelectedEmployeeIds([])}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-lg border border-white/10 bg-black/20 p-2">
            {activeEmployees.map((u) => (
              <label
                key={u.employee_id}
                className="flex items-center gap-2.5 cursor-pointer rounded px-2 py-1.5 hover:bg-white/5 transition-colors"
              >
                <input
                  type="checkbox"
                  className="accent-purple-500 h-4 w-4 shrink-0"
                  checked={selectedEmployeeIds.includes(u.employee_id!)}
                  onChange={() => toggleEmployee(u.employee_id!)}
                />
                <span className="text-sm text-white/90">
                  {u.first_name} {u.last_name}
                </span>
              </label>
            ))}
          </div>
          {employeeError && (
            <p className="text-xs text-red-400 mt-1">Select at least one employee</p>
          )}
        </div>
      ) : (
        <div>
          <label className="label">Employee</label>
          <select
            className="input"
            {...register('employee_id', { required: 'Employee is required', valueAsNumber: true })}
          >
            <option value="">Select employee…</option>
            {activeEmployees.map((u) => (
              <option key={u.employee_id} value={u.employee_id!}>
                {u.first_name} {u.last_name}
              </option>
            ))}
          </select>
          {errors.employee_id && (
            <p className="text-xs text-red-400 mt-1">{errors.employee_id.message}</p>
          )}
        </div>
      )}

      <div>
        <label className="label">Status</label>
        <select className="input" {...register('status')}>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder="Any notes…"
          {...register('notes')}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading
            ? 'Saving…'
            : multiEmployee && selectedEmployeeIds.length > 1
              ? `Create ${selectedEmployeeIds.length} Shifts`
              : 'Save Shift'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
