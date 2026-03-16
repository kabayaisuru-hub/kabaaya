export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'Poya' | 'Public' | 'Festival';
}

export const sriLankanHolidays2026: Holiday[] = [
  { date: '2026-01-01', name: 'New Year\'s Day', type: 'Public' },
  { date: '2026-01-03', name: 'Duruthu Full Moon Poya', type: 'Poya' },
  { date: '2026-01-15', name: 'Tamil Thai Pongal Day', type: 'Public' },
  { date: '2026-02-02', name: 'Navam Full Moon Poya', type: 'Poya' },
  { date: '2026-02-04', name: 'Independence Day', type: 'Public' },
  { date: '2026-02-16', name: 'Mahasivarathri Day', type: 'Festival' },
  { date: '2026-03-03', name: 'Medin Full Moon Poya', type: 'Poya' },
  { date: '2026-03-20', name: 'Eid-al-Fitr', type: 'Festival' },
  { date: '2026-04-01', name: 'Bak Full Moon Poya', type: 'Poya' },
  { date: '2026-04-13', name: 'Sinhala & Tamil New Year Eve', type: 'Public' },
  { date: '2026-04-14', name: 'Sinhala & Tamil New Year Day', type: 'Public' },
  { date: '2026-05-01', name: 'May Day', type: 'Public' },
  { date: '2026-05-01', name: 'Adhi Vesak Full Moon Poya', type: 'Poya' },
  { date: '2026-05-27', name: 'Eid-al-Adha', type: 'Festival' },
  { date: '2026-05-30', name: 'Vesak Full Moon Poya', type: 'Poya' },
  { date: '2026-05-31', name: 'Day after Vesak Poya', type: 'Poya' },
  { date: '2026-06-29', name: 'Poson Full Moon Poya', type: 'Poya' },
  { date: '2026-07-28', name: 'Esala Full Moon Poya', type: 'Poya' },
  { date: '2026-08-27', name: 'Nikini Full Moon Poya', type: 'Poya' },
  { date: '2026-09-26', name: 'Binara Full Moon Poya', type: 'Poya' },
  { date: '2026-09-26', name: 'Milad-un-Nabi', type: 'Festival' },
  { date: '2026-10-21', name: 'Deepavali Festival', type: 'Festival' },
  { date: '2026-10-25', name: 'Vap Full Moon Poya', type: 'Poya' },
  { date: '2026-11-24', name: 'Ill Full Moon Poya', type: 'Poya' },
  { date: '2026-12-24', name: 'Unduvap Full Moon Poya', type: 'Poya' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'Public' },
];

export const getHolidayForDate = (date: Date): Holiday | undefined => {
  const dateString = date.toISOString().split('T')[0];
  return sriLankanHolidays2026.find(h => h.date === dateString);
};

export const getUpcomingHoliday = (date: Date, daysAhead: number = 7): Holiday | undefined => {
  const dates = Array.from({ length: daysAhead }, (_, i) => {
    const d = new Date(date);
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split('T')[0];
  });
  
  return sriLankanHolidays2026.find(h => dates.includes(h.date));
};
