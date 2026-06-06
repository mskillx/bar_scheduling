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

  const deleteWeek = async () => {
    if (!confirm(t('shift.deleteWeekConfirm'))) return
    for (const s of shifts) {
      await shiftsApi.delete(s.id)
    }
    qc.invalidateQueries({ queryKey: ['shifts'] })
    toast.success(t('shiftManagement.weekCleared'))
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

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
            <div key={day.toISOString()} className="card p-3 min-h-[120px]">
              <div className="text-xs font-semibold text-gray-400 mb-2">
                {format(day, 'EEE dd')}
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
