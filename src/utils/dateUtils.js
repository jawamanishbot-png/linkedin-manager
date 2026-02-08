import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'

// Format date for display (e.g., "Feb 15, 2:30 PM")
export function formatDateDisplay(dateString) {
  try {
    const date = new Date(dateString)
    return format(date, 'MMM dd, h:mm a')
  } catch (error) {
    return 'Invalid date'
  }
}

// Format date for input (e.g., "2026-02-15")
export function formatDateInput(dateString) {
  try {
    const date = new Date(dateString)
    return format(date, 'yyyy-MM-dd')
  } catch (error) {
    return ''
  }
}

// Format time for input (e.g., "14:30")
export function formatTimeInput(dateString) {
  try {
    const date = new Date(dateString)
    return format(date, 'HH:mm')
  } catch (error) {
    return ''
  }
}

// Parse date and time inputs into ISO string
export function parseDateTime(dateStr, timeStr) {
  try {
    if (!dateStr || !timeStr) return null
    const dateTimeStr = `${dateStr}T${timeStr}:00`
    const date = new Date(dateTimeStr)
    return date.toISOString()
  } catch (error) {
    console.error('Error parsing date/time:', error)
    return null
  }
}

// Get all days in a month (for calendar)
export function getDaysInMonth(date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return eachDayOfInterval({ start, end })
}

// Get month/year display (e.g., "February 2026")
export function getMonthYear(date) {
  return format(date, 'MMMM yyyy')
}

// Get previous month
export function getPreviousMonth(date) {
  return subMonths(date, 1)
}

// Get next month
export function getNextMonth(date) {
  return addMonths(date, 1)
}

// Check if date is today
export function isToday(date) {
  return isSameDay(date, new Date())
}

// Check if date is in the past
export function isPastDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  return date < now
}

// Check if date is today
export function isDateToday(dateString) {
  return isSameDay(new Date(dateString), new Date())
}

// Get week number
export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

// Get day name (e.g., "Monday")
export function getDayName(date) {
  return format(date, 'EEEE')
}

// Get short day name (e.g., "Mon")
export function getShortDayName(date) {
  return format(date, 'EEE')
}

// Check if two dates are the same day
export function isSameDateDay(date1, date2) {
  return isSameDay(new Date(date1), new Date(date2))
}

// Get relative time (e.g., "in 2 days", "3 hours ago")
export function getRelativeTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date - now
  const diffMins = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  if (diffMins < 0) {
    const absMins = Math.abs(diffMins)
    const absDays = Math.abs(diffDays)
    if (absMins < 60) return `${absMins}m ago`
    if (absDays < 1) return `${Math.abs(diffHours)}h ago`
    return `${absDays}d ago`
  }

  if (diffMins < 60) return `in ${diffMins}m`
  if (diffHours < 24) return `in ${diffHours}h`
  return `in ${diffDays}d`
}

// Format for schedule display (e.g., "Tomorrow at 2:30 PM")
export function formatScheduleDisplay(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (isSameDay(date, now)) {
    return `Today at ${format(date, 'h:mm a')}`
  } else if (isSameDay(date, tomorrow)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`
  }

  return formatDateDisplay(dateString)
}

// Get timezone offset (useful for future backend integration)
export function getTimezoneOffset() {
  return new Date().getTimezoneOffset()
}
