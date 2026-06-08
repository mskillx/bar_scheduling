import { format, parseISO, differenceInMinutes } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  useAttendanceToday,
  useAttendanceStats,
  useCheckIn,
  useCheckOut,
} from "@/hooks/useAttendance";
import { useAuthStore } from "@/stores/authStore";
import StatsCard from "@/components/dashboard/StatsCard";
import type { AttendanceStatus } from "@/types/attendance";

function shiftDurationLabel(start: string, end: string): string {
  const mins = differenceInMinutes(parseISO(end), parseISO(start));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function effectiveDurationLabel(checkIn: string, checkOut: string | null): string {
  if (!checkOut) {
    const mins = differenceInMinutes(new Date(), parseISO(checkIn));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return shiftDurationLabel(checkIn, checkOut);
}

function ShiftAttendanceCard({ entry }: { entry: AttendanceStatus }) {
  const { t } = useTranslation();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const isCheckedIn = !!entry.check_in_at && !entry.check_out_at;
  const isCheckedOut = !!entry.check_in_at && !!entry.check_out_at;
  const isPending = !entry.check_in_at;

  return (
    <div className="card border border-dark-600">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-base">
            {format(parseISO(entry.shift_start), "HH:mm")} –{" "}
            {format(parseISO(entry.shift_end), "HH:mm")}
          </div>
          <div className="text-gray-400 text-sm mt-0.5">
            {t("attendance.scheduled")}: {shiftDurationLabel(entry.shift_start, entry.shift_end)}
          </div>

          {entry.check_in_at && (
            <div className="mt-2 space-y-0.5 text-sm">
              <div className="text-green-400">
                {t("attendance.checkedInAt")} {format(parseISO(entry.check_in_at), "HH:mm")}
              </div>
              {entry.check_out_at && (
                <div className="text-blue-400">
                  {t("attendance.checkedOutAt")} {format(parseISO(entry.check_out_at), "HH:mm")}
                  {" · "}
                  <span className="text-gray-300">
                    {effectiveDurationLabel(entry.check_in_at, entry.check_out_at)}
                  </span>
                </div>
              )}
              {!entry.check_out_at && (
                <div className="text-yellow-400 text-xs animate-pulse">
                  {t("attendance.shiftActive")} · {effectiveDurationLabel(entry.check_in_at, null)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {isPending && (
            <button
              className="btn-primary text-sm px-4 py-2"
              disabled={checkIn.isPending}
              onClick={() => checkIn.mutate(entry.shift_id)}
            >
              {checkIn.isPending ? t("attendance.checkingIn") : t("attendance.checkIn")}
            </button>
          )}
          {isCheckedIn && (
            <button
              className="btn-danger text-sm px-4 py-2"
              disabled={checkOut.isPending}
              onClick={() => checkOut.mutate(entry.shift_id)}
            >
              {checkOut.isPending ? t("attendance.checkingOut") : t("attendance.checkOut")}
            </button>
          )}
          {isCheckedOut && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-green-400">
              ✓ {t("attendance.completed")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: todayShifts = [], isLoading } = useAttendanceToday();
  const { data: stats = [] } = useAttendanceStats();

  const weekStats = stats.find((s) => s.period_label === "week");
  const monthStats = stats.find((s) => s.period_label === "month");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-white">{t("attendance.title")}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {weekStats && (
          <>
            <StatsCard
              label={t("attendance.expectedWeek")}
              value={`${weekStats.expected_hours.toFixed(1)}h`}
              icon="📅"
              color="blue"
            />
            <StatsCard
              label={t("attendance.effectiveWeek")}
              value={`${weekStats.effective_hours.toFixed(1)}h`}
              sub={
                weekStats.expected_hours > 0
                  ? `${Math.round((weekStats.effective_hours / weekStats.expected_hours) * 100)}%`
                  : undefined
              }
              icon="✅"
              color="green"
            />
          </>
        )}
        {monthStats && (
          <>
            <StatsCard
              label={t("attendance.expectedMonth")}
              value={`${monthStats.expected_hours.toFixed(1)}h`}
              icon="📆"
              color="purple"
            />
            <StatsCard
              label={t("attendance.effectiveMonth")}
              value={`${monthStats.effective_hours.toFixed(1)}h`}
              sub={
                monthStats.expected_hours > 0
                  ? `${Math.round((monthStats.effective_hours / monthStats.expected_hours) * 100)}%`
                  : undefined
              }
              icon="⏱️"
              color="orange"
            />
          </>
        )}
      </div>

      {/* Today's shifts */}
      <div>
        <h2 className="text-base font-medium text-gray-300 mb-3">
          {t("attendance.todayShifts")} — {format(new Date(), "EEEE dd MMMM")}
        </h2>

        {isLoading ? (
          <div className="card text-gray-500 text-sm">{t("attendance.loading")}</div>
        ) : todayShifts.length === 0 ? (
          <div className="card text-gray-500 text-sm text-center py-8">
            {t("attendance.noShiftsToday")}
          </div>
        ) : (
          <div className="space-y-3">
            {todayShifts.map((entry) => (
              <ShiftAttendanceCard key={entry.shift_id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
