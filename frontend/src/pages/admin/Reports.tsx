import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, startOfWeek, addDays } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { reportsApi } from '@/api/reports'
import StatsCard from '@/components/dashboard/StatsCard'
import LoadingSkeleton from '@/components/common/LoadingSkeleton'

const CHART_COLORS = ['#8e1db5', '#3b82f6', '#16a34a', '#f97316', '#ec4899', '#14b8a6']

export default function ReportsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(new Date(year, month - 1))

  const weeklyQ = useQuery({
    queryKey: ['reports', 'weekly', weekStart.toISOString()],
    queryFn: () => reportsApi.weekly(weekStart.toISOString()),
  })

  const monthlyQ = useQuery({
    queryKey: ['reports', 'monthly', year, month],
    queryFn: () => reportsApi.monthly(year, month),
  })

  const hoursQ = useQuery({
    queryKey: ['reports', 'hours', monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: () => reportsApi.hours(monthStart.toISOString(), monthEnd.toISOString()),
  })

  const barData = (monthlyQ.data?.employees || []).map((e) => ({
    name: `${e.first_name} ${e.last_name}`.split(' ')[0],
    hours: e.total_hours,
  }))

  const isLoading = weeklyQ.isLoading || monthlyQ.isLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-white">Reports</h1>
        <div className="flex items-center gap-2">
          <select
            className="input py-1.5 text-sm w-28"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {format(new Date(year, i), 'MMMM')}
              </option>
            ))}
          </select>
          <select
            className="input py-1.5 text-sm w-24"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            label="This week"
            value={`${weeklyQ.data?.total_hours.toFixed(1) || 0}h`}
            icon="📅"
            color="purple"
          />
          <StatsCard
            label={format(new Date(year, month - 1), 'MMMM')}
            value={`${monthlyQ.data?.total_hours.toFixed(1) || 0}h`}
            icon="📆"
            color="blue"
          />
          <StatsCard
            label="Employees this month"
            value={monthlyQ.data?.employees.length || 0}
            icon="👥"
            color="green"
          />
          <StatsCard
            label="Avg hours/employee"
            value={
              monthlyQ.data?.employees.length
                ? ((monthlyQ.data.total_hours / monthlyQ.data.employees.length)).toFixed(1) + 'h'
                : '0h'
            }
            icon="⏱️"
            color="orange"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-medium text-white mb-4">
            Hours by Employee — {format(new Date(year, month - 1), 'MMMM yyyy')}
          </h2>
          {monthlyQ.isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e35" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} unit="h" />
                <Tooltip
                  contentStyle={{ background: '#1a1a1f', border: '1px solid #2e2e35', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(v: number) => [`${v}h`, 'Hours']}
                />
                <Bar dataKey="hours" fill="#8e1db5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="font-medium text-white mb-4">Employee Hours Table</h2>
          {monthlyQ.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : (
            <div className="space-y-2">
              {(monthlyQ.data?.employees || []).map((e, i) => (
                <div key={e.employee_id} className="flex items-center justify-between py-2 border-b border-dark-600 last:border-0">
                  <span className="text-sm text-gray-200">
                    {e.first_name} {e.last_name}
                  </span>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(120, (e.total_hours / (monthlyQ.data?.total_hours || 1)) * 120)}px`,
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-sm font-medium text-white w-14 text-right">
                      {e.total_hours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              ))}
              {!monthlyQ.data?.employees.length && (
                <p className="text-sm text-gray-500 text-center py-4">No data for this period</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
