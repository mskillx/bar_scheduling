import { format, parseISO, differenceInMinutes } from "date-fns";

export function formatTime(dt: string): string {
  return format(parseISO(dt), "HH:mm");
}

export function formatDate(dt: string): string {
  return format(parseISO(dt), "dd MMM yyyy");
}

export function formatDateTime(dt: string): string {
  return format(parseISO(dt), "dd MMM yyyy HH:mm");
}

export function shiftDurationHours(start: string, end: string): number {
  return differenceInMinutes(parseISO(end), parseISO(start)) / 60;
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
