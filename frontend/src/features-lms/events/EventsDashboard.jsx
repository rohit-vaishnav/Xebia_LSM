import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvents } from './EventsContext';
import { useToast } from '@/hooks-lms/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Calendar, Clock, MapPin, Eye, Edit3, Trash2, 
  Globe, EyeOff, Users, LayoutGrid, List, MoreVertical, 
  Copy, Sparkles, TrendingUp, AlertTriangle, ChevronRight,
  Bell, FileSpreadsheet, CheckCircle2, AlertCircle
} from 'lucide-react';
import Button from '@/components/ui-lms/Button';

// Mock participant avatar colors
const AVATAR_COLORS = [
  'bg-indigo-500 text-white',
  'bg-emerald-500 text-white',
  'bg-purple-500 text-white',
  'bg-rose-500 text-white',
  'bg-amber-500 text-white'
];

export default function EventsDashboard() {
  const navigate = useNavigate();
  const { events, deleteEvent, togglePublishEvent, registrations, createEvent } = useEvents();
  const { showToast } = useToast();
  
  // Dashboard state
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterOrganizer, setFilterOrganizer] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState('grid');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeTab, setActiveTab] = useState('All'); // All | Upcoming | Ongoing | Completed | Draft | Cancelled
  
  // Modal states
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }

  // Simulate loading skeleton
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  // Current Date string
  const currentDateString = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const total = events.length;
    
    const upcoming = events.filter((e) => {
      return e.status === 'Published' && e.date > today;
    }).length;
    
    const ongoing = events.filter((e) => {
      return e.status === 'Published' && e.date === today;
    }).length;

    const completed = events.filter((e) => {
      return e.date < today;
    }).length;
    
    const enrollments = registrations.filter(
      (r) => r.enrollmentStatus === 'Enrolled' || r.enrollmentStatus === 'Approved'
    ).length;

    const pending = registrations.filter((r) => r.enrollmentStatus === 'Enrolled').length;

    return { total, upcoming, ongoing, completed, enrollments, pending };
  }, [events, registrations]);

  // Extract metadata lists for filters
  const categories = useMemo(() => {
    const cats = new Set();
    events.forEach((ev) => {
      cats.add(ev.title.includes('AI') ? 'Artificial Intelligence' : ev.title.includes('Cloud') ? 'Cloud Native' : 'Modern Frontend');
    });
    return ['All', ...Array.from(cats)];
  }, [events]);

  const organizers = useMemo(() => {
    return ['All', 'Sarah Chen', 'James Wilson', 'Michael O\'Brien'];
  }, []);

  const getEventCategory = (title) => {
    if (title.includes('AI')) return 'Artificial Intelligence';
    if (title.includes('Cloud')) return 'Cloud Native';
    return 'Modern Frontend';
  };

  const getCategoryColor = (cat) => {
    if (cat === 'Artificial Intelligence') return 'bg-purple-150 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
    if (cat === 'Cloud Native') return 'bg-teal-150 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300';
    return 'bg-blue-150 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';
  };

  const getEnrolledList = (eventId) => {
    return registrations.filter(
      (r) => String(r.eventId) === String(eventId) && (r.enrollmentStatus === 'Enrolled' || r.enrollmentStatus === 'Approved')
    );
  };

  // Actions
  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await deleteEvent(deleteTarget.id);
      showToast('Event deleted successfully!', 'success');
      setDeleteTarget(null);
    }
  };

  const handleTogglePublish = async (id, status, title) => {
    await togglePublishEvent(id);
    const action = status === 'Published' ? 'unpublished' : 'published';
    showToast(`"${title}" ${action} successfully!`, 'success');
    setActiveMenuId(null);
  };

  const handleDuplicate = async (ev) => {
    const copy = {
      ...ev,
      title: `Copy of ${ev.title}`,
      status: 'Draft',
    };
    delete copy.id;
    await createEvent(copy);
    showToast(`"${ev.title}" duplicated as Draft!`, 'success');
    setActiveMenuId(null);
  };

  const handleExport = () => {
    showToast('Exporting event data (CSV mock download triggered)...', 'success');
  };

  // Filter and Sort Events
  const filteredEvents = useMemo(() => {
    let result = [...events];
    const today = new Date().toISOString().split('T')[0];

    // Status tab filters
    if (activeTab === 'Upcoming') {
      result = result.filter(e => e.status === 'Published' && e.date > today);
    } else if (activeTab === 'Ongoing') {
      result = result.filter(e => e.status === 'Published' && e.date === today);
    } else if (activeTab === 'Completed') {
      result = result.filter(e => e.date < today);
    } else if (activeTab === 'Draft') {
      result = result.filter(e => e.status === 'Draft');
    } else if (activeTab === 'Cancelled') {
      result = result.filter(e => e.status === 'Cancelled');
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          ev.location.toLowerCase().includes(q) ||
          (ev.description && ev.description.toLowerCase().includes(q))
      );
    }

    // Advanced Category filter
    if (filterCategory !== 'All') {
      result = result.filter((ev) => getEventCategory(ev.title) === filterCategory);
    }

    // Organizer filter
    if (filterOrganizer !== 'All') {
      result = result.filter(() => true); // Mock matches since we default all to Sarah Chen
    }

    // Date filter
    if (filterDate) {
      result = result.filter((ev) => ev.date === filterDate);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'name-desc') return b.title.localeCompare(a.title);
      
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      
      if (sortBy === 'date-asc') return timeA - timeB;
      if (sortBy === 'date-desc') return timeB - timeA;

      const enrolledA = getEnrolledList(a.id).length;
      const enrolledB = getEnrolledList(b.id).length;
      if (sortBy === 'enrollments-desc') return enrolledB - enrolledA;
      
      return 0;
    });

    return result;
  }, [events, activeTab, searchQuery, filterCategory, filterOrganizer, filterDate, sortBy, registrations]);

  return (
    <div className="flex min-h-screen flex-col bg-brand-surface text-brand-text-primary transition-colors duration-200">
      
      {/* 1. Page Header Section (Full-Width, aligned withrest of portal) */}
      <div className="flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-900 border-b border-brand-border">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            <span>Dashboard</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#6C1D5F] dark:text-purple-400">Events</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            Event Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage, monitor, and track all corporate webinars, hackathons, and developer masterclasses.
          </p>
          
          <div className="text-[10px] font-bold text-slate-400 pt-1">
            Today: <span className="text-[#6C1D5F] dark:text-purple-400 font-extrabold">{currentDateString}</span>
          </div>
        </div>

        {/* Header Gadgets and Quick Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Mock bell profile badge */}
          <div className="flex items-center gap-3 justify-end pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800 pr-3">
            <button className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-550 dark:text-slate-400 relative hover:bg-slate-50 dark:hover:bg-slate-850">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
            </button>
            <div className="h-9 w-9 rounded-full bg-[#6C1D5F] text-white flex items-center justify-center text-xs font-black" title="Admin User">
              AD
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-205 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Events
            </button>
            <Link to="/admin/events/enrollments">
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-205 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm">
                <Users className="h-4 w-4 text-[#6C1D5F]" /> Manage Enrollments
              </button>
            </Link>
            <Link to="/admin/events/create">
              <Button className="flex items-center justify-center gap-1.5 text-xs font-black bg-[#6C1D5F] hover:bg-[#84117C] text-white rounded-xl py-2 px-4 shadow-md transition-all">
                <Plus className="h-4 w-4" /> Create Event
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Content Area (Aligned padding: 32px px-8, 28px py-7) */}
      <div className="flex-1 px-8 py-7 space-y-6">
        
        {/* KPI metrics block */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-24 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse p-4 space-y-2">
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-6 w-1/3 bg-slate-350 dark:bg-slate-750 rounded"></div>
              </div>
            ))
          ) : (
            <>
              {/* Stat 1 */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Events</span>
                  <Calendar className="h-4 w-4 text-purple-650 shrink-0" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{stats.total}</h3>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-600 font-extrabold uppercase">
                  <TrendingUp className="h-3 w-3" /> +12% vs last month
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Upcoming</span>
                  <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{stats.upcoming}</h3>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-600 font-extrabold uppercase">
                  <TrendingUp className="h-3 w-3" /> +3 newly published
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ongoing</span>
                  <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{stats.ongoing}</h3>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-450 font-bold uppercase">
                  Running today
                </div>
              </div>

              {/* Stat 4 */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Completed</span>
                  <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{stats.completed}</h3>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-450 font-bold uppercase">
                  Archived logs
                </div>
              </div>

              {/* Stat 5 */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Enrolls</span>
                  <Users className="h-4 w-4 text-blue-600 shrink-0" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{stats.enrollments}</h3>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-600 font-extrabold uppercase">
                  <TrendingUp className="h-3 w-3" /> +18% growth
                </div>
              </div>

              {/* Stat 6 */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Pending Appr.</span>
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{stats.pending}</h3>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-rose-500 font-extrabold uppercase">
                  Action Required
                </div>
              </div>
            </>
          )}
        </div>

        {/* Filter tabs block */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex overflow-x-auto gap-4 -mb-px">
            {['All', 'Upcoming', 'Ongoing', 'Completed', 'Draft', 'Cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setActiveMenuId(null);
                }}
                className={`py-3 px-1 border-b-2 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                  (activeTab === tab)
                    ? 'border-[#6C1D5F] text-[#6C1D5F] dark:border-purple-400 dark:text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'All' ? 'All Events' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Controls, search, and sorting toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-4xl">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Search by event title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 dark:text-white placeholder-slate-400 focus:border-[#6C1D5F] focus:outline-none"
              />
            </div>

            {/* Category selection */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-705 dark:text-white focus:border-[#6C1D5F] focus:outline-none"
            >
              <option value="All">All Categories</option>
              {categories.filter(c => c !== 'All').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Organizer selection */}
            <select
              value={filterOrganizer}
              onChange={(e) => setFilterOrganizer(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-705 dark:text-white focus:border-[#6C1D5F] focus:outline-none"
            >
              <option value="All">All Organizers</option>
              {organizers.filter(o => o !== 'All').map((org) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>

            {/* Date selection */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-white focus:border-[#6C1D5F] focus:outline-none"
            />
          </div>

          {/* Sorters and Layout View Mode Toggles */}
          <div className="flex items-center gap-2 justify-between lg:justify-end">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-705 dark:text-white focus:border-[#6C1D5F] focus:outline-none"
            >
              <option value="date-desc">Newest Date</option>
              <option value="date-asc">Oldest Date</option>
              <option value="name-asc">Title (A-Z)</option>
              <option value="name-desc">Title (Z-A)</option>
              <option value="enrollments-desc">Enrollments</option>
            </select>

            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-950">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-[#6C1D5F] shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid Layout"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-[#6C1D5F] shadow-sm'
                    : 'text-slate-400 hover:text-slate-655'
                }`}
                title="List Layout"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Card listing block */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] bg-slate-50/50 dark:bg-slate-900/10">
            <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-750 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-white">No Events Found</h3>
            <p className="text-xs text-slate-400 mt-1">There are no events matching the active filter or tab categories.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEvents.map((ev) => {
              const isPublished = ev.status === 'Published';
              const cat = getEventCategory(ev.title);
              const enrolledList = getEnrolledList(ev.id);
              const enrolledCount = enrolledList.length;
              const maxCapacity = 100;
              const remainingSeats = maxCapacity - enrolledCount;
              const filledPercent = Math.min((enrolledCount / maxCapacity) * 100, 100);
              const isCompleted = new Date(ev.date) < new Date();
              const statusLabel = isCompleted ? 'Completed' : ev.status;

              return (
                <motion.div
                  layout
                  key={ev.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="group relative overflow-hidden rounded-[24px] border border-slate-205 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:border-[#6C1D5F]/55 dark:hover:border-purple-400/50 transition-all duration-305 flex flex-col justify-between"
                >
                  <div>
                    {/* Cover layout */}
                    <div className="relative h-40 bg-slate-950 overflow-hidden">
                      <img
                        src={ev.image || 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=800&auto=format&fit=crop&q=80'}
                        alt={ev.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent"></div>
                      
                      <div className="absolute top-4 left-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow-md ${
                            isCompleted
                              ? 'bg-slate-900/80 text-slate-350'
                              : isPublished
                              ? 'bg-emerald-500/90 text-white'
                              : 'bg-amber-500/90 text-white'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <div className="absolute bottom-4 left-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase shadow-sm ${getCategoryColor(cat)}`}>
                          {cat}
                        </span>
                      </div>

                      <div className="absolute top-4 right-4 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === ev.id ? null : ev.id);
                          }}
                          className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/95 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                        >
                          <MoreVertical className="h-4.5 w-4.5" />
                        </button>

                        {/* Card Dropdown Popover */}
                        {activeMenuId === ev.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                            <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 shadow-xl z-20 text-xs font-semibold text-slate-700 dark:text-slate-305">
                              <button
                                onClick={() => { navigate(`/admin/events/${ev.id}`); setActiveMenuId(null); }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                              >
                                <Eye className="h-3.5 w-3.5" /> View Agenda
                              </button>
                              <button
                                onClick={() => { navigate(`/admin/events/${ev.id}/edit`); setActiveMenuId(null); }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Edit Details
                              </button>
                              <button
                                onClick={() => { navigate(`/admin/events/enrollments`); setActiveMenuId(null); }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                              >
                                <Users className="h-3.5 w-3.5" /> View Enrollments
                              </button>
                              <button
                                onClick={() => handleDuplicate(ev)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                              >
                                <Copy className="h-3.5 w-3.5" /> Duplicate Event
                              </button>
                              <button
                                onClick={() => handleTogglePublish(ev.id, ev.status, ev.title)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-purple-650"
                              >
                                {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                                {isPublished ? 'Unpublish' : 'Publish'}
                              </button>
                              <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                              <button
                                onClick={() => { setDeleteTarget({ id: ev.id, title: ev.title }); setActiveMenuId(null); }}
                                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-455 text-rose-505"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete Event
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                      <div>
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-[#10B5A5]" /> MASTERCLASS SERIES
                        </h3>
                        <h2 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1 mt-0.5 group-hover:text-[#6C1D5F] dark:group-hover:text-purple-400 transition-colors">
                          {ev.title}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1 h-8">
                          {ev.description || 'No agenda parameters set.'}
                        </p>
                      </div>

                      {/* Detail attributes */}
                      <div className="space-y-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-350 border-t border-slate-100 dark:border-slate-850 pt-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-[#6C1D5F] dark:text-purple-400" />
                          <span>Date: {ev.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-[#6C1D5F] dark:text-purple-400" />
                          <span>Time: {ev.time || '10:00 AM'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-[#6C1D5F] dark:text-purple-400" />
                          <span className="truncate">Venue: {ev.location}</span>
                        </div>
                      </div>

                      {/* Deadline warning */}
                      <div className="text-[10px] uppercase font-black text-slate-450 border-t border-slate-100 dark:border-slate-850 pt-2 flex justify-between">
                        <span>Deadline</span>
                        <span className="text-rose-500 font-extrabold">{ev.registrationDeadline}</span>
                      </div>

                      {/* Progress bar and seat info */}
                      <div className="space-y-2 border-t border-slate-100 dark:border-slate-850 pt-3">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                          <span>Capacity: {maxCapacity}</span>
                          <span className="text-slate-700 dark:text-slate-300 font-black">
                            {remainingSeats} Seats Left
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#6C1D5F] to-[#10B5A5] h-full rounded-full transition-all duration-500"
                            style={{ width: `${filledPercent}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <div className="flex -space-x-2.5 overflow-hidden">
                            {enrolledList.slice(0, 3).map((reg, rIdx) => (
                              <div
                                key={reg.id}
                                className={`inline-flex items-center justify-center h-6 w-6 rounded-full border-2 border-white dark:border-slate-900 text-[8px] font-black uppercase ${AVATAR_COLORS[rIdx % AVATAR_COLORS.length]}`}
                                title={reg.studentName}
                              >
                                {reg.studentName.split(' ').map(n => n[0]).join('')}
                              </div>
                            ))}
                            {enrolledCount > 3 && (
                              <div className="inline-flex items-center justify-center h-6 w-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 text-[8px] font-black text-slate-500 dark:text-slate-400">
                                +{enrolledCount - 3}
                              </div>
                            )}
                            {enrolledCount === 0 && (
                              <span className="text-[10px] font-bold text-slate-450 italic">Be the first to join</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mt-auto">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-purple-900 text-white flex items-center justify-center text-[8px]">
                        SC
                      </div>
                      <span className="text-slate-655 dark:text-slate-355">Sarah Chen</span>
                    </div>
                    <span>Updated 1d ago</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Event Title</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Venue Details</th>
                    <th className="py-4 px-6">Organizer</th>
                    <th className="py-4 px-6">Enrollment Rate</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {filteredEvents.map((ev) => {
                    const isPublished = ev.status === 'Published';
                    const cat = getEventCategory(ev.title);
                    const enrolledCount = getEnrolledList(ev.id).length;
                    const isCompleted = new Date(ev.date) < new Date();
                    const statusLabel = isCompleted ? 'Completed' : ev.status;

                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={ev.image || 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=100&auto=format&fit=crop&q=80'}
                              alt={ev.title}
                              className="h-10 w-14 rounded-lg object-cover"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{ev.title}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Deadline: {ev.registrationDeadline}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${getCategoryColor(cat)}`}>
                            {cat}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div>{ev.date} @ {ev.time || '10:00 AM'}</div>
                          <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" /> {ev.location}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-550 dark:text-slate-355">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-purple-900 text-white flex items-center justify-center text-[8px]">
                              SC
                            </div>
                            <span>Sarah Chen</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1 w-32">
                            <div className="text-[10px] font-black flex justify-between text-slate-500">
                              <span>{enrolledCount} Enrolled</span>
                              <span>{100 - enrolledCount} Left</span>
                            </div>
                            <div className="w-full bg-slate-150 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div
                                className="bg-purple-600 h-full rounded-full"
                                style={{ width: `${Math.min(enrolledCount, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              isCompleted
                                ? 'bg-slate-100 text-slate-550'
                                : isPublished
                                ? 'bg-emerald-105 text-emerald-800'
                                : 'bg-amber-105 text-amber-800'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === ev.id ? null : ev.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {/* Dropdown Popover */}
                            {activeMenuId === ev.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 shadow-xl z-20 text-xs font-semibold text-slate-700 dark:text-slate-350">
                                  <button
                                    onClick={() => { navigate(`/admin/events/${ev.id}`); setActiveMenuId(null); }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> View Details
                                  </button>
                                  <button
                                    onClick={() => { navigate(`/admin/events/${ev.id}/edit`); setActiveMenuId(null); }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" /> Edit Details
                                  </button>
                                  <button
                                    onClick={() => { navigate(`/admin/events/enrollments`); setActiveMenuId(null); }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Users className="h-3.5 w-3.5" /> Enrollments
                                  </button>
                                  <button
                                    onClick={() => handleDuplicate(ev)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Copy className="h-3.5 w-3.5" /> Duplicate
                                  </button>
                                  <button
                                    onClick={() => handleTogglePublish(ev.id, ev.status, ev.title)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                                    {isPublished ? 'Unpublish' : 'Publish'}
                                  </button>
                                  <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                                  <button
                                    onClick={() => { setDeleteTarget({ id: ev.id, title: ev.title }); setActiveMenuId(null); }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-455 text-rose-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal Overlay */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] max-w-sm w-full p-6 space-y-6 shadow-2xl relative"
            >
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-6.5 w-6.5" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Event?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete <span className="font-extrabold text-slate-850 dark:text-white">"{deleteTarget.title}"</span>? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="w-full px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Delete Event
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
