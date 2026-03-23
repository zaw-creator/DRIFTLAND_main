export function computeStatus(event) {
  if (event.status === 'ended' || event.status === 'archived') {
    return event.status;
  }

  const now         = new Date();
  const todayStr    = toDateStr(now);
  const eventDayStr = toDateStr(new Date(event.eventDate));

  // Use eventEndDate if set, otherwise fall back to eventDate
  const endDayStr = event.eventEndDate
    ? toDateStr(new Date(event.eventEndDate))
    : eventDayStr;

  // ── Entirely in the past ──────────────────────────────────────────────────
  if (endDayStr < todayStr) {
    return 'ended';
  }

  // ── Multi-day event: started but not yet ended ────────────────────────────
  if (eventDayStr < todayStr && endDayStr >= todayStr) {
    return 'active';
  }

  // ── Event start day ───────────────────────────────────────────────────────
  if (eventDayStr === todayStr) {
    const { startTime, endTime } = event;

    if (!startTime || !endTime) {
      return 'active';
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes   = parseTime(startTime);
    const endMinutes     = parseTime(endTime);

    if (currentMinutes < startMinutes)  return 'upcoming';
    if (currentMinutes <= endMinutes)   return 'active';

    // Past end time on start day — check if multi-day
    if (endDayStr > todayStr) return 'active';

    return 'ended';
  }

  // ── Future days ───────────────────────────────────────────────────────────
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysStr = toDateStr(sevenDaysFromNow);

  if (eventDayStr <= sevenDaysStr) return 'nearby';

  return 'upcoming';
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}