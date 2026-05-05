import React, { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO,
  startOfDay,
  eachHourOfInterval,
  addHours,
  startOfYear,
  endOfYear,
  eachMonthOfInterval
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  Search as SearchIcon,
  Bell,
  Settings,
  MoreVertical,
  Filter,
  CheckCircle2,
  CalendarDays,
  LayoutGrid,
  X,
  PlusCircle,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const HOLIDAYS_2026 = [
  { id: 'h1', date: '2026-01-01', title: 'New Year Day', type: 'Holiday' },
  { id: 'h2', date: '2026-02-15', title: 'Mahashivratri', type: 'Holiday' },
  { id: 'h3', date: '2026-03-03', title: 'Dhulivandan (Holi)', type: 'Holiday' },
  { id: 'h4', date: '2026-03-19', title: 'Gudi Padwa', type: 'Holiday' },
  { id: 'h5', date: '2026-03-21', title: 'Ramjaan Id', type: 'Holiday' },
  { id: 'h6', date: '2026-04-03', title: 'Good Friday', type: 'Holiday' },
  { id: 'h7', date: '2026-04-14', title: 'Ambedkar Jayanti', type: 'Holiday' },
  { id: 'h8', date: '2026-05-01', title: 'Maharashtra Day', type: 'Holiday' },
  { id: 'h9', date: '2026-08-28', title: 'Rakshabandhan', type: 'Holiday' },
  { id: 'h10', date: '2026-09-14', title: 'Ganesh Chaturthi', type: 'Holiday' },
  { id: 'h11', date: '2026-09-18', title: 'Gauri Poojan', type: 'Holiday' },
  { id: 'h12', date: '2026-09-25', title: 'Anant Chaturdashi', type: 'Holiday' },
  { id: 'h13', date: '2026-10-02', title: 'Mahatma Gandhi Jayanti', type: 'Holiday' },
  { id: 'h14', date: '2026-10-20', title: 'Vijaya Dashmi (Dasara)', type: 'Holiday' },
  { id: 'h15', date: '2026-11-09', title: 'Diwali Vacation Start', type: 'Holiday' },
  { id: 'h16', date: '2026-12-25', title: 'Christmas', type: 'Holiday' },
];

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [view, setView] = useState('Month'); // 'Day', 'Week', 'Month', 'Year'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Personal & Public Events State
  const [personalEvents, setPersonalEvents] = useState([]);
  const [publicEvents, setPublicEvents] = useState([]);
  const [assignmentDeadlines, setAssignmentDeadlines] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    startDate: format(new Date(), 'yyyy-MM-dd'), 
    endDate: format(new Date(), 'yyyy-MM-dd'), 
    startTime: '10:00', 
    endTime: '11:00', 
    type: 'Personal', 
    targetAudience: 'both',
    reminder: 'none' // 'none', '1h', '2h', '4h', '1d'
  });

  const { profile, user } = useAuth();
  const role = profile?.role?.toLowerCase();
  const isAdmin = role === 'admin';

  const isDayInEvent = (day, event) => {
    const startStr = event.startDate || event.date || event.event_date;
    const endStr = event.endDate || event.date || event.event_date;
    
    if (!startStr || !endStr) return false;

    const start = startOfDay(parseISO(startStr));
    const end = startOfDay(parseISO(endStr));
    const current = startOfDay(day);
    return current >= start && current <= end;
  };

  useEffect(() => {
    fetchPublicEvents();
    if (profile?.id) {
      fetchPersonalEvents();
      if (role === 'student') {
        fetchAssignmentDeadlines();
      }
      if (role === 'faculty' || role === 'hod' || role === 'instructor') {
        fetchMeetings();
      }
    }
  }, [profile?.id, role]);

  const fetchPersonalEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_events')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      if (data) {
        setPersonalEvents(data.map(e => ({
          id: e.id,
          title: e.title,
          startDate: e.start_date,
          endDate: e.end_date,
          startTime: e.start_time,
          endTime: e.end_time,
          reminder: e.reminder,
          type: 'Personal'
        })));
      }
    } catch (err) {
      console.error('Error fetching personal events:', err);
    }
  };

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*');
      
      if (error) throw error;
      if (data) {
        setMeetings(data.map(m => ({
          id: `meet-${m.id}`,
          title: `Meeting: ${m.agenda}`,
          startDate: m.date,
          endDate: m.date,
          startTime: m.start_time,
          endTime: m.end_time,
          type: 'Meeting',
          location: m.location
        })));
      }
    } catch (err) {
      console.error('Error fetching meetings for calendar:', err);
    }
  };

  const fetchAssignmentDeadlines = async () => {
    try {
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('allocation_id');
      
      const allocIds = enrollments?.map(e => e.allocation_id) || [];
      if (allocIds.length === 0) return;

      const { data: assignments } = await supabase
        .from('course_materials')
        .select('*, allocation:subject_allocations(subject:subjects(name,code))')
        .in('allocation_id', allocIds)
        .eq('type', 'Assignment');

      if (assignments) {
        setAssignmentDeadlines(assignments.map(a => ({
          id: `asgn-${a.id}`,
          title: `Assignment: ${a.title}`,
          startDate: a.deadline,
          endDate: a.deadline,
          type: 'Deadline',
          subject: a.allocation?.subject?.code
        })));
      }
    } catch (err) {
      console.error('Error fetching assignments for calendar:', err);
    }
  };
  const fetchPublicEvents = async () => {
    try {
      const { data, error } = await supabase.from('public_events').select('*');
      if (error) throw error;
      if (data) {
        setPublicEvents(data.map(e => ({
          id: e.id,
          title: e.title,
          startDate: e.start_date,
          endDate: e.end_date,
          date: e.event_date,
          startTime: e.start_time,
          endTime: e.end_time,
          targetAudience: e.target_audience,
          type: 'Public'
        })));
      }
    } catch (err) {
      console.error('Error fetching public events:', err);
    }
  };

  // Removed localStorage sync

  const hours = useMemo(() => {
    return eachHourOfInterval({
      start: addHours(startOfDay(new Date()), 7), 
      end: addHours(startOfDay(new Date()), 21)   
    });
  }, []);

  const handleNext = () => {
    if (view === 'Month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'Week') setCurrentDate(addDays(currentDate, 7));
    else if (view === 'Day') setCurrentDate(addDays(currentDate, 1));
    else if (view === 'Year') setCurrentDate(addMonths(currentDate, 12));
  };

  const handlePrev = () => {
    if (view === 'Month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'Week') setCurrentDate(subMonths(currentDate, 7));
    else if (view === 'Day') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'Year') setCurrentDate(subMonths(currentDate, 12));
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title) return;

    if (newEvent.type === 'Public' && isAdmin) {
      try {
        const { data, error } = await supabase.from('public_events').insert([{
          title: newEvent.title,
          start_date: newEvent.startDate,
          end_date: newEvent.endDate,
          start_time: newEvent.startTime,
          end_time: newEvent.endTime,
          target_audience: newEvent.targetAudience,
          created_by: user.id
        }]).select();

        if (error) throw error;
        if (data) {
          setPublicEvents([...publicEvents, {
            id: data[0].id,
            title: data[0].title,
            startDate: data[0].start_date,
            endDate: data[0].end_date,
            startTime: data[0].start_time,
            endTime: data[0].end_time,
            targetAudience: data[0].target_audience,
            type: 'Public'
          }]);
        }
      } catch (err) {
        console.error('Failed to create public event', err);
      }
    } else {
      try {
        const { data, error } = await supabase.from('personal_events').insert([{
          title: newEvent.title,
          start_date: newEvent.startDate,
          end_date: newEvent.endDate,
          start_time: newEvent.startTime,
          end_time: newEvent.endTime,
          reminder: newEvent.reminder,
          user_id: user.id
        }]).select();

        if (error) throw error;
        if (data) {
          setPersonalEvents([...personalEvents, {
            id: data[0].id,
            title: data[0].title,
            startDate: data[0].start_date,
            endDate: data[0].end_date,
            startTime: data[0].start_time,
            endTime: data[0].end_time,
            reminder: data[0].reminder,
            type: 'Personal'
          }]);
        }
      } catch (err) {
        console.error('Failed to create personal event', err);
      }
    }

    setIsModalOpen(false);
    setNewEvent({ 
      title: '', 
      startDate: format(new Date(), 'yyyy-MM-dd'), 
      endDate: format(new Date(), 'yyyy-MM-dd'), 
      startTime: '10:00', 
      endTime: '11:00', 
      type: 'Personal', 
      targetAudience: 'both',
      reminder: 'none'
    });
  };

  const removeEvent = async (id, type) => {
    if (type === 'Public' && isAdmin) {
      try {
        await supabase.from('public_events').delete().eq('id', id);
        setPublicEvents(publicEvents.filter(e => e.id !== id));
      } catch (err) {
        console.error('Failed to delete public event', err);
      }
    } else {
      try {
        await supabase.from('personal_events').delete().eq('id', id);
        setPersonalEvents(personalEvents.filter(e => e.id !== id));
      } catch (err) {
        console.error('Failed to delete personal event', err);
      }
    }
  };

  const allEvents = useMemo(() => [
    ...HOLIDAYS_2026, 
    ...personalEvents, 
    ...publicEvents, 
    ...assignmentDeadlines,
    ...meetings
  ], [personalEvents, publicEvents, assignmentDeadlines, meetings]);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4 py-1">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-black tracking-tight text-[#1a1b4b]">
            {view === 'Year' ? format(currentDate, 'yyyy') : format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex bg-white/50 backdrop-blur-sm border border-gray-100 rounded-xl p-0.5 shadow-sm">
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-[12px] font-black text-gray-500 hover:text-[#1a1b4b] uppercase tracking-widest transition-colors"
            >
              Today
            </button>
            <div className="flex gap-0.5 ml-2 pl-2 border-l border-gray-100">
              <button onClick={handlePrev} className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-[#1a1b4b] transition-all">
                <ChevronLeft size={16} />
              </button>
              <button onClick={handleNext} className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-[#1a1b4b] transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex bg-gray-100/50 p-0.5 rounded-xl">
            {['Day', 'Week', 'Month', 'Year'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-black uppercase tracking-widest transition-all ${
                  view === v ? 'bg-white text-[#1a1b4b] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
             <button className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"><Settings size={18} /></button>
             <button className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"><Bell size={18} /></button>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(endOfMonth(monthStart));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-240px)] flex flex-col">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <div key={d} className="py-2.5 text-center">
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1">
          {days.map(day => {
            const isCurrMonth = isSameMonth(day, monthStart);
            const dayEvents = allEvents.filter(e => isDayInEvent(day, e));
            return (
              <div key={day.toString()} className={`p-2 border-r border-b border-gray-200 transition-all hover:bg-gray-50/20 group relative overflow-y-auto ${!isCurrMonth ? 'bg-gray-50/10 opacity-30' : ''}`}>
                 <div className="flex items-center justify-between mb-1">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[12px] font-black ${isToday(day) ? 'bg-[#1a1b4b] text-white shadow-md' : 'text-gray-500'}`}>
                      {format(day, 'd')}
                    </span>
                 </div>
                 <div className="space-y-1">
                    {dayEvents.map(e => (
                      <div key={e.id} className={`${
                        e.type === 'Holiday' ? 'bg-red-50/60 border-red-500' : 
                        e.type === 'Public' ? 'bg-green-50/60 border-green-500' : 
                        e.type === 'Deadline' ? 'bg-amber-50/60 border-amber-500' :
                        e.type === 'Meeting' ? 'bg-violet-50/60 border-violet-500' :
                        'bg-indigo-50/60 border-indigo-500'
                      } border-l-2 p-1 rounded-r-md group/evt relative`}>
                         <p className={`text-[12px] font-black truncate uppercase tracking-tighter leading-none ${
                           e.type === 'Holiday' ? 'text-red-700' : 
                           e.type === 'Public' ? 'text-green-700' : 
                           e.type === 'Deadline' ? 'text-amber-700' :
                           e.type === 'Meeting' ? 'text-violet-700' :
                           'text-indigo-700'
                         }`}>{e.title}</p>
                         {e.type !== 'Holiday' && e.type !== 'Deadline' && (e.type !== 'Public' || isAdmin) && (
                           <button onClick={(x) => { x.stopPropagation(); removeEvent(e.id, e.type); }} className="absolute -right-1 -top-1 opacity-0 group-hover/evt:opacity-100 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-all">
                             <X size={8} />
                           </button>
                         )}
                      </div>
                    ))}
                 </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-240px)]">
        <div className="grid grid-cols-[60px_1fr] border-b border-gray-200 bg-gray-50/50 sticky top-0 z-10">
          <div className="p-3 border-r border-gray-200"></div>
          <div className="grid grid-cols-7">
            {weekDays.map(day => (
              <div key={day.toString()} className="p-3 text-center border-r border-gray-200 last:border-0">
                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">{format(day, 'EEE')}</p>
                <div className={`mt-0.5 inline-flex w-7 h-7 items-center justify-center rounded-lg text-xs font-black ${isToday(day) ? 'bg-[#1a1b4b] text-white shadow-md' : 'text-[#1a1b4b]'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[60px_1fr] relative">
            <div className="bg-gray-50/20">
              {hours.map(h => (
                <div key={h.toString()} className="h-16 border-b border-gray-200 flex items-start justify-center pt-1.5">
                  <span className="text-[12px] font-black text-gray-400 uppercase tracking-tighter">{format(h, 'h a')}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-gray-200 relative">
              {weekDays.map(day => {
                const dayEvents = allEvents.filter(e => isDayInEvent(day, e));
                return (
                  <div key={day.toString()} className="h-full relative group hover:bg-gray-50/10">
                    {hours.map(h => <div key={h.toString()} className="h-16 border-b border-gray-100"></div>)}
                    {dayEvents.map(e => (
                      <div key={e.id} className={`absolute inset-x-1 p-2 border-l-3 rounded-lg shadow-sm ${
                        e.type === 'Holiday' ? 'top-2 bg-red-50 border-red-500' : 
                        e.type === 'Public' ? 'top-10 bg-green-50 border-green-500' : 
                        e.type === 'Deadline' ? 'top-16 bg-amber-50 border-amber-500' :
                        e.type === 'Meeting' ? 'top-2 bg-violet-50 border-violet-500' :
                        'top-20 bg-indigo-50 border-indigo-500'
                      }`}>
                         <p className={`text-[12px] font-black uppercase leading-tight ${
                           e.type === 'Holiday' ? 'text-red-700' : 
                           e.type === 'Public' ? 'text-green-700' : 
                           e.type === 'Deadline' ? 'text-amber-700' :
                           e.type === 'Meeting' ? 'text-violet-700' :
                           'text-indigo-700'
                         }`}>{e.title}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = allEvents.filter(e => isDayInEvent(currentDate, e));
    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[calc(100vh-240px)]">
        <div className="w-full md:w-64 p-6 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50/10 flex flex-col">
           <div className="mb-4">
              <h3 className="text-3xl font-black text-[#1a1b4b] tracking-tighter">{format(currentDate, 'd')}</h3>
              <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">{format(currentDate, 'EEEE')}</p>
           </div>
           <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-gray-100 pb-2">Agenda</p>
               {dayEvents.map(e => (
                  <div key={e.id} className={`p-4 rounded-2xl border ${
                   e.type === 'Holiday' ? 'bg-red-50 border-red-100' : 
                   e.type === 'Public' ? 'bg-green-50 border-green-100 shadow-sm' : 
                   e.type === 'Deadline' ? 'bg-amber-50 border-amber-100 shadow-sm' :
                   e.type === 'Meeting' ? 'bg-violet-50 border-violet-100 shadow-sm' :
                   'bg-white border-indigo-100 shadow-sm'
                 }`}>
                    <p className={`text-[12px] font-black uppercase mb-1 ${
                      e.type === 'Holiday' ? 'text-red-700' : 
                      e.type === 'Public' ? 'text-green-700' : 
                      e.type === 'Deadline' ? 'text-amber-700' :
                      e.type === 'Meeting' ? 'text-violet-700' :
                      'text-indigo-700'
                    }`}>{e.title}</p>
                    {e.type === 'Public' && <p className="text-[12px] font-bold text-green-600 uppercase tracking-widest mb-1">Target: {e.targetAudience}</p>}
                    {e.type === 'Deadline' && <p className="text-[12px] font-bold text-amber-600 uppercase tracking-widest mb-1">Code: {e.subject}</p>}
                    {e.type === 'Meeting' && <p className="text-[12px] font-bold text-violet-600 uppercase tracking-widest mb-1">Room: {e.location}</p>}
                    <p className="text-[12px] text-gray-400 font-bold uppercase">{e.startTime || 'All Day'} - {e.endTime || ''}</p>
                 </div>
               ))}
              {dayEvents.length === 0 && <p className="text-[12px] text-gray-300 font-black uppercase text-center mt-12 py-8 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">Quiet Day</p>}
           </div>
        </div>
        <div className="flex-1 overflow-y-auto">
           <div className="grid grid-cols-[80px_1fr] relative">
              <div className="bg-gray-50/20 border-r border-gray-200">
                 {hours.map(h => (
                   <div key={h.toString()} className="h-20 border-b border-gray-200 flex items-center justify-center">
                      <span className="text-[12px] font-black text-gray-400 uppercase tabular-nums tracking-widest">{format(h, 'h a')}</span>
                   </div>
                 ))}
              </div>
              <div className="relative h-full">
                 {hours.map(h => <div key={h.toString()} className="h-20 border-b border-gray-100 w-full hover:bg-gray-50/30 transition-colors"></div>)}
                 {isToday(currentDate) && (
                   <div className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none" style={{ top: '35%' }}>
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const months = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[calc(100vh-240px)] overflow-y-auto pr-2 custom-scrollbar">
        {months.map(month => {
          const monthDays = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
          return (
            <div key={month.toString()} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <h3 className="text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">{format(month, 'MMMM')}</h3>
               <div className="grid grid-cols-7 gap-0.5">
                  {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[7px] font-black text-gray-300 text-center py-0.5">{d}</div>)}
                  {Array.from({ length: startOfWeek(startOfMonth(month)).getDay() }).map((_, i) => <div key={i}></div>)}
                  {monthDays.map(d => {
                    const hasEvt = allEvents.some(e => isDayInEvent(d, e));
                    return (
                      <div key={d.toString()} className={`text-[12px] font-bold text-center h-5 w-5 rounded-md flex items-center justify-center mx-auto ${isToday(d) ? 'bg-[#1a1b4b] text-white shadow-sm' : hasEvt ? 'bg-red-50 text-red-600 font-black' : 'text-gray-600'}`}>
                         {format(d, 'd')}
                      </div>
                    );
                  })}
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 sm:p-10 min-h-screen bg-[#fcfdfe] relative overflow-hidden">
      
      {/* ADD EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
           <form onSubmit={handleAddEvent} className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-2">
                    <PlusCircle className="text-indigo-500" /> New Personal Event
                 </h2>
                 <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="space-y-5">
                 {isAdmin && (
                   <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                      <button type="button" onClick={() => setNewEvent({...newEvent, type: 'Personal'})} className={`flex-1 py-2 text-[12px] font-black uppercase tracking-widest rounded-lg transition-all ${newEvent.type === 'Personal' ? 'bg-white text-[#1a1b4b] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Personal Event</button>
                      <button type="button" onClick={() => setNewEvent({...newEvent, type: 'Public'})} className={`flex-1 py-2 text-[12px] font-black uppercase tracking-widest rounded-lg transition-all ${newEvent.type === 'Public' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Public Event</button>
                   </div>
                 )}

                 <div>
                    <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">Event Title</label>
                    <input 
                      type="text" 
                      autoFocus
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      placeholder="e.g. Unit Test Preparation"
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
                    />
                 </div>

                 {newEvent.type === 'Public' && isAdmin && (
                   <div>
                       <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Audience</label>
                       <select 
                         value={newEvent.targetAudience}
                         onChange={(e) => setNewEvent({...newEvent, targetAudience: e.target.value})}
                         className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100"
                       >
                         <option value="both">Both (Student & Faculty)</option>
                         <option value="student">Students Only</option>
                         <option value="faculty">Faculty Only</option>
                       </select>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                          <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">Start Date</label>
                          <input 
                            type="date" 
                            value={newEvent.startDate}
                            onChange={(e) => setNewEvent({...newEvent, startDate: e.target.value})}
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-[12px] font-bold text-[#1a1b4b]"
                          />
                       </div>
                       <div>
                          <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">End Date</label>
                          <input 
                            type="date" 
                            value={newEvent.endDate}
                            onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value})}
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-[12px] font-bold text-[#1a1b4b]"
                          />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                          <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">Start Time</label>
                          <input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-[12px] font-bold" />
                       </div>
                       <div>
                          <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">End Time</label>
                          <input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-[12px] font-bold" />
                       </div>
                    </div>
                 </div>

                 {newEvent.type === 'Personal' && (
                   <div>
                     <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Bell size={12} className="text-indigo-500" /> Set Reminder
                     </label>
                     <select 
                       value={newEvent.reminder}
                       onChange={(e) => setNewEvent({...newEvent, reminder: e.target.value})}
                       className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100"
                     >
                       <option value="none">No Reminder</option>
                       <option value="1h">1 Hour Before</option>
                       <option value="2h">2 Hours Before</option>
                       <option value="4h">4 Hours Before</option>
                       <option value="12h">12 Hours Before</option>
                       <option value="1d">1 Day Before</option>
                     </select>
                     <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 ml-1">Reminders will appear in your Announcements feed</p>
                   </div>
                 )}
              </div>

              <div className="mt-10 flex gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                 <button type="submit" disabled={!newEvent.title} className="flex-[2] py-4 bg-[#1a1b4b] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">Log Activity</button>
              </div>
           </form>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-8 max-w-[1600px] mx-auto">
        
        {/* Sidebar */}
        <div className="w-full xl:w-72 flex-shrink-0 space-y-6">
           <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-5">
                 <h1 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-2">
                   <CalendarIcon className="w-4 h-4 text-indigo-500" /> My Schedule
                 </h1>
                 <button className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[12px] font-black uppercase tracking-widest flex items-center gap-1">
                    <Filter size={12} /> Filter
                 </button>
              </div>

              <div className="relative mb-5">
                 <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" />
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Find event..." 
                   className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-200 text-[13px] font-bold text-[#1a1b4b] outline-none transition-all placeholder:text-gray-300"
                 />
              </div>

              <div className="space-y-3 h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                 <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-50 pb-2">Academic Registry 2026</p>
                 {HOLIDAYS_2026.map((h, i) => (
                   <div key={h.id} className="flex items-center gap-3 group">
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex flex-col items-center justify-center border border-red-100 shadow-sm">
                         <span className="text-[7px] font-black text-red-500 leading-none uppercase">{format(parseISO(h.date), 'MMM')}</span>
                         <span className="text-[12px] font-black text-red-700 leading-none">{format(parseISO(h.date), 'dd')}</span>
                      </div>
                      <div className="flex-1 pb-1 border-b border-gray-50 last:border-0">
                         <p className="text-[12px] font-black text-[#1a1b4b] truncate tracking-tight uppercase">{h.title}</p>
                         <p className="text-[12px] text-gray-400 font-bold uppercase">{format(parseISO(h.date), 'EEEE')}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full mt-6 py-3.5 bg-[#1a1b4b] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                 <Plus size={14} strokeWidth={4} /> {isAdmin ? 'Add Event' : 'Add Personal Event'}
              </button>
           </div>

           <div className="bg-indigo-600 rounded-[2rem] p-6 relative overflow-hidden shadow-xl shadow-indigo-50">
              <div className="relative z-10">
                 <Bell className="text-white w-5 h-5 mb-4 opacity-70" />
                 <h3 className="text-lg font-black text-white leading-tight uppercase tracking-widest">Academic Alerts <br />Live</h3>
                 <p className="text-white/60 text-[12px] font-bold mt-2 uppercase tracking-widest leading-relaxed">System notifications enabled for submission deadlines.</p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
           </div>
        </div>

        {/* Calendar Core */}
        <div className="flex-1 animate-in fade-in duration-700">
           {renderHeader()}
           <div className="shadow-2xl shadow-gray-100 rounded-[2rem]">
             {view === 'Month' && renderMonthView()}
             {view === 'Week' && renderWeekView()}
             {view === 'Day' && renderDayView()}
             {view === 'Year' && renderYearView()}
           </div>
           
           <div className="mt-5 p-4 bg-white rounded-2xl border border-gray-100 flex flex-wrap gap-5 items-center justify-center sm:justify-start">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                 <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">University Holiday</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                 <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Personal Event</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                 <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Public Event</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                 <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Assignment Deadline</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                 <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Departmental Meeting</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-[#1a1b4b] rounded-full"></div>
                 <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Current Active</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
