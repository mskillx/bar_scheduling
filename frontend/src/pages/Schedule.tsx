import { useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import itLocale from '@fullcalendar/core/locales/it'
import type { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from '@/hooks/useShifts'
import Modal from '@/components/common/Modal'
import ShiftForm from '@/components/shifts/ShiftForm'
import ShiftContextMenu from '@/components/shifts/ShiftContextMenu'
import { SLOT_MIN_TIME, SLOT_MAX_TIME } from '@/constants/schedule'
import type { ShiftCreate, ShiftCreateMulti, ShiftUpdate, Shift } from '@/types/shift'

const EMPLOYEE_COLORS = [
  '#8e1db5', // purple
  '#1d6db5', // blue
  '#b51d4a', // rose
  '#1db57a', // emerald
  '#b5891d', // amber
  '#5b1db5', // violet
  '#b5531d', // orange
  '#1d9fb5', // cyan
  '#b51d8e', // magenta
  '#1db5b5', // teal
  '#6db51d', // lime
  '#b5001d', // red
  '#001db5', // indigo
  '#b59a1d', // gold
  '#1d4ab5', // cobalt
  '#7ab51d', // yellow-green
  '#b5421d', // burnt orange
  '#1d78b5', // sky
  '#9a1db5', // orchid
  '#1db54a', // green
]

function employeeColor(employeeId: number, status: string): string {
  if (status === 'cancelled') return '#6b7280'
  return EMPLOYEE_COLORS[employeeId % EMPLOYEE_COLORS.length]
}

export default function Schedule() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [dateRange, setDateRange] = useState({
    start: format(new Date(), "yyyy-MM-dd'T'00:00:00'Z'"),
    end: format(new Date(), "yyyy-MM-dd'T'23:59:59'Z'"),
  })

  const { data: shifts = [] } = useShifts({ start: dateRange.start, end: dateRange.end })
  const createShift = useCreateShift()
  const updateShift = useUpdateShift()
  const deleteShift = useDeleteShift()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [newShiftDefaults, setNewShiftDefaults] = useState<Partial<ShiftCreate>>({})

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shiftId: number } | null>(null)

  const events = shifts.map((s) => ({
    id: String(s.id),
    title: s.employee_name || `Employee #${s.employee_id}`,
    start: s.start_datetime,
    end: s.end_datetime,
    backgroundColor: employeeColor(s.employee_id, s.status),
    borderColor: employeeColor(s.employee_id, s.status),
    extendedProps: { shift: s },
  }))

  const handleDatesSet = useCallback((info: { startStr: string; endStr: string }) => {
    setDateRange({ start: info.startStr, end: info.endStr })
  }, [])

  const handleDateSelect = useCallback(
    (info: DateSelectArg) => {
      if (!isAdmin) return
      setNewShiftDefaults({
        start_datetime: info.startStr,
        end_datetime: info.endStr,
      })
      setCreateModalOpen(true)
    },
    [isAdmin]
  )

  const handleEventContextMenu = useCallback(
    (info: EventClickArg) => {
      if (!isAdmin) return
      info.jsEvent.preventDefault()
      const shift: Shift = info.event.extendedProps.shift
      setContextMenu({
        x: info.jsEvent.clientX,
        y: info.jsEvent.clientY,
        shiftId: shift.id,
      })
    },
    [isAdmin]
  )

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      if (!isAdmin) { info.revert(); return }
      const shift: Shift = info.event.extendedProps.shift
      await updateShift.mutateAsync({
        id: shift.id,
        data: {
          start_datetime: info.event.startStr,
          end_datetime: info.event.endStr || info.event.startStr,
        },
      })
    },
    [isAdmin, updateShift]
  )

  const handleEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      if (!isAdmin) { info.revert(); return }
      const shift: Shift = info.event.extendedProps.shift
      await updateShift.mutateAsync({
        id: shift.id,
        data: {
          start_datetime: info.event.startStr,
          end_datetime: info.event.endStr,
        },
      })
    },
    [isAdmin, updateShift]
  )

  const openEditForShift = (shiftId: number) => {
    const shift = shifts.find((s) => s.id === shiftId)
    if (shift) {
      setSelectedShift(shift)
      setEditModalOpen(true)
    }
  }

  const handleCreate = async (data: ShiftCreate | ShiftUpdate | ShiftCreateMulti) => {
    if ('employee_ids' in data && Array.isArray((data as ShiftCreateMulti).employee_ids)) {
      const { employee_ids, ...rest } = data as ShiftCreateMulti
      await Promise.all(
        employee_ids.map((employee_id) =>
          createShift.mutateAsync({ ...rest, employee_id } as ShiftCreate)
        )
      )
    } else {
      await createShift.mutateAsync(data as ShiftCreate)
    }
    setCreateModalOpen(false)
  }

  const handleUpdate = async (data: ShiftCreate | ShiftUpdate | ShiftCreateMulti) => {
    if (!selectedShift) return
    await updateShift.mutateAsync({ id: selectedShift.id, data: data as ShiftUpdate })
    setEditModalOpen(false)
    setSelectedShift(null)
  }

  const handleDelete = async (shiftId: number) => {
    if (!confirm(t('shift.deleteConfirm'))) return
    await deleteShift.mutateAsync(shiftId)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">{t('schedule.title')}</h1>
        {isAdmin && (
          <button
            className="btn-primary"
            onClick={() => { setNewShiftDefaults({}); setCreateModalOpen(true) }}
          >
            {t('shift.newShift')}
          </button>
        )}
      </div>

      <div className="card flex-1 overflow-hidden p-0">
        <div className="p-4 h-full">
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            locale={itLocale}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            height="100%"
            events={events}
            editable={isAdmin}
            selectable={isAdmin}
            selectMirror
            dayMaxEvents
            weekends
            firstDay={1}
            slotMinTime={SLOT_MIN_TIME}
            slotMaxTime={SLOT_MAX_TIME}
            slotLabelContent={(arg) => {
              const h = arg.date.getHours()
              const m = String(arg.date.getMinutes()).padStart(2, '0')
              return `${h}.${m}`
            }}
            datesSet={handleDatesSet}
            select={handleDateSelect}
            eventClick={handleEventContextMenu}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventContent={(info) => (
              <div className="p-1 overflow-hidden text-xs">
                <div className="font-medium truncate">{info.event.title}</div>
                <div className="text-white/70">
                  {format(info.event.start!, 'HH:mm').replace(':', '.')} – {info.event.end ? format(info.event.end, 'HH:mm').replace(':', '.') : ''}
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {contextMenu && (
        <ShiftContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={() => openEditForShift(contextMenu.shiftId)}
          onDelete={() => handleDelete(contextMenu.shiftId)}
          onClose={() => setContextMenu(null)}
        />
      )}

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t('shift.createShift')}
      >
        <ShiftForm
          defaultValues={newShiftDefaults}
          onSubmit={handleCreate}
          onCancel={() => setCreateModalOpen(false)}
          loading={createShift.isPending}
          multiEmployee
        />
      </Modal>

      <Modal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedShift(null) }}
        title={t('shift.editShiftTitle')}
      >
        {selectedShift && (
          <ShiftForm
            defaultValues={{ ...selectedShift, notes: selectedShift.notes ?? undefined }}
            onSubmit={handleUpdate}
            onCancel={() => { setEditModalOpen(false); setSelectedShift(null) }}
            loading={updateShift.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
