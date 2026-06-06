import { useState, useCallback, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from '@/hooks/useShifts'
import Modal from '@/components/common/Modal'
import ShiftForm from '@/components/shifts/ShiftForm'
import ShiftContextMenu from '@/components/shifts/ShiftContextMenu'
import type { ShiftCreate, ShiftCreateMulti, ShiftUpdate, Shift } from '@/types/shift'

const statusColors: Record<string, string> = {
  scheduled: '#8e1db5',
  completed: '#16a34a',
  cancelled: '#6b7280',
}

export default function Schedule() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [dateRange, setDateRange] = useState({
    start: format(new Date(), "yyyy-MM-dd'T'00:00:00'Z'"),
    end: format(new Date(), "yyyy-MM-dd'T'23:59:59'Z'"),
  })

  const { data: shifts = [], isLoading } = useShifts({ start: dateRange.start, end: dateRange.end })
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
    backgroundColor: statusColors[s.status] || statusColors.scheduled,
    borderColor: statusColors[s.status] || statusColors.scheduled,
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

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      if (!isAdmin) return
      const shift: Shift = info.event.extendedProps.shift
      info.jsEvent.preventDefault()
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
    if (!confirm('Delete this shift?')) return
    await deleteShift.mutateAsync(shiftId)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Schedule</h1>
        {isAdmin && (
          <button
            className="btn-primary"
            onClick={() => { setNewShiftDefaults({}); setCreateModalOpen(true) }}
          >
            + New Shift
          </button>
        )}
      </div>

      <div className="card flex-1 overflow-hidden p-0">
        <div className="p-4 h-full">
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
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
            slotMinTime="06:00:00"
            slotMaxTime="30:00:00"
            datesSet={handleDatesSet}
            select={handleDateSelect}
            eventClick={handleEventContextMenu}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventContent={(info) => (
              <div className="p-1 overflow-hidden text-xs">
                <div className="font-medium truncate">{info.event.title}</div>
                <div className="text-white/70">
                  {format(info.event.start!, 'HH:mm')} – {info.event.end ? format(info.event.end, 'HH:mm') : ''}
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
        title="Create Shift"
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
        title="Edit Shift"
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
