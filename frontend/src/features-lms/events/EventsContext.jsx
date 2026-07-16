import { createContext, useContext, useState, useEffect } from 'react';
import api from '../../services-lms/api';

const EventsContext = createContext(null);

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch events and registrations from backend on mount
  const fetchData = async () => {
    try {
      setLoading(true);
      const evResponse = await api.get('/events');
      if (evResponse.data && evResponse.data.data) {
        setEvents(evResponse.data.data);
      }

      const regResponse = await api.get('/events/registrations');
      if (regResponse.data && regResponse.data.data) {
        setRegistrations(regResponse.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch events data from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createEvent = async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      if (response.data && response.data.data) {
        const newEvent = response.data.data;
        setEvents((prev) => [newEvent, ...prev]);
        return newEvent;
      }
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const updateEvent = async (id, updatedData) => {
    try {
      const response = await api.put(`/events/${id}`, updatedData);
      if (response.data && response.data.data) {
        const saved = response.data.data;
        setEvents((prev) =>
          prev.map((ev) => (String(ev.id) === String(id) ? saved : ev))
        );
      }
    } catch (err) {
      console.error('Failed to update event:', err);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.delete(`/events/${id}`);
      setEvents((prev) => prev.filter((ev) => String(ev.id) !== String(id)));
      setRegistrations((prev) => prev.filter((reg) => String(reg.eventId) !== String(id)));
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const togglePublishEvent = async (id) => {
    const target = events.find((ev) => String(ev.id) === String(id));
    if (!target) return;

    const nextStatus = target.status === 'Published' ? 'Draft' : 'Published';
    await updateEvent(id, { ...target, status: nextStatus });
  };

  const registerForEvent = async (eventId, studentInfo) => {
    try {
      const response = await api.post(`/events/${eventId}/register`);
      if (response.data && response.data.data) {
        // Refresh registrations
        const regResponse = await api.get('/events/registrations');
        if (regResponse.data && regResponse.data.data) {
          setRegistrations(regResponse.data.data);
        }
        return true;
      }
    } catch (err) {
      console.error('Failed to register for event:', err);
    }
    return false;
  };

  const cancelEnrollment = async (eventId, email) => {
    try {
      await api.delete(`/events/${eventId}/register`);
      // Refresh registrations
      const regResponse = await api.get('/events/registrations');
      if (regResponse.data && regResponse.data.data) {
        setRegistrations(regResponse.data.data);
      }
    } catch (err) {
      console.error('Failed to cancel enrollment:', err);
    }
  };

  const updateEnrollmentStatus = async (regId, statusType, value) => {
    try {
      const response = await api.put(`/events/registrations/${regId}`, {
        statusType,
        value,
      });
      if (response.data && response.data.data) {
        const updated = response.data.data;
        setRegistrations((prev) =>
          prev.map((reg) => (String(reg.id) === String(regId) ? updated : reg))
        );
      }
    } catch (err) {
      console.error('Failed to update enrollment status:', err);
    }
  };

  const isRegistered = (eventId, email) => {
    if (!email) return false;
    return registrations.some(
      (reg) =>
        String(reg.eventId) === String(eventId) &&
        reg.studentEmail === email &&
        (reg.enrollmentStatus === 'Enrolled' || reg.enrollmentStatus === 'Approved' || reg.enrollmentStatus === 'Registered')
    );
  };

  return (
    <EventsContext.Provider
      value={{
        events,
        registrations,
        loading,
        createEvent,
        updateEvent,
        deleteEvent,
        togglePublishEvent,
        registerForEvent,
        cancelEnrollment,
        updateEnrollmentStatus,
        isRegistered,
        refreshData: fetchData,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}
