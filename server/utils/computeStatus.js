/**
 * Computes the dynamic status of an event based on the current date/time.
 *
 * @param {Object} event - Event document or plain object with eventDate, startTime, endTime
 * @returns {'ongoing'|'nearby'|'upcoming'|'previous'}
 */
export function computeStatus(event) {
  const now = new Date();

  // Normalise to date-only strings for day comparison (UTC)
  const todayStr = toDateStr(now);
  const eventDayStr = toDateStr(new Date(event.eventDate));

  if (eventDayStr < todayStr) {
    return 'previous';
  }

  if (eventDayStr === todayStr) {
    const { startTime, endTime } = event;

    // No time range → treat as ongoing all day
    if (!startTime || !endTime) {
      return 'ongoing';
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return 'ongoing';
    }

    // After the event ended on the same day
    if (currentMinutes > endMinutes) {
      return 'previous';
    }

    // Before the event starts on the same day
    return 'upcoming';
  }

  // Future days
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysStr = toDateStr(sevenDaysFromNow);

  if (eventDayStr <= sevenDaysStr) {
    return 'nearby';
  }

  return 'upcoming';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" in local time */
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Converts "HH:MM" string to total minutes since midnight */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}
