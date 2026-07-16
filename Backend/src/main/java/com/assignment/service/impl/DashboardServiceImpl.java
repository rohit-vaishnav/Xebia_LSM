package com.assignment.service.impl;

import com.assignment.dto.response.StudentDashboardResponse;
import com.assignment.dto.response.TeacherDashboardResponse;
import com.assignment.entity.Assignment;
import com.assignment.entity.Student;
import com.assignment.entity.Submission;
import com.assignment.entity.Teacher;
import com.assignment.enums.AssignmentStatus;
import com.assignment.exception.ResourceNotFoundException;
import com.assignment.repository.AssignmentRepository;
import com.assignment.repository.BatchRepository;
import com.assignment.repository.StudentRepository;
import com.assignment.repository.SubmissionRepository;
import com.assignment.repository.TeacherRepository;
import com.assignment.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final BatchRepository batchRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;

    @Override
    @Transactional(readOnly = true)
    public TeacherDashboardResponse getTeacherDashboard(String teacherEmail) {
        Teacher teacher = teacherRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher profile not found"));
        if (teacher.getRole() != com.assignment.enums.Role.TEACHER) {
            throw new com.assignment.exception.UnauthorizedException("Access Denied: Only teachers can access this dashboard");
        }

        Long teacherId = teacher.getId();

        long totalBatches = batchRepository.countByTeacherId(teacherId);
        long totalStudents = studentRepository.countByTeacherId(teacherId);
        long totalAssignments = assignmentRepository.countByTeacherId(teacherId);
        long activeAssignments = assignmentRepository.countByTeacherIdAndStatus(teacherId, AssignmentStatus.ACTIVE);
        long completedAssignments = assignmentRepository.countByTeacherIdAndStatus(teacherId, AssignmentStatus.COMPLETED);

        List<Assignment> recentList = assignmentRepository.findTop5ByTeacherIdOrderByCreatedAtDesc(teacherId);
        List<TeacherDashboardResponse.RecentAssignment> recentAssignments = recentList.stream()
                .map(a -> TeacherDashboardResponse.RecentAssignment.builder()
                        .id(a.getId())
                        .title(a.getTitle())
                        .batch(a.getBatch() != null ? a.getBatch().getBatchName() : "Draft")
                        .dueDate(a.getDueDate().toString())
                        .build())
                .collect(Collectors.toList());

        List<Assignment> upcomingList = assignmentRepository
                .findByTeacherIdAndDueDateGreaterThanEqualOrderByDueDateAscDueTimeAsc(teacherId, LocalDate.now());
        // Limit to 5
        List<TeacherDashboardResponse.UpcomingDeadline> upcomingDeadlines = upcomingList.stream()
                .limit(5)
                .map(a -> TeacherDashboardResponse.UpcomingDeadline.builder()
                        .assignmentId(a.getId())
                        .title(a.getTitle())
                        .dueDate(a.getDueDate().toString())
                        .build())
                .collect(Collectors.toList());

        return TeacherDashboardResponse.builder()
                .teacherName(teacher.getFullName())
                .totalBatches(totalBatches)
                .totalStudents(totalStudents)
                .totalAssignments(totalAssignments)
                .activeAssignments(activeAssignments)
                .completedAssignments(completedAssignments)
                .recentAssignments(recentAssignments)
                .upcomingDeadlines(upcomingDeadlines)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentDashboardResponse getStudentDashboard(String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        if (student.getRole() != com.assignment.enums.Role.STUDENT) {
            throw new com.assignment.exception.UnauthorizedException("Access Denied: Only students can access this dashboard");
        }

        String batchName = student.getBatch() != null ? student.getBatch().getBatchName() : "No Batch Assigned";
        Long studentId = student.getId();

        long totalAssignments = assignmentRepository.countByBatchIdIsNullAndStatus(AssignmentStatus.ACTIVE);
        if (student.getBatch() != null) {
            totalAssignments += assignmentRepository.countByBatchIdAndStatus(student.getBatch().getId(), AssignmentStatus.ACTIVE);
        }

        long submittedAssignments = submissionRepository.countByStudentId(studentId);
        long pendingAssignments = Math.max(0, totalAssignments - submittedAssignments);

        // Recent Assignments
        List<Assignment> recentList = new java.util.ArrayList<>();
        recentList.addAll(assignmentRepository.findTop5ByBatchIdIsNullAndStatusOrderByCreatedAtDesc(AssignmentStatus.ACTIVE));
        if (student.getBatch() != null) {
            recentList.addAll(assignmentRepository.findTop5ByBatchIdAndStatusOrderByCreatedAtDesc(student.getBatch().getId(), AssignmentStatus.ACTIVE));
        }
        recentList.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        List<StudentDashboardResponse.RecentAssignment> recentAssignments = recentList.stream()
                .limit(5)
                .map(a -> StudentDashboardResponse.RecentAssignment.builder()
                        .id(a.getId())
                        .title(a.getTitle())
                        .dueDate(a.getDueDate().toString())
                        .build())
                .collect(Collectors.toList());

        // Recent Submissions
        List<Submission> recentSubList = submissionRepository.findTop5ByStudentIdOrderBySubmittedAtDesc(studentId);
        List<StudentDashboardResponse.RecentSubmission> recentSubmissions = recentSubList.stream()
                .map(s -> StudentDashboardResponse.RecentSubmission.builder()
                        .assignment(s.getAssignment() != null ? s.getAssignment().getTitle() : "LMS Content")
                        .status(s.getStatus().name())
                        .marks(s.getMarks())
                        .build())
                .collect(Collectors.toList());

        // Upcoming Deadlines
        List<Assignment> upcomingList = new java.util.ArrayList<>();
        upcomingList.addAll(assignmentRepository.findByBatchIdIsNullAndStatusAndDueDateGreaterThanEqualOrderByDueDateAscDueTimeAsc(AssignmentStatus.ACTIVE, LocalDate.now()));
        if (student.getBatch() != null) {
            upcomingList.addAll(assignmentRepository.findByBatchIdAndStatusAndDueDateGreaterThanEqualOrderByDueDateAscDueTimeAsc(student.getBatch().getId(), AssignmentStatus.ACTIVE, LocalDate.now()));
        }
        upcomingList.sort((a, b) -> a.getDueDate().compareTo(b.getDueDate()));
        List<StudentDashboardResponse.UpcomingDeadline> upcomingDeadlines = upcomingList.stream()
                .limit(5)
                .map(a -> StudentDashboardResponse.UpcomingDeadline.builder()
                        .title(a.getTitle())
                        .dueDate(a.getDueDate().toString())
                        .build())
                .collect(Collectors.toList());

        return StudentDashboardResponse.builder()
                .studentName(student.getFullName())
                .batch(batchName)
                .totalAssignments(totalAssignments)
                .submittedAssignments(submittedAssignments)
                .pendingAssignments(pendingAssignments)
                .recentAssignments(recentAssignments)
                .recentSubmissions(recentSubmissions)
                .upcomingDeadlines(upcomingDeadlines)
                .build();
    }
}
