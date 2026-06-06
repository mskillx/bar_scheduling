import { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, format, parseISO
} from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useShifts } from '@/hooks/useShifts'
import StatsCard from '@/components/dashboard/StatsCard'
import { shiftDurationHours, formatDateTime } from '@/utils/helpers'

export default function EmployeeDashboard() {
  const { user } = useAuthStore()
  const now = new Date()

  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const threeMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 3, 1)

  const { data: allShifts = [] } = useShifts({
    start: threeMonthsAgo.toISOString(),
    end: threeMonthsAhead.toISOString(),
  })

  const stats = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const weekShifts = allShifts.filter((s) => {
      const start = parseISO(s.start_datetime)
      return start >= weekStart && start <= weekEnd && s.status !== 'cancelled'
    })
    const monthShifts = allShifts.filter((s) => {
      const start = parseISO(s.start_datetime)
      return start >= monthStart && start <= monthEnd && s.status !== 'cancelled'
    })
    const upcoming = allShifts
      .filter((s) => isAfter(parseISO(s.start_datetime), now) && s.status === 'scheduled')
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
      .slice(0, 5)

    const weekHours = weekShifts.reduce(
      (sum, s) => sum + shiftDurationHours(s.start_datetime, s.end_datetime),
      0
    )
    const monthHours = monthShifts.reduce(
      (sum, s) => sum + shiftDurationHours(s.start_datetime, s.end_datetime),
      0
    )

    const scheduledTotal = allShifts
      .filter((s) => isAfter(parseISO(s.start_datetime), now) && s.status === 'scheduled')
      .reduce((sum, s) => sum + shiftDurationHours(s.start_datetime, s.end_datetime), 0)

    return { weekHours, monthHours, upcoming, scheduledTotal }
  }, [allShifts, now])

  const calEvents = allShifts.map((s) => ({
    id: String(s.id),
    title: 'My Shift',
    start: s.start_datetime,
    end: s.end_datetime,
    backgroundColor: s.status === 'cancelled' ? '#6b7280' : '#8e1db5',
    borderColor: s.status === 'cancelled' ? '#6b7280' : '#761b93',
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">
        My Dashboard — {user?.first_name} {user?.last_name}
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="This week"
          value={`${stats.weekHours.toFixed(1)}h`}
          icon="📅"
          color="purple"
        />
        <StatsCard
          label="This month"
          value={`${stats.monthHours.toFixed(1)}h`}
          icon="📆"
          color="blue"
        />
        <StatsCard
          label="Upcoming shifts"
          value={stats.upcoming.length}
          icon="🔜"
          color="green"
        />
        <StatsCard
          label="Scheduled hours"
          value={`${stats.scheduledTotal.toFixed(1)}h`}
          sub="upcoming"
          icon="⏱️"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="font-medium text-white mb-4">Upcoming Shifts</h2>
          {stats.upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming shifts</p>
          ) : (
            <div className="space-y-3">
              {stats.upcoming.map((s) => {
                const hours = shiftDurationHours(s.start_datetime, s.end_datetime)
                return (
                  <div key={s.id} className="border-l-2 border-brand-600 pl-3">
                    <div className="text-sm font-medium text-white">
                      {format(parseISO(s.start_datetime), 'EEE dd MMM')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(parseISO(s.start_datetime), 'HH:mm')} –{' '}
                      {format(parseISO(s.end_datetime), 'HH:mm')} ({hours.toFixed(1)}h)
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card col-span-2">
          <h2 className="font-medium text-white mb-4">My Schedule</h2>
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,dayGridMonth',
            }}
            height={380}
            events={calEvents}
            editable={false}
            selectable={false}
            firstDay={1}
            slotMinTime="06:00:00"
            slotMaxTime="28:00:00"
            eventContent={(info) => (
              <div className="p-1 text-xs overflow-hidden">
                <div className="font-medium">
                  {format(info.event.start!, 'HH:mm')}
                  {info.event.end ? ` – ${format(info.event.end, 'HH:mm')}` : ''}
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  )
}
