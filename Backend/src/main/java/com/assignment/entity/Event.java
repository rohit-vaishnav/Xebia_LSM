package com.assignment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String image;

    @Column(nullable = false)
    private String date;

    private String time;

    private String registrationDeadline;

    @Column(nullable = false)
    private String location;

    private String category;
    private String organizer;
    private String speaker;
    private String mode;
    private String meetingPlatform;
    private String meetingLink;
    private String registrationType;
    private String registrationFee;
    private String venueName;
    private String venueAddress;
    private String venueMapsLink;
    private String registrationRequired;
    private Integer maxParticipants;
    private String startTime;
    private String endTime;

    @Builder.Default
    private String status = "Draft";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
