import { CalendarDays, Flag, MapPin } from 'lucide-react'
import { date, dateLabel, utcTime, type Meeting } from './data'
import { Empty, Label, Loading, Select } from './UI'

export function Calendar({ year, seasons, meetings, loading, error, retry, setYear, openRace }: {
  year: number; seasons: number[]; meetings: Meeting[]; loading: boolean; error?: string; retry: () => void
  setYear: (year: number) => void; openRace: (event: Meeting) => void
}) {
  const events = [...meetings].sort((a, b) => date(a.date_start) - date(b.date_start))
  const upcoming = events.find(event => date(event.date_end || event.date_start) > Date.now())
  return <section className="shell interior">
    <div className="section-title"><div><Label>FORMULA 1 SCHEDULE</Label><h1>Race <em>calendar.</em></h1></div><Select title="Season" value={year} choices={seasons.map(year => ({ value: year, label: String(year) }))} onChange={setYear}/></div>
    {loading ? <Loading>Acquiring calendar</Loading> : error ? <Empty error action={<button className="button button-light" onClick={retry}>Retry</button>}>{error}</Empty> :
      events.length === 0 ? <Empty>No meetings are available for this year.</Empty> :
      <div className="calendar-list">{events.map((event, index) => <article key={event.meeting_key} className={event === upcoming ? 'is-next' : ''}>
        <span className="round-number">{String(index + 1).padStart(2, '0')}</span>
        <div><small><MapPin size={13}/>{event.country_name} · {event.location}</small><h2>{event.meeting_name}</h2></div>
        <div className="event-date"><small><CalendarDays size={13}/>{dateLabel(event.date_start)}</small><span>{utcTime(event.date_start).slice(0, 5)} UTC</span></div>
        {date(event.date_end) < Date.now() ? <button className="button button-outline" onClick={() => openRace(event)}><Flag size={15}/> Replay</button> : <span className="mode-chip"><i/>{event === upcoming ? 'Next meeting' : 'Scheduled'}</span>}
      </article>)}</div>}
  </section>
}
