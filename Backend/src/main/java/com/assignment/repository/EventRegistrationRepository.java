package com.assignment.repository;

import com.assignment.entity.EventRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventRegistrationRepository extends JpaRepository<EventRegistration, Long> {
    List<EventRegistration> findByEventId(Long eventId);
    Optional<EventRegistration> findByEventIdAndStudentId(Long eventId, Long studentId);
    Optional<EventRegistration> findByEventIdAndStudentEmail(Long eventId, String studentEmail);
    List<EventRegistration> findByStudentEmail(String studentEmail);
    boolean existsByEventIdAndStudentId(Long eventId, Long studentId);
    long countByEventId(Long eventId);
}
