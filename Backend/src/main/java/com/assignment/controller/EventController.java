package com.assignment.controller;

import com.assignment.response.ApiResponse;
import com.assignment.entity.Event;
import com.assignment.entity.EventRegistration;
import com.assignment.entity.Student;
import com.assignment.repository.EventRegistrationRepository;
import com.assignment.repository.EventRepository;
import com.assignment.repository.StudentRepository;
import com.assignment.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventRepository eventRepository;
    private final EventRegistrationRepository eventRegistrationRepository;
    private final StudentRepository studentRepository;

    @jakarta.annotation.PostConstruct
    public void initEvents() {
        if (eventRepository.count() == 0) {
            Event ev1 = Event.builder()
                    .title("AI Workshop 2026")
                    .description("Hands-on workshop on Artificial Intelligence and Large Language Models. Learn how to design prompts, build agentic systems, and deploy models to production.")
                    .image("https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=800&auto=format&fit=crop&q=60")
                    .date("2026-07-20")
                    .time("10:00 AM")
                    .registrationDeadline("2026-07-18")
                    .location("Xebia Auditorium")
                    .mode("Offline")
                    .venueName("Xebia Auditorium")
                    .registrationRequired("Yes")
                    .maxParticipants(100)
                    .status("Published")
                    .build();

            Event ev2 = Event.builder()
                    .title("Cloud Native Summit")
                    .description("A comprehensive summit on Kubernetes, Docker, and Microservices. Join global developers as we discuss the future of serverless computing and architecture scaling.")
                    .image("https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60")
                    .date("2026-08-25")
                    .time("09:00 AM")
                    .registrationDeadline("2026-08-20")
                    .location("Online - Zoom")
                    .mode("Virtual")
                    .meetingPlatform("Zoom")
                    .meetingLink("https://zoom.us/j/123456789")
                    .registrationRequired("Yes")
                    .maxParticipants(500)
                    .status("Draft")
                    .build();

            Event ev3 = Event.builder()
                    .title("React Modern Design Patterns")
                    .description("Deep dive into custom React Hooks, context state management, rendering optimization, and advanced styling tricks with Tailwind and CSS variables.")
                    .image("https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=60")
                    .date("2026-09-05")
                    .time("02:00 PM")
                    .registrationDeadline("2026-09-02")
                    .location("Conference Hall B")
                    .mode("Offline")
                    .venueName("Conference Hall B")
                    .registrationRequired("Yes")
                    .maxParticipants(50)
                    .status("Published")
                    .build();

            eventRepository.saveAll(Arrays.asList(ev1, ev2, ev3));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse> getAllEvents() {
        List<Event> events = eventRepository.findAll();
        // Sort by ID descending (newest first)
        events.sort((a, b) -> b.getId().compareTo(a.getId()));
        return ResponseEntity.ok(new ApiResponse("Events retrieved successfully", events));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getEventById(@PathVariable Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        return ResponseEntity.ok(new ApiResponse("Event retrieved successfully", event));
    }

    @PostMapping
    public ResponseEntity<ApiResponse> createEvent(@RequestBody Event event) {
        Event saved = eventRepository.save(event);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse("Event created successfully", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateEvent(@PathVariable Long id, @RequestBody Event eventDetails) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        event.setTitle(eventDetails.getTitle());
        event.setDescription(eventDetails.getDescription());
        event.setImage(eventDetails.getImage());
        event.setDate(eventDetails.getDate());
        event.setTime(eventDetails.getTime());
        event.setRegistrationDeadline(eventDetails.getRegistrationDeadline());
        event.setLocation(eventDetails.getLocation());
        event.setCategory(eventDetails.getCategory());
        event.setOrganizer(eventDetails.getOrganizer());
        event.setSpeaker(eventDetails.getSpeaker());
        event.setMode(eventDetails.getMode());
        event.setMeetingPlatform(eventDetails.getMeetingPlatform());
        event.setMeetingLink(eventDetails.getMeetingLink());
        event.setRegistrationType(eventDetails.getRegistrationType());
        event.setRegistrationFee(eventDetails.getRegistrationFee());
        event.setVenueName(eventDetails.getVenueName());
        event.setVenueAddress(eventDetails.getVenueAddress());
        event.setVenueMapsLink(eventDetails.getVenueMapsLink());
        event.setRegistrationRequired(eventDetails.getRegistrationRequired());
        event.setMaxParticipants(eventDetails.getMaxParticipants());
        event.setStartTime(eventDetails.getStartTime());
        event.setEndTime(eventDetails.getEndTime());
        event.setStatus(eventDetails.getStatus());

        Event saved = eventRepository.save(event);
        return ResponseEntity.ok(new ApiResponse("Event updated successfully", saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteEvent(@PathVariable Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        
        // Delete all registrations associated with this event first
        List<EventRegistration> registrations = eventRegistrationRepository.findByEventId(id);
        eventRegistrationRepository.deleteAll(registrations);

        eventRepository.delete(event);
        return ResponseEntity.ok(new ApiResponse("Event deleted successfully", null));
    }

    @PostMapping("/{eventId}/register")
    public ResponseEntity<ApiResponse> registerForEvent(
            @PathVariable Long eventId,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse("User not authenticated", null));
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + eventId));

        Student student = studentRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        // 1. Prevent duplicate registrations
        Optional<EventRegistration> existing = eventRegistrationRepository.findByEventIdAndStudentId(eventId, student.getId());
        if (existing.isPresent()) {
            throw new IllegalArgumentException("You are already registered for this event");
        }

        // 2. Prevent registration after deadline
        if (event.getRegistrationDeadline() != null && !event.getRegistrationDeadline().isBlank()) {
            try {
                LocalDate deadline = LocalDate.parse(event.getRegistrationDeadline());
                if (LocalDate.now().isAfter(deadline)) {
                    throw new IllegalArgumentException("Registration deadline has passed");
                }
            } catch (Exception e) {
                // Ignore parsing errors
            }
        }

        // 3. Prevent registration if maximum participants reached
        if (event.getMaxParticipants() != null && event.getMaxParticipants() > 0) {
            long currentCount = eventRegistrationRepository.countByEventId(eventId);
            if (currentCount >= event.getMaxParticipants()) {
                throw new IllegalArgumentException("Event has reached its maximum participant limit");
            }
        }

        EventRegistration registration = EventRegistration.builder()
                .event(event)
                .student(student)
                .status("Registered")
                .build();

        eventRegistrationRepository.save(registration);

        long updatedCount = eventRegistrationRepository.countByEventId(eventId);

        Map<String, Object> data = new HashMap<>();
        data.put("eventId", eventId);
        data.put("registrationCount", updatedCount);
        data.put("status", "Registered");

        return ResponseEntity.ok(new ApiResponse("Successfully registered for the event", data));
    }

    @DeleteMapping("/{eventId}/register")
    public ResponseEntity<ApiResponse> cancelRegistration(
            @PathVariable Long eventId,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse("User not authenticated", null));
        }

        Student student = studentRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        EventRegistration registration = eventRegistrationRepository.findByEventIdAndStudentId(eventId, student.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        eventRegistrationRepository.delete(registration);

        long updatedCount = eventRegistrationRepository.countByEventId(eventId);

        Map<String, Object> data = new HashMap<>();
        data.put("eventId", eventId);
        data.put("registrationCount", updatedCount);
        data.put("status", "Unregistered");

        return ResponseEntity.ok(new ApiResponse("Registration cancelled successfully", data));
    }

    private Map<String, Object> mapRegistration(EventRegistration reg) {
        Student s = reg.getStudent();
        Event ev = reg.getEvent();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", String.valueOf(reg.getId()));
        map.put("eventId", ev.getId());
        map.put("eventName", ev.getTitle());
        map.put("studentId", "STU-2026-" + String.format("%03d", s.getId()));
        map.put("studentName", s.getFullName());
        map.put("studentEmail", s.getEmail());
        map.put("enrollmentDateTime", reg.getRegisteredAt() != null ? reg.getRegisteredAt().toString() : java.time.LocalDateTime.now().toString());
        map.put("enrollmentStatus", reg.getStatus()); // Enrolled, Approved, Rejected, Cancelled
        map.put("attendanceStatus", reg.getAttendanceStatus()); // Pending, Present, Absent
        return map;
    }

    @GetMapping("/registrations")
    public ResponseEntity<ApiResponse> getAllRegistrations() {
        List<EventRegistration> registrations = eventRegistrationRepository.findAll();
        List<Map<String, Object>> result = registrations.stream()
                .map(this::mapRegistration)
                .collect(Collectors.toList());
        return ResponseEntity.ok(new ApiResponse("All registrations retrieved successfully", result));
    }

    @PutMapping("/registrations/{regId}")
    public ResponseEntity<ApiResponse> updateRegistrationStatus(
            @PathVariable Long regId,
            @RequestBody Map<String, String> payload
    ) {
        EventRegistration reg = eventRegistrationRepository.findById(regId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found with id: " + regId));

        if (payload.containsKey("enrollmentStatus")) {
            reg.setStatus(payload.get("enrollmentStatus"));
        }
        if (payload.containsKey("statusType") && payload.containsKey("value")) {
            String statusType = payload.get("statusType");
            String value = payload.get("value");
            if ("enrollmentStatus".equals(statusType)) {
                reg.setStatus(value);
            } else if ("attendanceStatus".equals(statusType)) {
                reg.setAttendanceStatus(value);
            }
        }
        if (payload.containsKey("attendanceStatus")) {
            reg.setAttendanceStatus(payload.get("attendanceStatus"));
        }

        EventRegistration saved = eventRegistrationRepository.save(reg);
        return ResponseEntity.ok(new ApiResponse("Registration updated successfully", mapRegistration(saved)));
    }

    @GetMapping("/{eventId}/registrations")
    public ResponseEntity<ApiResponse> getRegisteredStudents(@PathVariable Long eventId) {
        List<EventRegistration> registrations = eventRegistrationRepository.findByEventId(eventId);
        List<Map<String, Object>> result = registrations.stream()
                .map(this::mapRegistration)
                .collect(Collectors.toList());
        return ResponseEntity.ok(new ApiResponse("Registered students retrieved successfully", result));
    }
}
