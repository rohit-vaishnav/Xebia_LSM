package com.assignment.service.impl;

import com.assignment.dto.response.CertificateResponse;
import com.assignment.entity.Assignment;
import com.assignment.entity.Certificate;
import com.assignment.entity.Student;
import com.assignment.entity.Submission;
import com.assignment.enums.SubmissionStatus;
import com.assignment.exception.BadRequestException;
import com.assignment.exception.CustomException;
import com.assignment.exception.ResourceNotFoundException;
import com.assignment.exception.UnauthorizedException;
import com.assignment.mapper.CertificateMapper;
import com.assignment.repository.AssignmentRepository;
import com.assignment.repository.CertificateRepository;
import com.assignment.repository.StudentRepository;
import com.assignment.repository.SubmissionRepository;
import com.assignment.service.CertificateService;
import com.assignment.entity.learning.CourseEntity;
import com.assignment.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CertificateServiceImpl implements CertificateService {

    private final CertificateRepository certificateRepository;
    private final SubmissionRepository submissionRepository;
    private final StudentRepository studentRepository;
    private final CertificateMapper certificateMapper;
    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;

    public CertificateServiceImpl(
            CertificateRepository certificateRepository,
            SubmissionRepository submissionRepository,
            StudentRepository studentRepository,
            CertificateMapper certificateMapper,
            AssignmentRepository assignmentRepository,
            CourseRepository courseRepository) {
        this.certificateRepository = certificateRepository;
        this.submissionRepository = submissionRepository;
        this.studentRepository = studentRepository;
        this.certificateMapper = certificateMapper;
        this.assignmentRepository = assignmentRepository;
        this.courseRepository = courseRepository;
    }

    @Override
    @Transactional
    public CertificateResponse generateCertificateForSubmission(Long submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        if (submission.getStatus() != SubmissionStatus.REVIEWED && submission.getStatus() != SubmissionStatus.SUBMITTED) {
            throw new BadRequestException("Submission must be submitted or reviewed before generating certificate");
        }

        Student student = submission.getStudent();
        Assignment assignment = submission.getAssignment();

        boolean isQuiz = assignment.getAssignmentType() == com.assignment.enums.AssignmentType.QUIZ;
        
        // 1. Verify passing grade criteria
        Double maxMarks = assignment.getTotalMarks();
        Double marks = submission.getMarks();
        if (marks == null) {
            marks = maxMarks; // Default to maximum marks for completion certificate if not yet graded
        }
        Double passingMarks = assignment.getPassingMarks();
        if (passingMarks == null) {
            passingMarks = maxMarks * 0.4; // fallback to 40%
        }
        
        if (marks < passingMarks) {
            return null;
        }

        // 2. Validate / Check for duplicate certificate generation
        Optional<Certificate> existingCert = isQuiz ?
                certificateRepository.findByStudentIdAndQuizId(student.getId(), assignment.getId()) :
                certificateRepository.findByStudentIdAndAssignmentId(student.getId(), assignment.getId());

        if (existingCert.isPresent()) {
            return certificateMapper.toResponse(existingCert.get());
        }

        String studentName = student.getFullName();
        String title = assignment.getTitle();
        LocalDateTime completedAt = submission.getReviewedAt() != null ? submission.getReviewedAt() : submission.getSubmittedAt();
        if (completedAt == null) {
            completedAt = LocalDateTime.now();
        }
        String teacherName = assignment.getTeacher() != null ? assignment.getTeacher().getFullName() : "Course Instructor";

        // Generate IDs and verification tokens
        String certId = "CERT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String verificationToken = UUID.randomUUID().toString();

        // Save metadata to database
        Certificate certificate = Certificate.builder()
                .student(student)
                .assignment(isQuiz ? null : assignment)
                .quiz(isQuiz ? assignment : null)
                .certificateUrl("") // satisfy database not-null constraint
                .cloudinaryPublicId(certId)
                .marks(marks)
                .generatedAt(LocalDateTime.now())
                .certificateType(isQuiz ? "QUIZ" : "ASSIGNMENT")
                .certificateId(certId)
                .studentName(studentName)
                .assignmentName(title)
                .teacherId(assignment.getTeacher() != null ? assignment.getTeacher().getId() : null)
                .teacherName(teacherName)
                .completionDate(completedAt)
                .generatedDate(LocalDateTime.now())
                .verificationToken(verificationToken)
                .build();

        Certificate saved = certificateRepository.save(certificate);
        return certificateMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> getStudentCertificates(String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        List<Certificate> certs = certificateRepository.findByStudentId(student.getId());
        return certificateMapper.toResponseList(certs);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateResponse getCertificateById(Long id, String email, String role) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found"));

        if ("STUDENT".equals(role)) {
            Student student = studentRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
            if (!cert.getStudent().getId().equals(student.getId())) {
                throw new UnauthorizedException("Access Denied: You can only view your own certificates");
            }
        }

        return certificateMapper.toResponse(cert);
    }

    @Override
    @Transactional
    public CertificateResponse getCertificateByAssignment(Long assignmentId, String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        Optional<Certificate> certOpt = certificateRepository.findByStudentIdAndAssignmentId(student.getId(), assignmentId);
        if (certOpt.isPresent()) {
            return certificateMapper.toResponse(certOpt.get());
        }
        
        // Fallback: Check if submission exists and generate on-the-fly
        Submission submission = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found. No submission found for this assignment."));
        
        if (submission.getStatus() == SubmissionStatus.SUBMITTED || submission.getStatus() == SubmissionStatus.REVIEWED) {
            CertificateResponse res = generateCertificateForSubmission(submission.getId());
            if (res == null) {
                throw new BadRequestException("Student did not pass the passing score required for certificate generation");
            }
            return res;
        } else {
            throw new BadRequestException("Submission has not been completed/submitted yet");
        }
    }
 
    @Override
    @Transactional
    public CertificateResponse getCertificateByQuiz(Long quizId, String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        Optional<Certificate> certOpt = certificateRepository.findByStudentIdAndQuizId(student.getId(), quizId);
        if (certOpt.isPresent()) {
            return certificateMapper.toResponse(certOpt.get());
        }
        
        // Fallback: Check if submission exists and generate on-the-fly
        Submission submission = submissionRepository.findByAssignmentIdAndStudentId(quizId, student.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found. No submission found for this quiz."));
        
        if (submission.getStatus() == SubmissionStatus.SUBMITTED || submission.getStatus() == SubmissionStatus.REVIEWED) {
            CertificateResponse res = generateCertificateForSubmission(submission.getId());
            if (res == null) {
                throw new BadRequestException("Student did not pass the passing score required for certificate generation");
            }
            return res;
        } else {
            throw new BadRequestException("Submission has not been completed/submitted yet");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> searchCertificatesForTeacher(String teacherEmail, String studentName, String type) {
        String queryName = (studentName != null && !studentName.isBlank()) ? "%" + studentName.trim().toLowerCase() + "%" : null;
        String queryType = (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type)) ? type.toUpperCase() : null;
        List<Certificate> certs = certificateRepository.searchCertificatesForTeacher(teacherEmail, queryName, queryType);
        return certificateMapper.toResponseList(certs);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateResponse getCertificateByToken(String token) {
        Certificate cert = certificateRepository.findByVerificationToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid verification token or certificate not found"));
        return certificateMapper.toResponse(cert);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateResponse getCertificatePreview(Long assignmentOrQuizId, String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        Assignment assignment = assignmentRepository.findById(assignmentOrQuizId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment/Quiz not found"));

        boolean isQuiz = assignment.getAssignmentType() == com.assignment.enums.AssignmentType.QUIZ;

        // Check if certificate already exists in database
        Optional<Certificate> existingCert = isQuiz ?
                certificateRepository.findByStudentIdAndQuizId(student.getId(), assignment.getId()) :
                certificateRepository.findByStudentIdAndAssignmentId(student.getId(), assignment.getId());

        if (existingCert.isPresent()) {
            CertificateResponse res = certificateMapper.toResponse(existingCert.get());
            res.setMaxMarks(assignment.getTotalMarks());
            return res;
        }

        // Generate dynamic preview metadata
        Submission submission = submissionRepository.findByAssignmentIdAndStudentId(assignment.getId(), student.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No submission found for this assignment/quiz"));

        if (submission.getStatus() != SubmissionStatus.REVIEWED && submission.getStatus() != SubmissionStatus.SUBMITTED) {
            throw new BadRequestException("Submission has not been completed/submitted yet");
        }

        Double maxMarks = assignment.getTotalMarks();
        Double marks = submission.getMarks();
        if (marks == null) {
            marks = maxMarks; // Default to maximum marks for completion certificate if not yet graded
        }
        Double passingMarks = assignment.getPassingMarks() != null ? assignment.getPassingMarks() : maxMarks * 0.4;
        if (marks < passingMarks) {
            throw new BadRequestException("Student did not pass the required passing score");
        }

        LocalDateTime completedAt = submission.getReviewedAt() != null ? submission.getReviewedAt() : submission.getSubmittedAt();
        if (completedAt == null) {
            completedAt = LocalDateTime.now();
        }

        String teacherName = assignment.getTeacher() != null ? assignment.getTeacher().getFullName() : "Course Instructor";

        return CertificateResponse.builder()
                .studentId(student.getId())
                .studentName(student.getFullName())
                .assignmentId(isQuiz ? null : assignment.getId())
                .assignmentTitle(isQuiz ? null : assignment.getTitle())
                .quizId(isQuiz ? assignment.getId() : null)
                .quizTitle(isQuiz ? assignment.getTitle() : null)
                .marks(marks)
                .maxMarks(maxMarks)
                .certificateType(isQuiz ? "QUIZ" : "ASSIGNMENT")
                .teacherName(teacherName)
                .completionDate(completedAt)
                .generatedAt(LocalDateTime.now())
                .generatedDate(LocalDateTime.now())
                .certificateId("PREVIEW-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .build();
    }

    @Override
    @Transactional
    public byte[] downloadOrGenerateCertificate(Long assignmentOrQuizId, String studentEmail) {
        throw new BadRequestException("PDF generation has been migrated to the client side. Please download from the frontend certificate preview.");
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateResponse getCertificateByUuid(String uuid, String email, String role) {
        Certificate certificate = certificateRepository.findByCertificateId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found"));
        
        if ("STUDENT".equals(role)) {
            Student student = studentRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
            if (!certificate.getStudent().getId().equals(student.getId())) {
                throw new UnauthorizedException("You are not authorized to access this certificate");
            }
        }
        return certificateMapper.toResponse(certificate);
    }

    @Override
    @Transactional
    public byte[] downloadCertificateByUuid(String idOrUuid, String studentEmail) {
        throw new BadRequestException("PDF generation has been migrated to the client side. Please download from the frontend certificate preview.");
    }

    private List<Assignment> getCourseAssignments(CourseEntity course) {
        List<Long> assignmentIds = new java.util.ArrayList<>();
        if (course.getModules() != null) {
            for (com.assignment.entity.learning.ModuleEntity module : course.getModules()) {
                if (module.getSubmodules() != null) {
                    for (com.assignment.entity.learning.SubmoduleEntity submodule : module.getSubmodules()) {
                        if (submodule.getContents() != null) {
                            for (com.assignment.entity.learning.ContentEntity content : submodule.getContents()) {
                                if (content.getAssignmentId() != null) {
                                    assignmentIds.add(content.getAssignmentId());
                                }
                            }
                        }
                    }
                }
            }
        }
        if (assignmentIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return assignmentRepository.findAllById(assignmentIds);
    }

    private void validateCourseCertificateEligibility(Student student, CourseEntity course, List<Assignment> assignments) {
        if (!Boolean.TRUE.equals(course.getEnableCertificate())) {
            throw new BadRequestException("Certificates are not enabled for this course.");
        }

        int totalTasks = assignments.size();
        int completedTasks = 0;
        double quizScoreSum = 0.0;
        int quizCount = 0;
        boolean finalPassed = true;
        boolean allAssignmentsCompleted = true;

        // Find final assessment (highest marks task)
        Assignment finalAssessment = null;
        for (Assignment a : assignments) {
            if (finalAssessment == null || a.getTotalMarks() > finalAssessment.getTotalMarks()) {
                finalAssessment = a;
            }
        }

        for (Assignment a : assignments) {
            Optional<Submission> subOpt = submissionRepository.findByAssignmentIdAndStudentId(a.getId(), student.getId());
            boolean isCompleted = subOpt.isPresent() && (subOpt.get().getStatus() == SubmissionStatus.SUBMITTED || subOpt.get().getStatus() == SubmissionStatus.REVIEWED);
            if (isCompleted) {
                completedTasks++;
                Submission sub = subOpt.get();
                Double marks = sub.getMarks() != null ? sub.getMarks() : a.getTotalMarks();
                if (a.getAssignmentType() == com.assignment.enums.AssignmentType.QUIZ) {
                    quizScoreSum += (marks / a.getTotalMarks()) * 100.0;
                    quizCount++;
                }
                if (a.equals(finalAssessment)) {
                    Double passing = a.getPassingMarks() != null ? a.getPassingMarks() : a.getTotalMarks() * 0.4;
                    if (marks < passing) {
                        finalPassed = false;
                    }
                }
            } else {
                if (a.getAssignmentType() != com.assignment.enums.AssignmentType.QUIZ) {
                    allAssignmentsCompleted = false;
                }
                if (a.equals(finalAssessment)) {
                    finalPassed = false;
                }
            }
        }

        double completionPct = totalTasks > 0 ? ((double) completedTasks / totalTasks) * 100.0 : 100.0;
        double avgQuizScore = quizCount > 0 ? (quizScoreSum / quizCount) : 100.0;

        // 1. Course completion check
        Integer reqCompletion = course.getMinCourseCompletion() != null ? course.getMinCourseCompletion() : 100;
        if (completionPct < reqCompletion) {
            throw new BadRequestException(String.format("Course Completion requirement not met: required %d%%, actual %.1f%%", reqCompletion, completionPct));
        }

        // 2. Quiz score check
        if (course.getMinQuizScore() != null && quizCount > 0) {
            if (avgQuizScore < course.getMinQuizScore()) {
                throw new BadRequestException(String.format("Average Quiz Score requirement not met: required %.1f%%, actual %.1f%%", course.getMinQuizScore(), avgQuizScore));
            }
        }

        // 3. Assignment requirement check
        if ("Required".equalsIgnoreCase(course.getAssignmentRequirement())) {
            if (!allAssignmentsCompleted) {
                throw new BadRequestException("All required assignments must be submitted.");
            }
        }

        // 4. Final Assessment check
        if (Boolean.TRUE.equals(course.getFinalAssessmentRequirement()) && finalAssessment != null) {
            if (!finalPassed) {
                throw new BadRequestException("Final Assessment must be passed.");
            }
        }
    }

    @Override
    @Transactional
    public CertificateResponse claimCourseCertificate(Long courseId, String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        CourseEntity course = courseRepository.findByIdWithModules(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        Optional<Certificate> existingCert = certificateRepository.findByStudentIdAndCourseId(student.getId(), courseId);
        if (existingCert.isPresent()) {
            return certificateMapper.toResponse(existingCert.get());
        }

        List<Assignment> assignments = getCourseAssignments(course);
        validateCourseCertificateEligibility(student, course, assignments);

        String studentName = student.getFullName();
        String title = course.getTitle();
        String teacherName = "Course Instructor";
        if (course.getAuthor() != null && !course.getAuthor().isBlank()) {
            teacherName = course.getAuthor();
        }

        double finalScore = 100.0;
        double earnedSum = 0.0;
        double maxSum = 0.0;
        for (Assignment a : assignments) {
            Optional<Submission> subOpt = submissionRepository.findByAssignmentIdAndStudentId(a.getId(), student.getId());
            if (subOpt.isPresent()) {
                earnedSum += subOpt.get().getMarks() != null ? subOpt.get().getMarks() : a.getTotalMarks();
                maxSum += a.getTotalMarks();
            }
        }
        if (maxSum > 0) {
            finalScore = (earnedSum / maxSum) * 100.0;
        }

        String certId = "CERT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String verificationToken = UUID.randomUUID().toString();

        Certificate certificate = Certificate.builder()
                .student(student)
                .course(course)
                .certificateUrl("") // satisfy database not-null constraint
                .cloudinaryPublicId(certId)
                .marks(finalScore)
                .generatedAt(LocalDateTime.now())
                .certificateType("COURSE")
                .certificateId(certId)
                .studentName(studentName)
                .assignmentName(title)
                .teacherName(teacherName)
                .completionDate(LocalDateTime.now())
                .generatedDate(LocalDateTime.now())
                .verificationToken(verificationToken)
                .build();

        Certificate saved = certificateRepository.save(certificate);
        return certificateMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CertificateResponse getCourseCertificate(Long courseId, String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        
        Optional<Certificate> certOpt = certificateRepository.findByStudentIdAndCourseId(student.getId(), courseId);
        if (certOpt.isPresent()) {
            return certificateMapper.toResponse(certOpt.get());
        }

        // Try to claim if eligible
        try {
            return claimCourseCertificate(courseId, studentEmail);
        } catch (Exception e) {
            return null; // Not eligible yet
        }
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateResponse getCourseCertificatePreview(Long courseId, String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        CourseEntity course = courseRepository.findByIdWithModules(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        Optional<Certificate> existingCert = certificateRepository.findByStudentIdAndCourseId(student.getId(), courseId);
        if (existingCert.isPresent()) {
            return certificateMapper.toResponse(existingCert.get());
        }

        List<Assignment> assignments = getCourseAssignments(course);
        double finalScore = 100.0;
        double earnedSum = 0.0;
        double maxSum = 0.0;
        for (Assignment a : assignments) {
            Optional<Submission> subOpt = submissionRepository.findByAssignmentIdAndStudentId(a.getId(), student.getId());
            if (subOpt.isPresent()) {
                earnedSum += subOpt.get().getMarks() != null ? subOpt.get().getMarks() : a.getTotalMarks();
                maxSum += a.getTotalMarks();
            }
        }
        if (maxSum > 0) {
            finalScore = (earnedSum / maxSum) * 100.0;
        }

        String teacherName = "Course Instructor";
        if (course.getAuthor() != null && !course.getAuthor().isBlank()) {
            teacherName = course.getAuthor();
        }

        return CertificateResponse.builder()
                .studentId(student.getId())
                .studentName(student.getFullName())
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .marks(finalScore)
                .maxMarks(100.0)
                .certificateType("COURSE")
                .teacherName(teacherName)
                .completionDate(LocalDateTime.now())
                .generatedAt(LocalDateTime.now())
                .generatedDate(LocalDateTime.now())
                .certificateId("PREVIEW-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .build();
    }
}
