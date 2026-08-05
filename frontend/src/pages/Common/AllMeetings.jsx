import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, 
    Loader2, 
    Info, 
    Video, 
    VideoOff,
    Mic,
    MicOff,
    Monitor,
    MessageSquare,
    Hand,
    Copy,
    Send,
    Users, 
    Calendar, 
    Clock, 
    MapPin, 
    User, 
    CheckCircle2, 
    AlertCircle, 
    Plus, 
    Share2, 
    Radio, 
    BookOpen, 
    Megaphone,
    Play,
    Square,
    ExternalLink,
    ShieldCheck,
    Shield,
    Camera
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import notificationApi from '../../api/notificationApi';

// Realistic academic timetable sessions (with role-based access filtering)
const INITIAL_TIMETABLE_SESSIONS = [
    {
        id: 'session-1',
        title: 'Discrete Mathematics • Regular Online Lecture (AIA2)',
        convenerRole: 'FACULTY',
        convenerName: 'Prof. Archana Pakhare',
        targetAudience: 'TY15: AIA2 - Discrete Mathematics (Assigned Student Batch)',
        roomId: 'dma-lecture-aia2',
        status: 'ONGOING',
        startTime: '10:00 AM - 11:00 AM',
        date: 'Today',
        agenda: 'Group Theory & Algebraic Structures problem-solving session.',
        participantsCount: 42
    },
    {
        id: 'session-2',
        title: 'Design & Analysis of Algorithms • Lecture & Tutorial',
        convenerRole: 'FACULTY',
        convenerName: 'Prof. Rohit Sharma',
        targetAudience: 'PE-I: DAA - Design & Analysis of Algorithms (Assigned Student Batch)',
        roomId: 'daa-lecture-pei',
        status: 'UPCOMING',
        startTime: '02:00 PM - 03:00 PM',
        date: 'Today',
        agenda: 'Dynamic Programming vs Greedy Approach practice problems.',
        participantsCount: 38
    },
    {
        id: 'session-3',
        title: 'CSE Departmental Faculty Review (Faculty Only)',
        convenerRole: 'HOD',
        convenerName: 'Dr. N. V. Kulkarni (HOD CSE)',
        targetAudience: 'Department Faculty Members (Faculty Only)',
        roomId: 'cse-hod-faculty-sync',
        status: 'UPCOMING',
        startTime: '04:30 PM - 05:30 PM',
        date: 'Today',
        agenda: 'Internal lab exam evaluation guidelines and faculty load mapping.',
        participantsCount: 18
    }
];

const SUBJECT_OPTIONS = [
    'TY15: AIA2 - Discrete Mathematics (Assigned Student Batch)',
    'PE-I: DAA - Design & Analysis of Algorithms (Assigned Student Batch)',
    'TY15: CSE - Machine Learning (Assigned Student Batch)',
    'Division A - Computer Networks (Assigned Division)',
    'Batch B2 - Dev Lab Practical (Assigned Practical Batch)'
];

