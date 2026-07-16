package com.assignment.controller;

import com.assignment.dto.response.ApiResponse;
import com.assignment.entity.Student;
import com.assignment.entity.Submission;
import com.assignment.repository.StudentRepository;
import com.assignment.repository.SubmissionRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student/leaderboard")
@RequiredArgsConstructor
public class StudentLeaderboardController {

    private final StudentRepository studentRepository;
    private final SubmissionRepository submissionRepository;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LeaderboardEntry {
        private Long studentId;
        private String name;
        private String email;
        private String batchName;
        private double quizScore;
        private double assignmentScore;
        private double points;
        private int badges;
        private double hours;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LeaderboardEntry>>> getLeaderboard() {
        List<Student> students = studentRepository.findAll();
        
        List<LeaderboardEntry> leaderboard = students.stream().map(s -> {
            List<Submission> submissions = submissionRepository.findByStudentId(s.getId());
            
            double quizSum = 0;
            double assignmentSum = 0;
            
            for (Submission sub : submissions) {
                if (sub.getMarks() != null) {
                    if (sub.getAssignment() != null && sub.getAssignment().getAssignmentType() == com.assignment.enums.AssignmentType.QUIZ) {
                        quizSum += sub.getMarks();
                    } else {
                        assignmentSum += sub.getMarks();
                    }
                }
            }
            
            double points = quizSum + assignmentSum;
            
            int badges = (int) (submissions.size() * 1.5 + (points > 80 ? 2 : 0));
            double hours = 5.0 + submissions.size() * 2.3 + (points * 0.1);
            hours = Math.round(hours * 10.0) / 10.0;

            return LeaderboardEntry.builder()
                    .studentId(s.getId())
                    .name(s.getFullName())
                    .email(s.getEmail())
                    .batchName(s.getBatch() != null ? s.getBatch().getBatchName() : "General")
                    .quizScore(quizSum)
                    .assignmentScore(assignmentSum)
                    .points(points)
                    .badges(badges)
                    .hours(hours)
                    .build();
        }).collect(Collectors.toList());

        leaderboard.sort((a, b) -> Double.compare(b.getPoints(), a.getPoints()));

        return ResponseEntity.ok(ApiResponse.success("Leaderboard retrieved successfully", leaderboard));
    }
}
