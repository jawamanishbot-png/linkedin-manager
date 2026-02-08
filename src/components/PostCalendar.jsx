import { useState } from 'react'
import { getDaysInMonth, getMonthYear, getPreviousMonth, getNextMonth, isSameDay } from '../utils/dateUtils'
import './PostCalendar.css'

export default function PostCalendar({ posts, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const days = getDaysInMonth(currentMonth)
  const monthYear = getMonthYear(currentMonth)

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  // Create array with empty slots for days before month starts
  const calendarDays = [...Array(firstDayOfWeek), null, ...days]

  // Count posts for each day
  const getPostCountForDay = (date) => {
    if (!date) return 0
    return posts.filter(
      (post) => post.scheduledTime && isSameDay(new Date(post.scheduledTime), date)
    ).length
  }

  const handlePrevMonth = () => {
    setCurrentMonth(getPreviousMonth(currentMonth))
  }

  const handleNextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth))
  }

  const handleSelectDay = (date) => {
    if (date) {
      onSelectDate(date)
    }
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="post-calendar">
      <div className="calendar-header">
        <button className="nav-button" onClick={handlePrevMonth}>
          ←
        </button>
        <h3>{monthYear}</h3>
        <button className="nav-button" onClick={handleNextMonth}>
          →
        </button>
      </div>

      <div className="calendar-weekdays">
        {dayLabels.map((label) => (
          <div key={label} className="weekday">
            {label}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarDays.map((date, index) => {
          const postCount = getPostCountForDay(date)
          const isToday = date && isSameDay(date, new Date())

          return (
            <button
              key={index}
              className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''} ${
                postCount > 0 ? 'has-posts' : ''
              }`}
              onClick={() => handleSelectDay(date)}
              disabled={!date}
            >
              {date && (
                <>
                  <span className="day-number">{date.getDate()}</span>
                  {postCount > 0 && <span className="post-indicator">●</span>}
                </>
              )}
            </button>
          )
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot today-dot"></span>
          <span>Today</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot has-posts-dot"></span>
          <span>Has posts</span>
        </div>
      </div>
    </div>
  )
}