const AllMeetings = () => {
    const { profile } = useAuth();
    const [searchParams] = useSearchParams();
    const queryRoomId = searchParams.get('room');

    // Hierarchy & Session Launcher State
    const [selectedRole, setSelectedRole] = useState('FACULTY'); // 'DEAN' | 'HOD' | 'FACULTY'
    const [title, setTitle] = useState('');
    const [targetAudience, setTargetAudience] = useState(SUBJECT_OPTIONS[0]);
    const [agenda, setAgenda] = useState('');
    const [roomId, setRoomId] = useState(queryRoomId || 'enterprise-room-1');

    // Sessions & Live Room State
    const [sessions, setSessions] = useState(INITIAL_TIMETABLE_SESSIONS);
    const [activeLiveRoom, setActiveLiveRoom] = useState(queryRoomId ? {
        roomId: queryRoomId,
        title: `Live Video Session (${queryRoomId})`,
        convenerName: profile?.full_name || 'Academic Faculty'
    } : null);

    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [sdkError, setSdkError] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [notificationMsg, setNotificationMsg] = useState('');

    // AsgMeet Live Classroom Studio Controls State
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [screenShareOn, setScreenShareOn] = useState(false);
    const [handRaised, setHandRaised] = useState(false);
    const [studioTab, setStudioTab] = useState('grid'); // 'grid' | 'chat' | 'participants'
    const [chatMsgs, setChatMsgs] = useState([
        { id: 1, sender: 'MySpace Engine', text: 'Welcome to the Live Academic Class room! Recording is enabled.', time: 'Now', system: true }
    ]);
    const [newMsg, setNewMsg] = useState('');

    const handleSendChatMsg = (e) => {
        e.preventDefault();
        if (!newMsg.trim()) return;
        const msg = {
            id: Date.now(),
            sender: profile?.full_name || 'Academic Member',
            text: newMsg.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            system: false
        };
        setChatMsgs(prev => [...prev, msg]);
        setNewMsg('');
    };

    // Meeting Mode State: 'INSTANT' (Start Now) vs 'SCHEDULED' (Schedule Later)
    const [launchMode, setLaunchMode] = useState('INSTANT'); // 'INSTANT' | 'SCHEDULED'
    const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [scheduledStartTime, setScheduledStartTime] = useState('14:00');
    const [scheduledEndTime, setScheduledEndTime] = useState('15:00');

    const formatTime12h = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        let hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        const hourPad = hour < 10 ? `0${hour}` : hour;
        return `${hourPad}:${m} ${ampm}`;
    };

    // Detect role & hierarchy permissions
    const roleStr = (profile?.role || '').toLowerCase();
    const emailStr = (profile?.email || '').toLowerCase();

    const isDeanUser = roleStr.includes('dean') || emailStr.includes('dean') || roleStr.includes('admin') || roleStr.includes('superadmin');
    const isHodUser = roleStr.includes('hod') || emailStr.includes('hod');
    const isStudent = roleStr === 'student' || roleStr === 'user' || (!roleStr && !emailStr.includes('admin') && !emailStr.includes('faculty') && !emailStr.includes('hod') && !emailStr.includes('dean'));

    // Allowed convener options strictly restricted by user hierarchy
    // Faculty -> [FACULTY], HOD -> [HOD, FACULTY], Dean -> [DEAN, HOD, FACULTY]
    const allowedConvenerRoles = isDeanUser
        ? [ { key: 'DEAN', label: 'Dean' }, { key: 'HOD', label: 'HOD' }, { key: 'FACULTY', label: 'Faculty' } ]
        : isHodUser
        ? [ { key: 'HOD', label: 'HOD' }, { key: 'FACULTY', label: 'Faculty' } ]
        : [ { key: 'FACULTY', label: 'Faculty' } ];

    // Automatically set default selectedRole according to highest allowed role
    useEffect(() => {
        if (isDeanUser) {
            setSelectedRole('DEAN');
        } else if (isHodUser) {
            setSelectedRole('HOD');
        } else {
            setSelectedRole('FACULTY');
        }
    }, [profile?.role, profile?.email]);

    // Filter visible sessions: Automatically exclude completed, ended, expired, or past meetings
    const todayStr = new Date().toISOString().split('T')[0];

    const visibleSessions = sessions.filter(s => {
        const statusUpper = (s.status || '').toUpperCase();

        // 1. Automatically remove completed, ended, finished, or expired meetings from everyone's dashboard
        if (statusUpper === 'COMPLETED' || statusUpper === 'ENDED' || statusUpper === 'FINISHED' || statusUpper === 'EXPIRED') {
            return false;
        }

        // 2. Automatically remove past/older meetings whose date is earlier than today (unless currently live ONGOING)
        if (s.date && s.date !== 'Today' && s.date < todayStr && statusUpper !== 'ONGOING') {
            return false;
        }

        // 3. Role-based filtering for students vs faculty
        const aud = (s.targetAudience || '').toLowerCase();
        const conv = (s.convenerRole || '').toUpperCase();
        if (isStudent) {
            // Exclude meetings explicitly marked for Faculty Only or HODs Only
            if (aud.includes('faculty only') || aud.includes("hod's & faculty") || aud.includes('senior faculty') || aud.includes('hods only')) {
                return false;
            }
            // Exclude Dean meetings unless explicitly university-wide assembly
            if (conv === 'DEAN' && !aud.includes('all faculty & students') && !aud.includes('university-wide')) {
                return false;
            }
            // Exclude HOD meetings unless they explicitly target students
            if (conv === 'HOD' && aud.includes('faculty members only')) {
                return false;
            }
            return true;
        }
        return true;
    });

    // Convener can mark a meeting as Completed, automatically removing it from everyone's dashboard
    const handleEndMeeting = async (sessionToComplete) => {
        const sessionId = sessionToComplete?.id;
        const roomToClose = sessionToComplete?.roomId;

        try {
            if (sessionId) {
                await supabase
                    .from('meetings')
                    .update({ status: 'completed', end_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
                    .eq('id', sessionId);
            }
            if (roomToClose) {
                await supabase
                    .from('meetings')
                    .update({ status: 'completed', end_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
                    .eq('room_id', roomToClose);
            }
        } catch (err) {
            console.error('Error marking meeting as completed in Supabase:', err);
        }

        // Remove completed meeting from state immediately so it vanishes from all dashboards
        setSessions(prev => prev.filter(s => {
            if (sessionId && s.id === sessionId) return false;
            if (roomToClose && s.roomId === roomToClose) return false;
            return true;
        }));

        if (activeLiveRoom && activeLiveRoom.roomId === roomToClose) {
            setActiveLiveRoom(null);
        }

        setNotificationMsg('Meeting completed and automatically removed from all user dashboards!');
        setTimeout(() => setNotificationMsg(''), 5000);
    };

    // Faculty can launch/start an upcoming scheduled class according to timetable
    const handleStartScheduledClass = async (session) => {
        try {
            await supabase
                .from('meetings')
                .update({ status: 'ongoing', end_time: 'LIVE NOW' })
                .eq('id', session.id);
        } catch (err) {
            console.error('Error starting scheduled class:', err);
        }
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'ONGOING', startTime: 'LIVE NOW' } : s));
        setActiveLiveRoom({
            roomId: session.roomId,
            title: session.title,
            convenerName: session.convenerName
        });
        setNotificationMsg(`Online Class "${session.title}" started! Students can now join.`);
        setTimeout(() => setNotificationMsg(''), 5000);
    };

    // Update targetAudience default when role changes
    useEffect(() => {
        if (selectedRole === 'DEAN') {
            setTargetAudience("All HOD's & Faculty Members");
        } else if (selectedRole === 'HOD') {
            setTargetAudience("Department Faculty & Students");
        } else {
            setTargetAudience(SUBJECT_OPTIONS[0]);
        }
    }, [selectedRole]);

    // Load real active meetings from Supabase database
    useEffect(() => {
        const fetchRealMeetings = async () => {
            try {
                const { data, error } = await supabase
                    .from('meetings')
                    .select('*')
                    .order('date', { ascending: false });

                if (!error && data && data.length > 0) {
                    const currentToday = new Date().toISOString().split('T')[0];

                    // Automatically filter out completed, ended, or expired meetings from database
                    const activeOrScheduledData = data.filter(m => {
                        const st = (m.status || '').toLowerCase();
                        if (st === 'completed' || st === 'ended' || st === 'finished' || st === 'expired') {
                            return false;
                        }
                        if (m.date && m.date < currentToday && st !== 'ongoing') {
                            return false;
                        }
                        return true;
                    });

                    const mapped = activeOrScheduledData.map(m => ({
                        id: m.id,
                        title: m.agenda || m.title || 'Live Video Session',
                        convenerRole: (m.organized_by || '').includes('HOD') ? 'HOD' : (m.organized_by || '').includes('DEAN') ? 'DEAN' : 'FACULTY',
                        convenerName: m.organized_by || 'Faculty Convener',
                        targetAudience: m.location || 'Assigned Subject Students',
                        roomId: m.room_id || `room-${m.id}`,
                        status: (m.status || 'ongoing').toUpperCase(),
                        startTime: m.start_time || 'LIVE NOW',
                        date: m.date || 'Today',
                        agenda: m.agenda || 'Live Interactive Class / Meeting',
                        participantsCount: m.participants_count || 12
                    }));
                    setSessions(mapped);
                }
            } catch (err) {
                console.error('Error fetching meetings from Supabase:', err);
            }
        };
        fetchRealMeetings();
    }, []);

    // Dynamically load AsgMeet SDK script
    useEffect(() => {
        if (window.AsgMeet) {
            setSdkLoaded(true);
            return;
        }

        const scriptId = 'asgmeet-sdk-script';
        if (document.getElementById(scriptId)) return;

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://asgmeet.onrender.com/sdk/asgmeet-sdk.js';
        script.async = true;
        script.onload = () => setSdkLoaded(true);
        script.onerror = () => setSdkError(true);
        document.body.appendChild(script);
    }, []);

    // Initialize AsgMeet SDK when active room changes
    useEffect(() => {
        if (!activeLiveRoom || !sdkLoaded) return;
        if (!document.querySelector('#asgmeet-container')) return;

        try {
            if (window.AsgMeet) {
                const meet = new window.AsgMeet({
                    apiKey: 'asg_live_demo123',
                    roomId: activeLiveRoom.roomId,
                    appName: 'MYSPACE',
                    container: '#asgmeet-container',
                    user: { name: profile?.full_name || 'Academic Member' },
                    theme: { primaryColor: '#1a1b4b' },
                    features: {
                        defaultMuted: false,
                        defaultVideoOff: false
                    },
                    controls: {
                        mic: true,
                        camera: true,
                        screenShare: true,
                        chat: true,
                        participants: true,
                        raiseHand: true,
                        shareLink: true
                    },
                    events: {
                        onJoin: (data) => console.log('AsgMeet: User joined', data),
                        onLeave: (data) => console.log('AsgMeet: User left', data),
                        onChatMessage: (msg) => console.log('AsgMeet: New message', msg)
                    }
                });
                meet.join();
            }
        } catch (err) {
            console.error('Error starting AsgMeet SDK room:', err);
            setSdkError(true);
        }
    }, [activeLiveRoom, sdkLoaded]);

    const handleLaunchMeeting = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setNotificationMsg('Please enter a session title.');
            setTimeout(() => setNotificationMsg(''), 3000);
            return;
        }

        setPublishing(true);
        const newRoomId = roomId.trim() || `room-${Math.random().toString(36).substring(2, 7)}`;
        const isInstant = launchMode === 'INSTANT';

        const formattedStart = isInstant ? 'LIVE NOW' : formatTime12h(scheduledStartTime);
        const formattedEnd = isInstant ? 'LIVE NOW' : formatTime12h(scheduledEndTime);
        const timeDisplay = isInstant ? 'LIVE NOW' : `${formattedStart} - ${formattedEnd}`;
        const dateDisplay = isInstant ? 'Today' : scheduledDate;

        const newSession = {
            id: `session-${Date.now()}`,
            title,
            convenerRole: selectedRole,
            convenerName: profile?.full_name || `${selectedRole} Member`,
            targetAudience,
            roomId: newRoomId,
            status: isInstant ? 'ONGOING' : 'UPCOMING',
            startTime: timeDisplay,
            date: dateDisplay,
            agenda: agenda || 'Interactive live classroom and briefing room.',
            participantsCount: isInstant ? 1 : 0
        };

        // 1. Store in Supabase database meetings table & update state
        try {
            await supabase.from('meetings').insert([{
                date: isInstant ? new Date().toISOString().split('T')[0] : scheduledDate,
                start_time: isInstant ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : formattedStart,
                end_time: isInstant ? 'LIVE NOW' : formattedEnd,
                agenda: title,
                location: targetAudience,
                organized_by: `${newSession.convenerName} (${selectedRole})`,
                status: isInstant ? 'ongoing' : 'upcoming',
                created_by: profile?.id || null
            }]);
        } catch (dbErr) {
            console.error('Supabase meetings insert error:', dbErr);
        }
        setSessions([newSession, ...sessions]);

        // 2. Publish to Supabase Announcements table
        const announcePrefix = isInstant ? '🔴 LIVE CLASS / MEETING:' : '📅 SCHEDULED CLASS / MEETING:';
        const announceTitle = `${announcePrefix} ${title}`;
        const announceDescPrefix = isInstant 
            ? '🔴 LIVE VIDEO ROOM STARTED:' 
            : `📅 SCHEDULED LIVE SESSION (${dateDisplay} ${timeDisplay}):`;
        const announceDescription = `${announceDescPrefix} "${title}". Convener: ${newSession.convenerName} (${selectedRole}). Audience: ${targetAudience}. Agenda: ${newSession.agenda}`;

        try {
            await notificationApi.publishAnnouncement({
                title: announceTitle,
                description: announceDescription,
                start_date: isInstant ? new Date().toISOString().split('T')[0] : scheduledDate,
                end_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
                targetAudience: 'both',
                priority: 'HIGH',
                category: 'LIVE_CLASS',
                targetScope: 'UNIVERSITY',
                isPinned: true,
                createdBy: profile?.id || null,
                status: 'approved',
                submittedByName: newSession.convenerName
            });
        } catch (err) {
            try {
                await supabase.from('announcements').insert([{
                    title: announceTitle,
                    description: announceDescription,
                    start_date: isInstant ? new Date().toISOString().split('T')[0] : scheduledDate,
                    end_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
                    target_audience: 'both',
                    priority: 'HIGH',
                    category: 'LIVE_CLASS',
                    status: 'approved',
                    is_pinned: true
                }]);
            } catch (fallbackErr) {
                console.error('Announcement publish fallback error:', fallbackErr);
            }
        }

        setPublishing(false);

        if (isInstant) {
            setNotificationMsg(`Live room "${title}" started! Announcement broadcasted.`);
            setActiveLiveRoom({
                roomId: newRoomId,
                title,
                convenerName: newSession.convenerName
            });
        } else {
            setNotificationMsg(`Meeting "${title}" successfully scheduled for ${scheduledDate} (${timeDisplay}) and broadcasted to Announcements!`);
        }

        setTimeout(() => setNotificationMsg(''), 5000);
    };

    return (
        <div className="min-h-screen bg-[#fcfdfe] text-[#1a1b4b] p-4 md:p-8 lg:p-10 space-y-8">
            
            {/* ── Top Header Banner ────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-gray-200 gap-6">
                <div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#4B7BFF]">
                        <Video className="w-4 h-4" />
                        <span>Institutional Video Conference & Live Classroom (MySpace Engine)</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2 text-[#1a1b4b] uppercase">
                        Academic Live Meetings & Lectures
                    </h1>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <Link
                        to="/announcements"
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-gray-200 text-[#1a1b4b] text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                        <Megaphone className="w-4 h-4 text-indigo-500" />
                        <span>View Announcements Feed</span>
                    </Link>
                </div>
            </div>

            {/* Notification Banner */}
            {notificationMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3 text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>{notificationMsg}</span>
                </div>
            )}

            {/* ── Active Video Conference Room Studio ───────────────────────── */}
            {activeLiveRoom ? (
                <div className="bg-white rounded-[2rem] border border-gray-200 p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                                <span className="text-xs font-black uppercase tracking-widest text-red-600">Active Live Room • MySpace Engine</span>
                            </div>
                            <h2 className="text-xl font-black text-[#1a1b4b] uppercase mt-1">{activeLiveRoom.title}</h2>
                            <p className="text-xs font-bold text-gray-500 mt-0.5">
                                Room ID: <strong className="text-[#1a1b4b]">{activeLiveRoom.roomId}</strong> • Convener: {activeLiveRoom.convenerName}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <a
                                href={`https://asgmeet.onrender.com/room.html?room=${encodeURIComponent(activeLiveRoom.roomId)}&name=${encodeURIComponent(profile?.full_name || 'Academic Member')}&appName=MYSPACE`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs uppercase tracking-widest border border-indigo-200 transition-all shadow-sm"
                            >
                                <Share2 className="w-4 h-4" />
                                <span>Open MySpace in New Tab ↗</span>
                            </a>

                            <button
                                onClick={() => setActiveLiveRoom(null)}
                                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest border border-slate-200 transition-all shadow-sm"
                            >
                                <span>Minimize Preview</span>
                            </button>

                            <button
                                onClick={() => handleEndMeeting(activeLiveRoom)}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-md"
                                title="End meeting for all participants and remove from dashboard"
                            >
                                <Square className="w-4 h-4" />
                                <span>End & Complete Meeting</span>
                            </button>
                        </div>
                    </div>

                    {/* Interactive MySpace Client-Side WebRTC Studio */}
                    <div className="w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 min-h-[600px] flex flex-col justify-between relative shadow-2xl">
                        
                        {/* Top Studio Indicator Bar */}
                        <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" /> LIVE CLASSROOM
                                </span>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                                    MYSPACE • {activeLiveRoom.roomId}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setStudioTab(studioTab === 'grid' ? 'participants' : 'grid')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                        studioTab === 'participants' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    <span>Participants (5)</span>
                                </button>
                                <button
                                    onClick={() => setStudioTab(studioTab === 'grid' ? 'chat' : 'grid')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                        studioTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Chat ({chatMsgs.length})</span>
                                </button>
                            </div>
                        </div>

                        {/* Main Studio Viewport */}
                        <div className="flex-1 flex overflow-hidden min-h-[550px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-8 flex flex-col items-center justify-center relative">
                            {/* Ambient Glow Effects */}
                            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 relative z-10">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>MySpace Live Engine Ready</span>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">
                                        {activeLiveRoom.title}
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">
                                        Room ID: <strong className="text-indigo-400">{activeLiveRoom.roomId}</strong> • Host: <strong className="text-slate-200">{activeLiveRoom.convenerName || profile?.full_name}</strong>
                                    </p>
                                </div>

                                {/* Main Launch Button */}
                                <div className="pt-2">
                                    <button
                                        onClick={() => {
                                            const roomUrl = `https://asgmeet.onrender.com/room.html?room=${encodeURIComponent(activeLiveRoom.roomId)}&name=${encodeURIComponent(profile?.full_name || 'Academic Member')}&appName=MYSPACE`;
                                            window.open(roomUrl, `asgmeet_${activeLiveRoom.roomId}`, 'width=1280,height=800,scrollbars=yes,resizable=yes');
                                        }}
                                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5"
                                    >
                                        <Video className="w-5 h-5" />
                                        <span>Launch MySpace Video Room</span>
                                        <ExternalLink className="w-4 h-4 opacity-80" />
                                    </button>
                                </div>
                            </div>
                        </div>

                            {/* Sidebar: Chat Panel */}
                            {studioTab === 'chat' && (
                                <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col justify-between">
                                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-white">Room Chat</span>
                                        <button onClick={() => setStudioTab('grid')} className="text-slate-400 hover:text-white">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                                        {chatMsgs.map(msg => (
                                            <div key={msg.id} className={`p-3 rounded-xl text-xs ${msg.system ? 'bg-indigo-950/60 border border-indigo-800 text-indigo-200' : 'bg-slate-800 border border-slate-700 text-slate-200'}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <strong className="font-black text-white uppercase tracking-wider">{msg.sender}</strong>
                                                    <span className="text-[10px] text-slate-400">{msg.time}</span>
                                                </div>
                                                <p className="text-xs leading-relaxed">{msg.text}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <form onSubmit={handleSendChatMsg} className="p-3 border-t border-slate-800 flex gap-2">
                                        <input
                                            type="text"
                                            value={newMsg}
                                            onChange={(e) => setNewMsg(e.target.value)}
                                            placeholder="Type message..."
                                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                        />
                                        <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-black text-xs uppercase tracking-widest">
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Sidebar: Participants Panel */}
                            {studioTab === 'participants' && (
                                <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col">
                                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-white">Active Room Participants</span>
                                        <button onClick={() => setStudioTab('grid')} className="text-slate-400 hover:text-white">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex-1 p-4 overflow-y-auto space-y-2">
                                        <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-black text-white block">{profile?.full_name || 'You'}</span>
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{profile?.role || 'Member'}</span>
                                            </div>
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Studio Controls Toolbar */}
                        <div className="bg-slate-900/90 border-t border-slate-800 px-6 py-4 flex flex-wrap items-center justify-center gap-3">
                            <button
                                onClick={() => setMicOn(!micOn)}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    micOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                                }`}
                                title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                            >
                                {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                <span>{micOn ? 'Mic On' : 'Muted'}</span>
                            </button>

                            <button
                                onClick={() => setCamOn(!camOn)}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    camOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                                }`}
                                title={camOn ? "Turn Off Camera" : "Turn On Camera"}
                            >
                                {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                                <span>{camOn ? 'Camera On' : 'Camera Off'}</span>
                            </button>

                            <button
                                onClick={() => setScreenShareOn(!screenShareOn)}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    screenShareOn ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                                title="Share Screen"
                            >
                                <Monitor className="w-4 h-4" />
                                <span>{screenShareOn ? 'Sharing Screen' : 'Share Screen'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    setHandRaised(!handRaised);
                                    if (!handRaised) {
                                        setNotificationMsg('You raised your hand.');
                                        setTimeout(() => setNotificationMsg(''), 3000);
                                    }
                                }}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    handRaised ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                                title="Raise Hand"
                            >
                                <Hand className="w-4 h-4" />
                                <span>{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/meetings?room=${activeLiveRoom.roomId}`;
                                    navigator.clipboard.writeText(shareUrl);
                                    setNotificationMsg('Room link copied to clipboard!');
                                    setTimeout(() => setNotificationMsg(''), 3000);
                                }}
                                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                                title="Copy Room Link"
                            >
                                <Copy className="w-4 h-4" />
                                <span>Copy Room Link</span>
                            </button>

                            <button
                                onClick={() => setActiveLiveRoom(null)}
                                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-red-600/30"
                                title="Leave Room"
                            >
                                <Square className="w-4 h-4" />
                                <span>Leave Room</span>
                            </button>
                        </div>
                    </div>
            ) : null}

            {/* ── Main Layout: Launcher (Left) | Sessions List (Right) ──────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Role Hierarchy & Launcher Card (5 Cols) - Hidden for Students */}
                {!isStudent && (
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-gray-200 p-7 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-lg font-black text-[#1a1b4b] uppercase tracking-tight">
                                Schedule & Announce Live Session
                            </h2>
                            <p className="text-xs font-bold text-gray-500 mt-1">
                                Choose your academic role to populate the correct audience hierarchy.
                            </p>
                        </div>

                        <form onSubmit={handleLaunchMeeting} className="space-y-5">
                            {/* 1. Session Mode Toggle: Start Now vs Schedule for Later */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                                    1. Choose Meeting Mode
                                </label>
                                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setLaunchMode('INSTANT')}
                                        className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                            launchMode === 'INSTANT'
                                                ? 'bg-[#4B7BFF] text-white shadow-md'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                                        <span>Start Now</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLaunchMode('SCHEDULED')}
                                        className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                            launchMode === 'SCHEDULED'
                                                ? 'bg-[#1a1b4b] text-white shadow-md'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Schedule Later</span>
                                    </button>
                                </div>
                            </div>

                            {/* 2. Convener Role Selector (Strictly restricted by user hierarchy) */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center justify-between">
                                    <span>2. Convener Role</span>
                                    <span className="text-[10px] font-bold text-indigo-600 lowercase bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                        {isDeanUser ? 'Dean Hierarchy' : isHodUser ? 'HOD Hierarchy' : 'Faculty Hierarchy'}
                                    </span>
                                </label>

                                {allowedConvenerRoles.length === 1 ? (
                                    <div className="p-3.5 bg-[#1a1b4b] text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-between border border-[#1a1b4b]">
                                        <span className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-indigo-300" />
                                            <span>Faculty Convener</span>
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">Your Role</span>
                                    </div>
                                ) : (
                                    <div className={`grid grid-cols-${allowedConvenerRoles.length} gap-2`}>
                                        {allowedConvenerRoles.map(r => (
                                            <button
                                                key={r.key}
                                                type="button"
                                                onClick={() => setSelectedRole(r.key)}
                                                className={`py-3 px-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${
                                                    selectedRole === r.key
                                                        ? 'bg-[#1a1b4b] text-white border-[#1a1b4b] shadow-md'
                                                        : 'bg-slate-50 text-gray-600 border-gray-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 3. Target Audience based on Hierarchy */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                                    3. Target Audience ({selectedRole} Hierarchy)
                                </label>
                                {selectedRole === 'DEAN' ? (
                                    <select
                                        value={targetAudience}
                                        onChange={(e) => setTargetAudience(e.target.value)}
                                        className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs font-black text-[#1a1b4b] uppercase tracking-wider outline-none focus:border-[#4B7BFF]"
                                    >
                                        <option value="All HOD's & Faculty Members">All HOD's & Faculty Members</option>
                                        <option value="All Department HOD's Only">All Department HOD's Only</option>
                                        <option value="All University Faculty Members">All University Faculty Members</option>
                                    </select>
                                ) : selectedRole === 'HOD' ? (
                                    <select
                                        value={targetAudience}
                                        onChange={(e) => setTargetAudience(e.target.value)}
                                        className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs font-black text-[#1a1b4b] uppercase tracking-wider outline-none focus:border-[#4B7BFF]"
                                    >
                                        <option value="Department Faculty & Students">Department Faculty & Students</option>
                                        <option value="Department Faculty Members Only">Department Faculty Members Only</option>
                                        <option value="All Department Students Only">All Department Students Only</option>
                                    </select>
                                ) : (
                                    <select
                                        value={targetAudience}
                                        onChange={(e) => setTargetAudience(e.target.value)}
                                        className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs font-black text-[#1a1b4b] uppercase tracking-wider outline-none focus:border-[#4B7BFF]"
                                    >
                                        {SUBJECT_OPTIONS.map(sub => (
                                            <option key={sub} value={`Subject Students: ${sub}`}>Subject Students: {sub}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Scheduled Date & Time Pickers (Only when launchMode === 'SCHEDULED') */}
                            {launchMode === 'SCHEDULED' && (
                                <div className="space-y-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-900">
                                        <Calendar className="w-4 h-4 text-indigo-600" />
                                        <span>Select Date & Time Slot</span>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-900 mb-1">
                                            Meeting Date
                                        </label>
                                        <input
                                            type="date"
                                            value={scheduledDate}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-black text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-900 mb-1">
                                                Start Time
                                            </label>
                                            <input
                                                type="time"
                                                value={scheduledStartTime}
                                                onChange={(e) => setScheduledStartTime(e.target.value)}
                                                className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-black text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-900 mb-1">
                                                End Time
                                            </label>
                                            <input
                                                type="time"
                                                value={scheduledEndTime}
                                                onChange={(e) => setScheduledEndTime(e.target.value)}
                                                className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-black text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Custom Room ID */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                                    {launchMode === 'SCHEDULED' ? '5. Custom Video Room ID' : '4. Custom Video Room ID'}
                                </label>
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    placeholder="e.g. dma-lecture-ty15"
                                    className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs font-black text-[#1a1b4b] uppercase tracking-wider outline-none focus:border-[#4B7BFF]"
                                />
                            </div>

                            {/* Session Title */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                                    {launchMode === 'SCHEDULED' ? '6. Session Title / Subject' : '5. Session Title / Subject'}
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Discrete Mathematics • Online Lecture"
                                    className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs font-black text-[#1a1b4b] uppercase tracking-wider outline-none focus:border-[#4B7BFF]"
                                />
                            </div>

                            {/* Agenda */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                                    {launchMode === 'SCHEDULED' ? '7. Agenda / Lecture Notes' : '6. Agenda / Lecture Notes'}
                                </label>
                                <textarea
                                    value={agenda}
                                    onChange={(e) => setAgenda(e.target.value)}
                                    rows="2"
                                    placeholder="Brief outline of the lecture or meeting agenda..."
                                    className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs font-bold text-[#1a1b4b] outline-none focus:border-[#4B7BFF]"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={publishing}
                                className={`w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                                    launchMode === 'INSTANT' 
                                        ? 'bg-[#4B7BFF] hover:bg-[#3b66d6] shadow-[#4B7BFF]/25' 
                                        : 'bg-[#1a1b4b] hover:bg-[#2d3a8c] shadow-[#1a1b4b]/20'
                                }`}
                            >
                                {publishing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : launchMode === 'INSTANT' ? (
                                    <Radio className="w-4 h-4 animate-pulse" />
                                ) : (
                                    <Calendar className="w-4 h-4" />
                                )}
                                <span>
                                    {launchMode === 'INSTANT' ? 'Start Live Room Now & Broadcast' : 'Schedule Meeting & Broadcast'}
                                </span>
                            </button>
                        </form>
                    </div>

                    {/* Quick Guidance Box */}
                    <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-700">
                            <Megaphone className="w-4 h-4" />
                            <span>Automatic Announcement Integration</span>
                        </div>
                        <p className="text-xs font-bold text-gray-600 leading-relaxed">
                            When you click <strong className="text-[#1a1b4b]">Start Live Room</strong>, an official notification is automatically broadcasted to the <strong className="text-[#1a1b4b]">Announcement section</strong> with a direct 1-click video join button for your targeted audience.
                        </p>
                    </div>
                </div>
                )}

                {/* Right Sessions List */}
                <div className={isStudent ? "lg:col-span-12 space-y-6" : "lg:col-span-7 space-y-6"}>
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                        <div>
                            <h2 className="text-base font-black text-[#1a1b4b] uppercase tracking-wider">
                                {isStudent ? "My Academic Timetable & Online Classes" : "Active & Scheduled Live Sessions"}
                            </h2>
                            <p className="text-xs font-bold text-gray-500">
                                {isStudent 
                                    ? "Assigned batch & division online lectures according to your academic schedule"
                                    : "Institutional meetings and subject online classes across all hierarchies"
                                }
                            </p>
                        </div>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-200 text-xs font-black text-gray-600 uppercase tracking-widest">
                            {visibleSessions.length} {isStudent ? "Scheduled / Live" : "Active"}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {visibleSessions.map((s) => (
                            <div
                                key={s.id}
                                className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all space-y-4 overflow-hidden"
                            >
                                {/* Header Row: Status Badges (Left) & Action Buttons (Right) */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest border ${
                                            s.convenerRole === 'DEAN' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            s.convenerRole === 'HOD' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {s.convenerRole} CONVENER
                                        </span>
                                        <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest border flex items-center gap-1.5 ${
                                            s.status === 'ONGOING' 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            <Radio className="w-3 h-3 animate-pulse" /> {s.status === 'ONGOING' ? 'LIVE NOW' : 'SCHEDULED'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {s.status === 'ONGOING' ? (
                                            <button
                                                onClick={() => setActiveLiveRoom({
                                                    roomId: s.roomId,
                                                    title: s.title,
                                                    convenerName: s.convenerName
                                                })}
                                                className="px-5 py-2.5 rounded-2xl bg-[#4B7BFF] hover:bg-[#3b66d6] text-white font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-2 transition-all"
                                            >
                                                <Video className="w-4 h-4" />
                                                <span>Join Online Class</span>
                                            </button>
                                        ) : isStudent ? (
                                            <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                <span>Awaiting Faculty</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleStartScheduledClass(s)}
                                                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-2 transition-all"
                                            >
                                                <Play className="w-4 h-4" />
                                                <span>Start Class Now</span>
                                            </button>
                                        )}

                                        {!isStudent && (
                                            <button
                                                onClick={() => handleEndMeeting(s)}
                                                className="px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase tracking-widest border border-red-200 transition-all flex items-center gap-1.5"
                                                title="Complete meeting and remove from all dashboards"
                                            >
                                                <Square className="w-3.5 h-3.5" />
                                                <span>End & Remove</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Body Section: Title & Audience */}
                                <div>
                                    <h3 className="text-base font-black text-[#1a1b4b] uppercase tracking-wide leading-snug">{s.title}</h3>
                                    <p className="text-xs font-bold text-gray-500 mt-1">
                                        Audience: <strong className="text-[#1a1b4b]">{s.targetAudience}</strong>
                                    </p>
                                </div>

                                {/* Footer Section: Details */}
                                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-indigo-500" />
                                        <span>Convener: {s.convenerName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-emerald-500" />
                                        <span>{s.startTime} ({s.date})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-purple-500" />
                                        <span>{s.participantsCount} Participants</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AllMeetings;
