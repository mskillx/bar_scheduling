import { useState } from 'react'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useShifts, useDeleteShift } from '@/hooks/useShifts'
import { shiftsApi } from '@/api/shifts'
import { usersApi } from '@/api/users'
import Modal from '@/components/common/Modal'
import ShiftForm from '@/components/shifts/ShiftForm'
import type { Shift, ShiftCreate, ShiftCreateMulti, ShiftUpdate } from '@/types/shift'
import { formatTime, shiftDurationHours } from '@/utils/helpers'

export default function ShiftManagement() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekEnd = addDays(weekStart, 7)

  const { data: shifts = [] } = useShifts({
    start: weekStart.toISOString(),
    end: weekEnd.toISOString(),
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  const [createOpen, setCreateOpen] = useState(false)
  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [clipboard, setClipboard] = useState<{ day: Date; shifts: Shift[] } | null>(null)
  const deleteShift = useDeleteShift()

  const createMutation = useMutation({
    mutationFn: (data: ShiftCreate) => shiftsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(t('shift.created'))
      setCreateOpen(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || t('user.failed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShiftUpdate }) => shiftsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(t('shift.updated'))
      setEditShift(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || t('user.failed')),
  })

  const copyPreviousWeek = async () => {
    const prevStart = subWeeks(weekStart, 1)
    const prevEnd = addDays(prevStart, 7)
    const prevShifts = await shiftsApi.list({ start: prevStart.toISOString(), end: prevEnd.toISOString() })
    const offset = 7 * 24 * 60 * 60 * 1000

    let created = 0
    for (const s of prevShifts) {
      try {
        await shiftsApi.create({
          employee_id: s.employee_id,
          start_datetime: new Date(new Date(s.start_datetime).getTime() + offset).toISOString(),
          end_datetime: new Date(new Date(s.end_datetime).getTime() + offset).toISOString(),
          notes: s.notes || undefined,
          status: 'scheduled',
        })
        created++
      } catch {}
    }
    qc.invalidateQueries({ queryKey: ['shifts'] })
    toast.success(t('shiftManagement.copiedShifts', { count: created }))
  }

  const copyDay = (day: Date) => {
    const dayShifts = shifts.filter(
      (s) => format(new Date(s.start_datetime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    )
    setClipboard({ day, shifts: dayShifts })
    toast.success(t('shiftManagement.copiedDay', { count: dayShifts.length }))
  }

  const pasteDay = async (targetDay: Date) => {
    if (!clipboard) return
    const offsetMs = targetDay.getTime() - clipboard.day.getTime()
    let created = 0
    for (const s of clipboard.shifts) {
      try {
        await shiftsApi.create({
          employee_id: s.employee_id,
          start_datetime: new Date(new Date(s.start_datetime).getTime() + offsetMs).toISOString(),
          end_datetime: new Date(new Date(s.end_datetime).getTime() + offsetMs).toISOString(),
          notes: s.notes || undefined,
          status: 'scheduled',
        })
        created++
      } catch {}
    }
    qc.invalidateQueries({ queryKey: ['shifts'] })
    toast.success(t('shiftManagement.pastedShifts', { count: created }))
  }

  const deleteWeek = async () => {
    if (!confirm(t('shift.deleteWeekConfirm'))) return
    for (const s of shifts) {
      await shiftsApi.delete(s.id)
    }
    qc.invalidateQueries({ queryKey: ['shifts'] })
    toast.success(t('shiftManagement.weekCleared'))
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Build hourly coverage: coverage[dayIndex][hour 0-23] = employee count
  const ONE_HOUR = 60 * 60 * 1000
  const coverage: number[][] = days.map(() => new Array(24).fill(0))
  for (const s of shifts) {
    let ts = Math.floor(new Date(s.start_datetime).getTime() / ONE_HOUR) * ONE_HOUR
    const endTs = new Date(s.end_datetime).getTime()
    while (ts < endTs) {
      const slotDate = new Date(ts)
      const dayIdx = days.findIndex(
        (d) => format(d, 'yyyy-MM-dd') === format(slotDate, 'yyyy-MM-dd')
      )
      if (dayIdx !== -1) coverage[dayIdx][slotDate.getHours()]++
      ts += ONE_HOUR
    }
  }
  const maxCoverage = Math.max(0, ...coverage.flat())
  const usedHourSet = new Set<number>(
    coverage.flatMap((day) => day.map((c, h) => (c > 0 ? h : -1))).filter((h) => h >= 0)
  )
  // Order hours chronologically starting after the longest unused gap
  const sortedCoverageHours: number[] = []
  if (usedHourSet.size > 0) {
    let longestGapLen = 0, gapEndHour = 0, h = 0
    while (h < 24) {
      if (!usedHourSet.has(h)) {
        let len = 0
        while (len < 24 && !usedHourSet.has((h + len) % 24)) len++
        if (len > longestGapLen) { longestGapLen = len; gapEndHour = (h + len) % 24 }
        h += len
      } else { h++ }
    }
    for (let i = 0; i < 24; i++) {
      const hour = (gapEndHour + i) % 24
      if (usedHourSet.has(hour)) sortedCoverageHours.push(hour)
    }
  }
  const coverageCellClass = (count: number): string => {
    if (count === 0 || maxCoverage === 0) return 'text-dark-500'
    const r = count / maxCoverage
    if (r <= 0.25) return 'bg-brand-950/80 text-brand-500'
    if (r <= 0.5)  return 'bg-brand-900/80 text-brand-400'
    if (r <= 0.75) return 'bg-brand-700/80 text-brand-200'
    return 'bg-brand-600/90 text-white font-semibold'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-white">{t('shiftManagement.title')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
            <button
              className="btn-secondary py-1 px-2 text-xs"
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
            >
              ←
            </button>
            <span className="text-sm text-gray-300 px-2">
              {format(weekStart, 'dd MMM')} – {format(weekEnd, 'dd MMM yyyy')}
            </span>
            <button
              className="btn-secondary py-1 px-2 text-xs"
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            >
              →
            </button>
          </div>
          <button className="btn-secondary text-xs" onClick={copyPreviousWeek}>
            {t('shiftManagement.copyPrevWeek')}
          </button>
          <button className="btn-danger text-xs" onClick={deleteWeek}>
            {t('shiftManagement.clearWeek')}
          </button>
          <button className="btn-primary text-sm" onClick={() => setCreateOpen(true)}>
            {t('shift.newShift')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayShifts = shifts.filter(
            (s) => format(new Date(s.start_datetime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
          )
          return (
            <div
              key={day.toISOString()}
              className={`card p-3 min-h-[120px] transition-shadow ${
                clipboard && format(clipboard.day, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  ? 'ring-2 ring-brand-500/50'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400">{format(day, 'EEE dd')}</span>
                <div className="flex gap-1">
                  <button
                    className="text-gray-500 hover:text-gray-300 transition-colors leading-none"
                    title={t('shiftManagement.copyDay')}
                    onClick={() => copyDay(day)}
                  >
                    📋
                  </button>
                  {clipboard && format(clipboard.day, 'yyyy-MM-dd') !== format(day, 'yyyy-MM-dd') && (
                    <button
                      className="text-brand-400 hover:text-brand-300 transition-colors leading-none"
                      title={t('shiftManagement.pasteDay')}
                      onClick={() => pasteDay(day)}
                    >
                      📄
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {dayShifts.map((s) => (
                  <div
                    key={s.id}
                    className="bg-brand-600/20 border border-brand-600/30 rounded p-1.5 group"
                  >
                    <div className="text-xs text-white font-medium truncate">
                      {s.employee_name || `#${s.employee_id}`}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatTime(s.start_datetime)}–{formatTime(s.end_datetime)}
                    </div>
                    <div className="hidden group-hover:flex gap-1 mt-1">
                      <button
                        className="text-xs text-brand-400 hover:text-brand-300"
                        onClick={() => setEditShift(s)}
                      >
                        {t('user.edit')}
                      </button>
                      <button
                        className="text-xs text-red-400 hover:text-red-300"
                        onClick={() => {
                          if (confirm(t('shift.deleteConfirm'))) deleteShift.mutate(s.id)
                        }}
                      >
                        {t('shift.del')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {sortedCoverageHours.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-600">
            <h2 className="font-medium text-white">{t('shiftManagement.hourlyCoverage')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('shiftManagement.hourlyCoverageDesc')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dark-600">
                  <th className="text-left px-4 py-2 text-gray-500 w-14">{t('shiftManagement.hour')}</th>
                  {days.map((d) => (
                    <th key={d.toISOString()} className="text-center px-2 py-2 text-gray-400 font-medium">
                      {format(d, 'EEE dd')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCoverageHours.map((hour) => (
                  <tr key={hour} className="border-b border-dark-700/40">
                    <td className="px-4 py-1.5 text-gray-500 font-mono tabular-nums">
                      {String(hour).padStart(2, '0')}:00
                    </td>
                    {days.map((_, di) => {
                      const count = coverage[di][hour]
                      return (
                        <td key={di} className={`text-center py-1.5 transition-colors ${coverageCellClass(count)}`}>
                          {count > 0 ? count : <span className="opacity-20">·</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-600">
          <h2 className="font-medium text-white">{t('shiftManagement.weeklySummary')}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-600">
              <th className="text-left px-6 py-2 text-gray-400">{t('shift.employee')}</th>
              <th className="text-left px-6 py-2 text-gray-400">{t('shiftManagement.shifts')}</th>
              <th className="text-left px-6 py-2 text-gray-400">{t('shiftManagement.hours')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {users
              .filter((u) => u.active && u.employee_id)
              .map((u) => {
                const empShifts = shifts.filter((s) => s.employee_id === u.employee_id)
                const hours = empShifts.reduce(
                  (sum, s) => sum + shiftDurationHours(s.start_datetime, s.end_datetime),
                  0
                )
                return (
                  <tr key={u.id} className="hover:bg-dark-700/50">
                    <td className="px-6 py-2 text-white">{u.first_name} {u.last_name}</td>
                    <td className="px-6 py-2 text-gray-300">{empShifts.length}</td>
                    <td className="px-6 py-2 text-gray-300">{hours.toFixed(1)}h</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('shift.createShift')}>
        <ShiftForm
          onSubmit={async (data) => {
            if ('employee_ids' in data && Array.isArray((data as ShiftCreateMulti).employee_ids)) {
              const { employee_ids, ...rest } = data as ShiftCreateMulti
              await Promise.all(
                employee_ids.map((employee_id) =>
                  shiftsApi.create({ ...rest, employee_id } as ShiftCreate)
                )
              )
              qc.invalidateQueries({ queryKey: ['shifts'] })
              toast.success(t('shift.created'))
              setCreateOpen(false)
            } else {
              createMutation.mutate(data as ShiftCreate)
            }
          }}
          onCancel={() => setCreateOpen(false)}
          loading={createMutation.isPending}
          multiEmployee
        />
      </Modal>

      <Modal open={!!editShift} onClose={() => setEditShift(null)} title={t('shift.editShiftTitle')}>
        {editShift && (
          <ShiftForm
            defaultValues={{ ...editShift, notes: editShift.notes ?? undefined }}
            onSubmit={(data) => updateMutation.mutate({ id: editShift.id, data: data as ShiftUpdate })}
            onCancel={() => setEditShift(null)}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
