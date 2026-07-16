import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvents } from './EventsContext';
import { useToast } from '@/hooks-lms/useToast';
import { ArrowLeft, Image, Save, Globe, X, ChevronRight } from 'lucide-react';
import Button from '@/components/ui-lms/Button';

export default function CreateEventPage() {
  const id = useParams().id;
  const navigate = useNavigate();
  const { events, createEvent, updateEvent } = useEvents();
  const { showToast } = useToast();

  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    date: '',
    time: '',
    registrationDeadline: '',
    location: '',
    status: 'Draft',
    category: '',
    organizer: '',
    speaker: '',
    mode: 'Virtual',
    meetingPlatform: 'Google Meet',
    meetingLink: '',
    registrationType: 'Free',
    registrationFee: '',
    venueName: '',
    venueAddress: '',
    venueMapsLink: '',
    registrationRequired: 'No',
    maxParticipants: '',
    startTime: '',
    endTime: '',
  });

  // Load event if editing
  useEffect(() => {
    if (isEditMode) {
      const existing = events.find((ev) => String(ev.id) === String(id));
      if (existing) {
        setFormData({
          title: existing.title || '',
          description: existing.description || '',
          image: existing.image || '',
          date: existing.date || '',
          time: existing.time || '',
          registrationDeadline: existing.registrationDeadline || '',
          location: existing.location || '',
          status: existing.status || 'Draft',
          category: existing.category || '',
          organizer: existing.organizer || '',
          speaker: existing.speaker || '',
          mode: existing.mode || 'Virtual',
          meetingPlatform: existing.meetingPlatform || 'Google Meet',
          meetingLink: existing.meetingLink || '',
          registrationType: existing.registrationType || 'Free',
          registrationFee: existing.registrationFee || '',
          venueName: existing.venueName || '',
          venueAddress: existing.venueAddress || '',
          venueMapsLink: existing.venueMapsLink || '',
          registrationRequired: existing.registrationRequired || 'No',
          maxParticipants: existing.maxParticipants || '',
          startTime: existing.startTime || '',
          endTime: existing.endTime || '',
        });
      } else {
        showToast('Event not found', 'error');
        navigate('/admin/events');
      }
    }
  }, [id, isEditMode, events, navigate, showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Auto-set location fallback for legacy backend check compatibility
      if (name === 'mode' || name === 'venueName' || name === 'meetingPlatform') {
        if (next.mode === 'Virtual') {
          next.location = 'Online - ' + next.meetingPlatform;
        } else {
          next.location = next.venueName || prev.location || 'In-Person Venue';
        }
      }
      return next;
    });
  };

  const handleSave = async (status) => {
    // Fill fallback location check if still empty
    let loc = formData.location;
    if (!loc) {
      if (formData.mode === 'Virtual') {
        loc = 'Online - ' + formData.meetingPlatform;
      } else {
        loc = formData.venueName || 'In-Person Venue';
      }
    }

    if (!formData.title || !formData.date || !loc) {
      showToast('Please fill in Title and Date.', 'error');
      return;
    }

    const payload = { ...formData, location: loc, status };

    if (isEditMode) {
      await updateEvent(id, payload);
      showToast(`Event updated and saved as ${status}!`, 'success');
    } else {
      await createEvent(payload);
      showToast(`Event created and saved as ${status}!`, 'success');
    }

    navigate('/admin/events');
  };

  const triggerMockImageUpload = () => {
    const topics = ['tech', 'code', 'office', 'design', 'web', 'react'];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const randomId = Math.floor(Math.random() * 1000);
    const mockUrl = `https://images.unsplash.com/photo-${randomId % 2 === 0 ? '1591453089816-0fbb971b454c' : '1517694712202-14dd9538aa97'}?w=800&auto=format&fit=crop&q=60`;
    setFormData((prev) => ({ ...prev, image: mockUrl }));
    showToast('Mock Banner uploaded successfully!', 'success');
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-surface text-brand-text-primary transition-colors duration-200">
      
      {/* 1. Page Header (Full-Width, aligned with rest of portal) */}
      <div className="flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-900 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/events')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-205 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <span>Events</span>
              <ChevronRight className="h-2.5 w-2.5" />
              <span className="text-[#6C1D5F] dark:text-purple-400">{isEditMode ? 'Edit' : 'Create'}</span>
            </div>
            
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditMode ? 'Edit Event Details' : 'Create New Event'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEditMode ? 'Make adjustments to the event schedule or metadata.' : 'Add details to invite learners to a new workshop.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Content Area (Aligned padding: 32px px-8, 28px py-7) */}
      <div className="flex-1 px-8 py-7 bg-brand-surface">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Form Container */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* Banner Preview & Upload */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Event Banner Image</label>
              <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-48 overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                {formData.image ? (
                  <>
                    <img src={formData.image} alt="Banner Preview" className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, image: '' }))}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black text-white backdrop-blur-sm transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <Image className="h-8 w-8 text-slate-400 mx-auto" />
                    <div className="text-xs">
                      <button
                        type="button"
                        onClick={triggerMockImageUpload}
                        className="font-bold text-[#6C1D5F] hover:underline"
                      >
                        Click to upload mock image
                      </button>
                      <span className="text-slate-400"> or enter a URL below</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Supported formats: PNG, JPG, WebP (Max 2MB)</p>
                  </div>
                )}
              </div>
              
              <input
                type="text"
                name="image"
                placeholder="Or paste banner image URL here..."
                value={formData.image}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#6C1D5F] dark:text-purple-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                Basic Information
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Event Title *</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="e.g. AI Workshop 2026"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Event Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Provide a detailed description of the event agenda..."
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Event Category</label>
                  <input
                    type="text"
                    name="category"
                    placeholder="e.g. Technology, Workshop, Webinar"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Organizer</label>
                  <input
                    type="text"
                    name="organizer"
                    placeholder="e.g. Xebia HR Team"
                    value={formData.organizer}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Speaker / Host (Optional)</label>
                  <input
                    type="text"
                    name="speaker"
                    placeholder="e.g. John Doe (Solutions Architect)"
                    value={formData.speaker}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Schedule */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-[#6C1D5F] dark:text-purple-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                Event Schedule
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Event Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Event Time / General duration</label>
                  <input
                    type="text"
                    name="time"
                    placeholder="e.g. 10:00 AM or 14:00 PM"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Event Mode */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-[#6C1D5F] dark:text-purple-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                Event Mode & Location
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Event Mode</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        value="Virtual"
                        checked={formData.mode === 'Virtual'}
                        onChange={handleChange}
                        className="text-[#6C1D5F] focus:ring-[#6C1D5F]"
                      />
                      Virtual (Online)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        value="Offline"
                        checked={formData.mode === 'Offline'}
                        onChange={handleChange}
                        className="text-[#6C1D5F] focus:ring-[#6C1D5F]"
                      />
                      Offline (In-Person)
                    </label>
                  </div>
                </div>

                {formData.mode === 'Virtual' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Meeting Platform</label>
                      <select
                        name="meetingPlatform"
                        value={formData.meetingPlatform}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="Google Meet">Google Meet</option>
                        <option value="Zoom">Zoom</option>
                        <option value="Teams">Teams</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Meeting Link</label>
                      <input
                        type="url"
                        name="meetingLink"
                        placeholder="https://meet.google.com/abc-defg-hij"
                        value={formData.meetingLink}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Registration Type</label>
                        <div className="flex gap-4 pt-1.5">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="registrationType"
                              value="Free"
                              checked={formData.registrationType === 'Free'}
                              onChange={handleChange}
                              className="text-[#6C1D5F] focus:ring-[#6C1D5F]"
                            />
                            Free
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="registrationType"
                              value="Paid"
                              checked={formData.registrationType === 'Paid'}
                              onChange={handleChange}
                              className="text-[#6C1D5F] focus:ring-[#6C1D5F]"
                            />
                            Paid
                          </label>
                        </div>
                      </div>

                      {formData.registrationType === 'Paid' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Registration Fee</label>
                          <input
                            type="text"
                            name="registrationFee"
                            placeholder="e.g. $49 or ₹2999"
                            value={formData.registrationFee}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Venue Name</label>
                      <input
                        type="text"
                        name="venueName"
                        placeholder="e.g. Xebia Auditorium Gurgaon"
                        value={formData.venueName}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Google Maps Link</label>
                      <input
                        type="url"
                        name="venueMapsLink"
                        placeholder="https://maps.google.com/..."
                        value={formData.venueMapsLink}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Venue Address</label>
                      <input
                        type="text"
                        name="venueAddress"
                        placeholder="Full physical address..."
                        value={formData.venueAddress}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Event Location * (Fallback text summary)</label>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. Gurgaon office / Online Zoom"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Registration controls */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-[#6C1D5F] dark:text-purple-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                Registration Management
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Registration Required</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="registrationRequired"
                        value="Yes"
                        checked={formData.registrationRequired === 'Yes'}
                        onChange={handleChange}
                        className="text-[#6C1D5F] focus:ring-[#6C1D5F]"
                      />
                      Yes (Limit and track bookings)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="registrationRequired"
                        value="No"
                        checked={formData.registrationRequired === 'No'}
                        onChange={handleChange}
                        className="text-[#6C1D5F] focus:ring-[#6C1D5F]"
                      />
                      No (Open event)
                    </label>
                  </div>
                </div>

                {formData.registrationRequired === 'Yes' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Last Date of Registration</label>
                      <input
                        type="date"
                        name="registrationDeadline"
                        value={formData.registrationDeadline}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Maximum Participants</label>
                      <input
                        type="number"
                        name="maxParticipants"
                        placeholder="e.g. 100"
                        min="1"
                        value={formData.maxParticipants}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
 
            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-slate-105 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigate('/admin/events')}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={() => handleSave('Draft')}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" /> Save as Draft
              </button>

              <button
                type="button"
                onClick={() => handleSave('Published')}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#6C1D5F] hover:bg-[#84117C] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Globe className="h-4 w-4" /> Publish Event
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
