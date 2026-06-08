import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { format, addDays, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/users";
import { shiftsApi } from "@/api/shifts";
import { DEFAULT_SHIFT_START, DEFAULT_SHIFT_END } from "@/constants/schedule";
import type { ShiftCreate, ShiftCreateMulti, ShiftUpdate } from "@/types/shift";

interface ShiftFormProps {
  defaultValues?: Partial<ShiftCreate & { id?: number }>;
  onSubmit: (data: ShiftCreate | ShiftUpdate | ShiftCreateMulti) => void;
  onCancel: () => void;
  loading?: boolean;
  multiEmployee?: boolean;
}

function toLocalDatetimeValue(isoString?: string): string {
  if (!isoString) return "";
  return format(new Date(isoString), "yyyy-MM-dd'T'HH:mm");
}

function extractDate(datetimeLocal: string | undefined): string {
  if (datetimeLocal) return datetimeLocal.split("T")[0];
  return format(new Date(), "yyyy-MM-dd");
}

function getDefaultStart(dt?: string): string {
  if (dt) return toLocalDatetimeValue(dt);
  return `${format(new Date(), "yyyy-MM-dd")}T${DEFAULT_SHIFT_START}`;
}

function getDefaultEnd(dt?: string): string {
  if (dt) return toLocalDatetimeValue(dt);
  return `${format(new Date(), "yyyy-MM-dd")}T${DEFAULT_SHIFT_END}`;
}

export default function ShiftForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading,
  multiEmployee,
}: ShiftFormProps) {
  const { t } = useTranslation();
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: shiftsApi.listTemplates,
  });

  const activeEmployees = users.filter((u) => u.active && u.employee_id);

  const initialStart = getDefaultStart(defaultValues?.start_datetime);

  const [shiftDate, setShiftDate] = useState<string>(extractDate(initialStart));

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>(
    defaultValues?.employee_id ? [defaultValues.employee_id] : [],
  );
  const [employeeError, setEmployeeError] = useState(false);

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
      end_datetime: getDefaultEnd(defaultValues?.end_datetime),
      notes: defaultValues?.notes || "",
      status: defaultValues?.status || "scheduled",
    },
  });

  const watchedStart = watch("start_datetime");
  const watchedEnd = watch("end_datetime");

  useEffect(() => {
    const startVal = getDefaultStart(defaultValues?.start_datetime);
    const endVal = getDefaultEnd(defaultValues?.end_datetime);
    reset({
      employee_id: defaultValues?.employee_id,
      start_datetime: startVal,
      end_datetime: endVal,
      notes: defaultValues?.notes || "",
      status: defaultValues?.status || "scheduled",
    });
    setShiftDate(extractDate(startVal));
    if (defaultValues?.employee_id) {
      setSelectedEmployeeIds([defaultValues.employee_id]);
    } else if (multiEmployee) {
      setSelectedEmployeeIds([]);
    }
  }, [defaultValues, reset, multiEmployee]);

  useEffect(() => {
    if (watchedStart) {
      const d = watchedStart.split("T")[0];
      setShiftDate((prev) => (prev !== d ? d : prev));
    }
  }, [watchedStart]);

  const handleDateChange = (newDate: string) => {
    setShiftDate(newDate);
    const startTime = watchedStart?.split("T")[1];
    const endTime = watchedEnd?.split("T")[1];
    if (startTime) setValue("start_datetime", `${newDate}T${startTime}`);
    if (endTime) setValue("end_datetime", `${newDate}T${endTime}`);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === Number(templateId));
    if (!tpl) return;
    const startTime = tpl.start_time.slice(0, 5);
    const endTime = tpl.end_time.slice(0, 5);
    const startHour = parseInt(tpl.start_time.split(":")[0]);
    const endHour = parseInt(tpl.end_time.split(":")[0]);
    const endDateStr =
      endHour < startHour ? format(addDays(parseISO(shiftDate), 1), "yyyy-MM-dd") : shiftDate;
    setValue("start_datetime", `${shiftDate}T${startTime}`);
    setValue("end_datetime", `${endDateStr}T${endTime}`);
  };

  const toggleEmployee = (empId: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    );
    setEmployeeError(false);
  };

  const submit = (data: ShiftCreate) => {
    if (multiEmployee) {
      if (selectedEmployeeIds.length === 0) {
        setEmployeeError(true);
        return;
      }
      onSubmit({
        employee_ids: selectedEmployeeIds,
        start_datetime: new Date(data.start_datetime).toISOString(),
        end_datetime: new Date(data.end_datetime).toISOString(),
        notes: data.notes,
        status: data.status,
      } as ShiftCreateMulti);
    } else {
      onSubmit({
        ...data,
        start_datetime: new Date(data.start_datetime).toISOString(),
        end_datetime: new Date(data.end_datetime).toISOString(),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <label className="label">{t("shift.date")}</label>
        <input
          type="date"
          className="input"
          value={shiftDate}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      </div>

      {templates.length > 0 && (
        <div>
          <label className="label">{t("shift.applyTemplate")}</label>
          <select className="input" onChange={(e) => applyTemplate(e.target.value)} defaultValue="">
            <option value="">{t("shift.chooseTemplate")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} ({tpl.start_time.slice(0, 5)} – {tpl.end_time.slice(0, 5)})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">{t("shift.start")}</label>
        <input
          type="datetime-local"
          className="input"
          {...register("start_datetime", {
            required: t("shift.startRequired"),
          })}
        />
        {errors.start_datetime && (
          <p className="text-xs text-red-400 mt-1">{errors.start_datetime.message}</p>
        )}
      </div>

      <div>
        <label className="label">{t("shift.end")}</label>
        <input
          type="datetime-local"
          className="input"
          {...register("end_datetime", { required: t("shift.endRequired") })}
        />
        {errors.end_datetime && (
          <p className="text-xs text-red-400 mt-1">{errors.end_datetime.message}</p>
        )}
      </div>

      {multiEmployee ? (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">{t("shift.employees")}</label>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                onClick={() => {
                  setSelectedEmployeeIds(activeEmployees.map((u) => u.employee_id!));
                  setEmployeeError(false);
                }}
              >
                {t("shift.selectAll")}
              </button>
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                onClick={() => setSelectedEmployeeIds([])}
              >
                {t("shift.clear")}
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
            <p className="text-xs text-red-400 mt-1">{t("shift.selectAtLeastOne")}</p>
          )}
        </div>
      ) : (
        <div>
          <label className="label">{t("shift.employee")}</label>
          <select
            className="input"
            {...register("employee_id", {
              required: t("shift.employeeRequired"),
              valueAsNumber: true,
            })}
          >
            <option value="">{t("shift.selectEmployee")}</option>
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
        <label className="label">{t("shift.status")}</label>
        <select className="input" {...register("status")}>
          <option value="scheduled">{t("shift.scheduled")}</option>
          <option value="completed">{t("shift.completed")}</option>
          <option value="cancelled">{t("shift.cancelled")}</option>
        </select>
      </div>

      <div>
        <label className="label">{t("shift.notes")}</label>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder={t("shift.notesPlaceholder")}
          {...register("notes")}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading
            ? t("shift.saving")
            : multiEmployee && selectedEmployeeIds.length > 1
              ? t("shift.createShifts", { count: selectedEmployeeIds.length })
              : t("shift.saveShift")}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          {t("shift.cancel")}
        </button>
      </div>
    </form>
  );
}
