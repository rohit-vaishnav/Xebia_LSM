import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from './EventsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '@/hooks-lms/useToast';
import { Calendar, Clock, MapPin, Search, CheckCircle, ArrowRight, X } from 'lucide-react';
import Button from '@/components/ui-lms/Button';

export default function StudentEventsPage() {
  const navigate = useNavigate();
  const { events, registerForEvent, isRegistered, cancelEnrollment } = useEvents();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Modal registration state
  const [registerEvent, setRegisterEvent] = useState(null);
  const [modalForm, setModalForm] = useState({ fullName: '', email: '', mobile: '' });
  const [formErrors, setFormErrors] = useState({});

  // Filter only published events
  const publishedEvents = useMemo(() => {
    return events.filter((ev) => ev.status === 'Published');
  }, [events]);

  const filteredEvents = useMemo(() => {
    return publishedEvents.filter(
      (ev) =>
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [publishedEvents, searchQuery]);

  const openRegistrationModal = (ev) => {
    if (!user) {
      showToast('You must be logged in to register.', 'error');
      return;
    }
    setRegisterEvent(ev);
    setModalForm({
      fullName: user.fullName || user.name || '',
      email: user.email || '',
      mobile: user.phone || '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!modalForm.fullName || modalForm.fullName.trim().length < 3) {
      errors.fullName = 'Full Name must be at least 3 characters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!modalForm.email || !emailRegex.test(modalForm.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    const mobileRegex = /^\d{10}$/;
    if (!modalForm.mobile || !mobileRegex.test(modalForm.mobile)) {
      errors.mobile = 'Mobile number must be exactly 10 digits.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const studentInfo = {
      fullName: modalForm.fullName,
      email: modalForm.email,
      studentId: user?.studentId || 'STU-2026-001',
      mobile: modalForm.mobile,
    };

    const success = await registerForEvent(registerEvent.id, studentInfo);
    if (success) {
      showToast(`Successfully enrolled in "${registerEvent.title}"!`, 'success');
      setRegisterEvent(null);
    } else {
      showToast('Registration failed or already registered.', 'error');
    }
  };

  const handleCancel = async (eventId, title) => {
    if (!user) return;
    if (window.confirm(`Are you sure you want to cancel your enrollment for "${title}"?`)) {
      await cancelEnrollment(eventId, user.email);
      showToast(`Enrollment for "${title}" cancelled.`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="rounded-[24px] bg-gradient-to-r from-purple-900 to-indigo-950 p-6 md:p-8 text-white relative overflow-hidden shadow-md">
        <div className="relative z-10 space-y-2 max-w-lg">
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-white/20 tracking-wider">
            Xebia Workshops
          </span>
          <h1 className="text-xl md:text-2xl font-black">Xebia Events & Masterclasses</h1>
          <p className="text-xs text-purple-200 leading-relaxed">
            Enhance your career. Join interactive coding bootcamps, architectural summits, and system-design events led by Xebia specialists.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-6 translate-x-6 shrink-0 select-none">
          <Calendar className="h-64 w-64" />
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-slate-400" />
        </span>
        <input
          type="text"
          placeholder="Search upcoming events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/10">
          <Calendar className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-white">No Upcoming Events</h3>
          <p className="text-xs text-slate-450 mt-1">There are no matching events scheduled at this moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((ev) => {
            const registered = isRegistered(ev.id, user?.email);

            return (
              <div
                key={ev.id}
                className="overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Banner Photo */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img
                      src={ev.image || 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=800&auto=format&fit=crop&q=80'}
                      alt={ev.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full text-[9px] font-extrabold uppercase bg-white/90 text-purple-950 backdrop-blur-md shadow-sm">
                        Masterclass
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{ev.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed h-8">
                      {ev.description || 'No description provided.'}
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-850 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        <span>{ev.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        <span>{ev.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="p-5 pt-0 mt-auto flex flex-col gap-2">
                  {/* Join / Status Button */}
                  {registered ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white border border-transparent opacity-100 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" /> Enrolled
                    </button>
                  ) : (
                    <button
                      onClick={() => openRegistrationModal(ev)}
                      className="w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm bg-[#7C3AED] hover:bg-purple-700 text-white cursor-pointer hover:shadow-md"
                    >
                      Enroll Now
                    </button>
                  )}

                  {/* Details Link */}
                  <button
                    onClick={() => navigate(`/student/events/${ev.id}`)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    View Agenda Details <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration Modal Overlay */}
      {registerEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Register for Event</h3>
              <button
                onClick={() => setRegisterEvent(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Read-Only Event Information */}
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 space-y-2">
              <p className="text-xs font-black text-purple-950 dark:text-purple-300 uppercase tracking-wider">Event Details</p>
              <div className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-350">
                <p><span className="text-slate-400 font-normal">Name:</span> {registerEvent.title}</p>
                <p><span className="text-slate-400 font-normal">Date:</span> {registerEvent.date}</p>
                <p><span className="text-slate-400 font-normal">Mode:</span> {registerEvent.mode || 'Virtual'}</p>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={modalForm.fullName}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                {formErrors.fullName && <p className="text-[10px] text-red-500 font-bold">{formErrors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={modalForm.email}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                {formErrors.email && <p className="text-[10px] text-red-500 font-bold">{formErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mobile Number *</label>
                <input
                  type="tel"
                  name="mobile"
                  placeholder="e.g. 9876543210"
                  value={modalForm.mobile}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, mobile: e.target.value }))}
                  className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                {formErrors.mobile && <p className="text-[10px] text-red-500 font-bold">{formErrors.mobile}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRegisterEvent(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#7C3AED] hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Submit Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
