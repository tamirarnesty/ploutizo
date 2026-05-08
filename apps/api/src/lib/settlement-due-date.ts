/**
 * Pure function: given an account's statementDueDay (1-31, nullable) and the current date,
 * compute the next upcoming due date and its status badge.
 *
 * Contract:
 *   - statementDueDay null → { dueDate: null, status: null }
 *   - statementDueDay 1-31 → next occurrence ON OR AFTER `today`. If today's day-of-month is
 *     <= statementDueDay (after clamping to days-in-current-month), use the current month.
 *     Otherwise use the next month. If the requested day exceeds the days-in-month for the
 *     chosen month, clamp to the last day of that month (e.g. day 31 in February).
 *   - status: 'due_soon' if dueDate is within 7 days of `today` (inclusive of today, inclusive of day 7);
 *     'on_track' if more than 7 days away.
 *   - Throws TypeError if statementDueDay is < 1 or > 31.
 *
 * @param statementDueDay - integer 1-31 or null
 * @param today - reference Date (UTC date is used for day-arithmetic)
 */
export function computeNextDueDate(
  statementDueDay: number | null,
  today: Date
): { dueDate: string | null; status: 'due_soon' | 'on_track' | null } {
  if (statementDueDay === null) return { dueDate: null, status: null }

  if (!Number.isInteger(statementDueDay) || statementDueDay < 1 || statementDueDay > 31) {
    throw new TypeError('statementDueDay must be 1-31 or null')
  }

  const todayYear = today.getUTCFullYear()
  const todayMonth = today.getUTCMonth() // 0-indexed
  const todayDay = today.getUTCDate()

  /**
   * Returns the number of days in a given UTC month.
   * Uses day-0 of the next month trick: new Date(Date.UTC(year, month+1, 0)).getUTCDate()
   */
  function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  }

  // Clamp the requested day to the number of days in the candidate month.
  // If the clamped day >= today's day, the due date is in the current month.
  // Otherwise advance to next month.
  const currentMonthDays = daysInMonth(todayYear, todayMonth)
  const clampedCurrentMonth = Math.min(statementDueDay, currentMonthDays)

  let dueYear: number
  let dueMonth: number
  let dueDay: number

  if (clampedCurrentMonth >= todayDay) {
    // Due date is in the current month
    dueYear = todayYear
    dueMonth = todayMonth
    dueDay = clampedCurrentMonth
  } else {
    // Due date has already passed this month; advance to next month
    const nextMonth = todayMonth + 1
    const nextYear = nextMonth > 11 ? todayYear + 1 : todayYear
    const normalizedMonth = nextMonth % 12
    const nextMonthDays = daysInMonth(nextYear, normalizedMonth)
    dueYear = nextYear
    dueMonth = normalizedMonth
    dueDay = Math.min(statementDueDay, nextMonthDays)
  }

  const dueDate = new Date(Date.UTC(dueYear, dueMonth, dueDay))
  const todayMidnight = new Date(Date.UTC(todayYear, todayMonth, todayDay))

  const diffDays = Math.floor((dueDate.getTime() - todayMidnight.getTime()) / 86_400_000)
  const status: 'due_soon' | 'on_track' = diffDays <= 7 ? 'due_soon' : 'on_track'

  const dueDateStr = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

  return { dueDate: dueDateStr, status }
}
