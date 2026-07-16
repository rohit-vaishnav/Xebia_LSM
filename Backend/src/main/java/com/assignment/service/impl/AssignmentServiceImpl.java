package com.assignment.service.impl;

import com.assignment.dto.request.AssignmentRequest;
import com.assignment.dto.response.AssignmentResponse;
import com.assignment.dto.response.AssignmentStatusResponse;
import com.assignment.entity.Assignment;
import com.assignment.entity.Batch;
import com.assignment.entity.Student;
import com.assignment.entity.Submission;
import com.assignment.entity.Teacher;
import com.assignment.enums.AssignmentStatus;
import com.assignment.enums.SubmissionStatus;
import com.assignment.exception.BadRequestException;
import com.assignment.exception.ResourceNotFoundException;
import com.assignment.exception.UnauthorizedException;
import com.assignment.mapper.AssignmentMapper;
import com.assignment.repository.AssignmentRepository;
import com.assignment.repository.BatchRepository;
import com.assignment.repository.StudentRepository;
import com.assignment.repository.SubmissionRepository;
import com.assignment.repository.TeacherRepository;
import com.assignment.service.AssignmentService;
import com.assignment.service.CloudinaryService;
import com.assignment.service.RedisService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentServiceImpl implements AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final TeacherRepository teacherRepository;
    private final BatchRepository batchRepository;
    private final StudentRepository studentRepository;
    private final SubmissionRepository submissionRepository;
    private final CloudinaryService cloudinaryService;
    private final RedisService redisService;
    private final AssignmentMapper assignmentMapper;
    private final com.assignment.repository.QuestionRepository questionRepository;
    private final com.assignment.mapper.QuestionMapper questionMapper;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final com.assignment.service.ExcelImportService excelImportService;
    private final com.assignment.service.ExcelExportService excelExportService;
    private final com.assignment.repository.CertificateRepository certificateRepository;

    private Teacher getTeacher(String email) {
        Teacher teacher = teacherRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher profile not found"));
        if (teacher.getRole() != com.assignment.enums.Role.TEACHER) {
            throw new com.assignment.exception.UnauthorizedException("Access Denied: Only teachers can perform this action");
        }
        return teacher;
    }

    private Student getStudent(String email) {
        return studentRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
    }

    private void rebuildAssignmentStatusCache(Long assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) return;

        if (assignment.getBatch() == null) {
            AssignmentStatusResponse cache = AssignmentStatusResponse.builder()
                    .submittedStudentIds(List.of())
                    .pendingStudentIds(List.of())
                    .submittedCount(0)
                    .pendingCount(0)
                    .completionPercentage(0.0)
                    .build();
            redisService.saveAssignmentStatus(assignmentId, cache);
            return;
        }

        List<Student> students = studentRepository.findByBatchId(assignment.getBatch().getId());
        List<Long> allStudentIds = students.stream().map(Student::getId).toList();

        List<Submission> submissions = submissionRepository.findByAssignmentId(assignmentId);
        List<Long> submittedStudentIds = submissions.stream()
                .filter(sub -> sub.getStatus() == SubmissionStatus.SUBMITTED || sub.getStatus() == SubmissionStatus.REVIEWED)
                .map(sub -> sub.getStudent().getId())
                .toList();

        List<Long> pendingStudentIds = allStudentIds.stream()
                .filter(id -> !submittedStudentIds.contains(id))
                .toList();

        int total = allStudentIds.size();
        int submitted = submittedStudentIds.size();
        int pending = pendingStudentIds.size();
        double pct = total > 0 ? ((double) submitted / total) * 100.0 : 0.0;

        AssignmentStatusResponse cache = AssignmentStatusResponse.builder()
                .submittedStudentIds(submittedStudentIds)
                .pendingStudentIds(pendingStudentIds)
                .submittedCount(submitted)
                .pendingCount(pending)
                .completionPercentage(Math.round(pct * 100.0) / 100.0)
                .build();

        redisService.saveAssignmentStatus(assignmentId, cache);
    }

    private void populateResponseCounts(AssignmentResponse res) {
        if (res == null) return;
        if (res.getBatchId() == null) {
            res.setTotalStudents(0);
            res.setSubmittedCount(0);
            res.setPendingCount(0);
            res.setSubmissionPercentage(0.0);
            return;
        }
        List<Student> students = studentRepository.findByBatchId(res.getBatchId());
        List<Long> allStudentIds = students.stream().map(Student::getId).toList();

        List<Submission> submissions = submissionRepository.findByAssignmentId(res.getId());
        List<Long> submittedStudentIds = submissions.stream()
                .filter(sub -> sub.getStatus() == SubmissionStatus.SUBMITTED || sub.getStatus() == SubmissionStatus.REVIEWED)
                .map(sub -> sub.getStudent().getId())
                .toList();

        int total = allStudentIds.size();
        int submitted = submittedStudentIds.size();
        int pending = total - submitted;
        double pct = total > 0 ? ((double) submitted / total) * 100.0 : 0.0;

        res.setTotalStudents(total);
        res.setSubmittedCount(submitted);
        res.setPendingCount(pending);
        res.setSubmissionPercentage(Math.round(pct * 100.0) / 100.0);
    }

    private List<AssignmentResponse> populateResponseCounts(List<AssignmentResponse> responses) {
        if (responses == null) return null;
        for (AssignmentResponse res : responses) {
            populateResponseCounts(res);
        }
        return responses;
    }

    @Override
    @Transactional
    public AssignmentResponse createAssignment(AssignmentRequest request, String teacherEmail) {
        Teacher teacher = getTeacher(teacherEmail);
        Batch batch = null;
        if (request.getBatchId() != null) {
            batch = batchRepository.findByIdAndTeacherId(request.getBatchId(), teacher.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found or unauthorized"));
        }

        String statusStr = request.getStatus();
        boolean isDraft = "draft".equalsIgnoreCase(statusStr);
        boolean isPublished = "published".equalsIgnoreCase(statusStr) || "active".equalsIgnoreCase(statusStr);

        if (statusStr == null || statusStr.isBlank()) {
            isDraft = (request.getBatchId() == null);
            isPublished = !isDraft;
        }

        if (isPublished && request.getBatchId() == null) {
            throw new BadRequestException("Target Batch is required for publishing.");
        }

        if (request.getPassingMarks() > request.getTotalMarks()) {
            throw new BadRequestException("Passing marks cannot exceed total marks");
        }

        String resourceUrl = null;
        if (request.getResourceFile() != null && !request.getResourceFile().isEmpty()) {
            // Validate size
            if (request.getResourceFile().getSize() > request.getMaxFileSize()) {
                throw new BadRequestException("Uploaded resource file exceeds max allowed size of " + (request.getMaxFileSize() / (1024 * 1024)) + " MB");
            }
            resourceUrl = cloudinaryService.uploadFile(request.getResourceFile(), "assignment_system/resources");
        }

        Assignment assignment = Assignment.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .instructions(request.getInstructions())
                .assignmentType(request.getAssignmentType())
                .subject(request.getSubject())
                .topic(request.getTopic())
                .batch(batch)
                .teacher(teacher)
                .resourceUrl(resourceUrl)
                .externalLink(request.getExternalLink())
                .submissionType(request.getSubmissionType())
                .totalMarks(request.getTotalMarks())
                .passingMarks(request.getPassingMarks())
                .dueDate(request.getDueDate())
                .dueTime(request.getDueTime())
                .lateSubmissionAllowed(request.getLateSubmissionAllowed() != null ? request.getLateSubmissionAllowed() : false)
                .maxFileSize(request.getMaxFileSize() != null ? request.getMaxFileSize() : 10485760L)
                .status(isDraft ? AssignmentStatus.DRAFT : AssignmentStatus.ACTIVE)
                .build();

        Assignment savedAssignment = assignmentRepository.save(assignment);

        // Parse and save questions if QUIZ type and questionsJson is provided
        if (request.getAssignmentType() == com.assignment.enums.AssignmentType.QUIZ && request.getQuestionsJson() != null && !request.getQuestionsJson().isBlank()) {
            try {
                List<com.assignment.dto.request.QuestionRequest> questionRequests = objectMapper.readValue(
                        request.getQuestionsJson(),
                        new com.fasterxml.jackson.core.type.TypeReference<List<com.assignment.dto.request.QuestionRequest>>() {}
                );
                for (com.assignment.dto.request.QuestionRequest qReq : questionRequests) {
                    com.assignment.entity.Question question = questionMapper.toEntity(qReq);
                    question.setAssignment(savedAssignment);
                    savedAssignment.getQuestions().add(question);
                }
                savedAssignment = assignmentRepository.save(savedAssignment);
            } catch (Exception e) {
                throw new BadRequestException("Failed to parse quiz questions: " + e.getMessage());
            }
        }

        // Initialize Redis cache
        rebuildAssignmentStatusCache(savedAssignment.getId());

        Assignment loadedAssignment = assignmentRepository.findById(savedAssignment.getId()).orElse(savedAssignment);
        AssignmentResponse response = assignmentMapper.toResponse(loadedAssignment);
        populateResponseCounts(response);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentResponse> getAllAssignments(String teacherEmail, int page, int size) {
        Teacher teacher = getTeacher(teacherEmail);
        Pageable pageable = PageRequest.of(page, size);
        Page<Assignment> assignmentPage = assignmentRepository.findByTeacherId(teacher.getId(), pageable);
        return populateResponseCounts(assignmentMapper.toResponseList(assignmentPage.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentResponse> getStudentAssignments(String studentEmail, int page, int size) {
        Student student = getStudent(studentEmail);
        List<Assignment> combinedList = new java.util.ArrayList<>();
        
        if (student.getBatch() != null) {
            Pageable pageable = PageRequest.of(page, size);
            Page<Assignment> assignmentPage = assignmentRepository.findByBatchIdAndStatus(student.getBatch().getId(), AssignmentStatus.ACTIVE, pageable);
            combinedList.addAll(assignmentPage.getContent());
        }
        
        // Add global active assignments
        List<Assignment> globalList = assignmentRepository.findByBatchIdIsNullAndStatus(AssignmentStatus.ACTIVE);
        combinedList.addAll(globalList);
        
        return populateResponseCounts(assignmentMapper.toResponseList(combinedList));
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentResponse getAssignmentById(Long id, String email, String role) {
        Assignment assignment;
        if ("TEACHER".equals(role)) {
            Teacher teacher = getTeacher(email);
            assignment = assignmentRepository.findByIdAndTeacherId(id, teacher.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignment not found or unauthorized"));
        } else {
            Student student = getStudent(email);
            assignment = assignmentRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Assignment not found or unauthorized"));
            
            boolean isGlobal = assignment.getBatch() == null && assignment.getStatus() == AssignmentStatus.ACTIVE;
            boolean isBatchAssigned = assignment.getBatch() != null && student.getBatch() != null && 
                                      assignment.getBatch().getId().equals(student.getBatch().getId()) && 
                                      assignment.getStatus() == AssignmentStatus.ACTIVE;
            
            if (!isGlobal && !isBatchAssigned) {
                throw new ResourceNotFoundException("Assignment not found or unauthorized");
            }
        }
        
        boolean hasSubmitted = false;
        if (!"TEACHER".equals(role)) {
            Student student = getStudent(email);
            hasSubmitted = submissionRepository.findByAssignmentIdAndStudentId(id, student.getId()).isPresent();
        }
        
        AssignmentResponse response = assignmentMapper.toResponse(assignment);
        populateResponseCounts(response);
        if (!"TEACHER".equals(role) && !hasSubmitted && response.getQuestions() != null) {
            for (com.assignment.dto.response.QuestionResponse qr : response.getQuestions()) {
                qr.setCorrectAnswer(null);
            }
        }
        return response;
    }

    @Override
    @Transactional
    public AssignmentResponse updateAssignment(Long id, AssignmentRequest request, String teacherEmail) {
        Teacher teacher = getTeacher(teacherEmail);
        Assignment assignment = assignmentRepository.findByIdAndTeacherId(id, teacher.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found or unauthorized"));

        Batch batch = null;
        if (request.getBatchId() != null) {
            batch = batchRepository.findByIdAndTeacherId(request.getBatchId(), teacher.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found or unauthorized"));
        }

        String statusStr = request.getStatus();
        boolean isDraft = "draft".equalsIgnoreCase(statusStr);
        boolean isPublished = "published".equalsIgnoreCase(statusStr) || "active".equalsIgnoreCase(statusStr);

        if (statusStr == null || statusStr.isBlank()) {
            isDraft = (request.getBatchId() == null);
            isPublished = !isDraft;
        }

        if (isPublished && request.getBatchId() == null) {
            throw new BadRequestException("Target Batch is required for publishing.");
        }

        if (request.getPassingMarks() > request.getTotalMarks()) {
            throw new BadRequestException("Passing marks cannot exceed total marks");
        }

        // Check if batch changed (if so, we will need to update Redis status cache later)
        boolean batchChanged = false;
        if (assignment.getBatch() == null && batch != null) {
            batchChanged = true;
        } else if (assignment.getBatch() != null && batch == null) {
            batchChanged = true;
        } else if (assignment.getBatch() != null && batch != null) {
            batchChanged = !assignment.getBatch().getId().equals(batch.getId());
        }

        if (request.getResourceFile() != null && !request.getResourceFile().isEmpty()) {
            if (request.getResourceFile().getSize() > request.getMaxFileSize()) {
                throw new BadRequestException("Uploaded resource file exceeds max allowed size of " + (request.getMaxFileSize() / (1024 * 1024)) + " MB");
            }
            String resourceUrl = cloudinaryService.uploadFile(request.getResourceFile(), "assignment_system/resources");
            assignment.setResourceUrl(resourceUrl);
        }

        assignment.setTitle(request.getTitle());
        assignment.setDescription(request.getDescription());
        assignment.setInstructions(request.getInstructions());
        assignment.setAssignmentType(request.getAssignmentType());
        assignment.setSubject(request.getSubject());
        assignment.setTopic(request.getTopic());
        assignment.setBatch(batch);
        assignment.setStatus(isDraft ? AssignmentStatus.DRAFT : AssignmentStatus.ACTIVE);
        assignment.setExternalLink(request.getExternalLink());
        assignment.setSubmissionType(request.getSubmissionType());
        assignment.setTotalMarks(request.getTotalMarks());
        assignment.setPassingMarks(request.getPassingMarks());
        assignment.setDueDate(request.getDueDate());
        assignment.setDueTime(request.getDueTime());
        assignment.setLateSubmissionAllowed(request.getLateSubmissionAllowed() != null ? request.getLateSubmissionAllowed() : false);
        assignment.setMaxFileSize(request.getMaxFileSize() != null ? request.getMaxFileSize() : 10485760L);

        Assignment updatedAssignment = assignmentRepository.save(assignment);

        // Parse and update questions if QUIZ type
        if (request.getAssignmentType() == com.assignment.enums.AssignmentType.QUIZ && request.getQuestionsJson() != null && !request.getQuestionsJson().isBlank()) {
            try {
                // Clear existing questions to trigger orphan removal
                assignment.getQuestions().clear();
                assignmentRepository.saveAndFlush(assignment);

                List<com.assignment.dto.request.QuestionRequest> questionRequests = objectMapper.readValue(
                        request.getQuestionsJson(),
                        new com.fasterxml.jackson.core.type.TypeReference<List<com.assignment.dto.request.QuestionRequest>>() {}
                );
                for (com.assignment.dto.request.QuestionRequest qReq : questionRequests) {
                    com.assignment.entity.Question question = questionMapper.toEntity(qReq);
                    question.setAssignment(assignment);
                    assignment.getQuestions().add(question);
                }
                updatedAssignment = assignmentRepository.save(assignment);
            } catch (Exception e) {
                throw new BadRequestException("Failed to update quiz questions: " + e.getMessage());
            }
        }

        // Sync Redis cache
        rebuildAssignmentStatusCache(updatedAssignment.getId());

        Assignment loadedAssignment = assignmentRepository.findById(updatedAssignment.getId()).orElse(updatedAssignment);
        AssignmentResponse response = assignmentMapper.toResponse(loadedAssignment);
        populateResponseCounts(response);
        return response;
    }

    @Override
    @Transactional
    public void deleteAssignment(Long id, String teacherEmail) {
        Teacher teacher = getTeacher(teacherEmail);
        Assignment assignment = assignmentRepository.findByIdAndTeacherId(id, teacher.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found or unauthorized"));

        if (certificateRepository.existsByAssignmentId(id) || certificateRepository.existsByQuizId(id)) {
            throw new BadRequestException("Cannot delete this assignment because certificates have already been generated.");
        }

        assignmentRepository.delete(assignment);

        // Delete Redis cache key
        redisService.deleteAssignmentStatus(id);
    }

    @Override
    public List<com.assignment.dto.request.QuestionRequest> importExcelQuestions(org.springframework.web.multipart.MultipartFile file) {
        try {
            return ExcelParserHelper.parseExcel(file);
        } catch (Exception e) {
            throw new BadRequestException("Failed to parse Excel file: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public AssignmentResponse importAssignment(
            String title,
            String description,
            Long batchId,
            java.time.LocalDate dueDate,
            org.springframework.web.multipart.MultipartFile file,
            String teacherEmail
    ) {
        Teacher teacher = getTeacher(teacherEmail);
        Batch batch = batchRepository.findByIdAndTeacherId(batchId, teacher.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found or unauthorized"));

        // Validate file size and type first
        com.assignment.util.ExcelValidator.validateFile(file);

        // Parse questions from file
        List<com.assignment.dto.QuizImportDTO> importedQuestions = excelImportService.parseExcelFile(file);

        // Validate questions
        List<String> validationErrors = com.assignment.util.ExcelValidator.validateQuestions(importedQuestions);
        if (!validationErrors.isEmpty()) {
            throw new BadRequestException("Excel validation failed: " + String.join("; ", validationErrors));
        }

        if (importedQuestions.isEmpty()) {
            throw new BadRequestException("Excel file contains no questions");
        }

        // Calculate total marks and passing marks (50% of total)
        double totalMarks = importedQuestions.stream().mapToDouble(com.assignment.dto.QuizImportDTO::getMarks).sum();
        double passingMarks = totalMarks * 0.5;

        // Build Assignment
        Assignment assignment = Assignment.builder()
                .title(title)
                .description(description)
                .instructions("Imported Quiz Assignment")
                .assignmentType(com.assignment.enums.AssignmentType.QUIZ)
                .subject("General")
                .topic("Quiz")
                .batch(batch)
                .teacher(teacher)
                .totalMarks(totalMarks)
                .passingMarks(passingMarks)
                .dueDate(dueDate)
                .dueTime(java.time.LocalTime.of(23, 59))
                .lateSubmissionAllowed(false)
                .maxFileSize(10485760L) // Default 10MB
                .status(com.assignment.enums.AssignmentStatus.ACTIVE)
                .build();

        Assignment savedAssignment = assignmentRepository.save(assignment);

        // Save imported questions
        for (com.assignment.dto.QuizImportDTO qImport : importedQuestions) {
            com.assignment.entity.Question question = com.assignment.entity.Question.builder()
                    .assignment(savedAssignment)
                    .questionText(qImport.getQuestionText())
                    .optionA(qImport.getOptionA())
                    .optionB(qImport.getOptionB())
                    .optionC(qImport.getOptionC())
                    .optionD(qImport.getOptionD())
                    .correctAnswer(qImport.getCorrectAnswer().toUpperCase())
                    .marks(qImport.getMarks())
                    .difficulty("Medium")
                    .questionType("MCQ")
                    .build();
            savedAssignment.getQuestions().add(question);
        }
        savedAssignment = assignmentRepository.save(savedAssignment);

        // Initialize Redis cache
        rebuildAssignmentStatusCache(savedAssignment.getId());

        Assignment loadedAssignment = assignmentRepository.findById(savedAssignment.getId()).orElse(savedAssignment);
        AssignmentResponse response = assignmentMapper.toResponse(loadedAssignment);
        populateResponseCounts(response);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportAssignmentResults(Long assignmentId, String teacherEmail) {
        Teacher teacher = getTeacher(teacherEmail);
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        if (!assignment.getTeacher().getId().equals(teacher.getId())) {
            throw new com.assignment.exception.UnauthorizedException("Access Denied: Only the teacher who created this assignment can download the report");
        }

        // Fetch students of the batch
        List<Student> students = studentRepository.findByBatchId(assignment.getBatch().getId());

        // Fetch submissions for this assignment
        List<Submission> submissions = submissionRepository.findByAssignmentId(assignmentId);

        return excelExportService.generateAssignmentResultExcel(assignment, students, submissions);
    }

    @Override
    @Transactional
    public List<AssignmentResponse> assignBatch(Long assignmentId, List<Long> batchIds, String teacherEmail) {
        Teacher teacher = getTeacher(teacherEmail);
        Assignment assignment = assignmentRepository.findByIdAndTeacherId(assignmentId, teacher.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found or unauthorized"));

        if (batchIds == null || batchIds.isEmpty()) {
            throw new BadRequestException("At least one batch ID is required");
        }

        List<Batch> batches = batchRepository.findAllById(batchIds);
        if (batches.size() != batchIds.size()) {
            throw new ResourceNotFoundException("One or more batches not found");
        }

        for (Batch b : batches) {
            if (!b.getTeacher().getId().equals(teacher.getId())) {
                throw new UnauthorizedException("Unauthorized: batch " + b.getBatchName() + " does not belong to you");
            }
        }

        List<AssignmentResponse> responses = new java.util.ArrayList<>();
        int startIndex = 0;

        // If the assignment is currently a draft (has no batch), use it for the first batch
        if (assignment.getBatch() == null) {
            Batch firstBatch = batches.get(0);
            assignment.setBatch(firstBatch);
            assignment.setStatus(AssignmentStatus.ACTIVE);
            Assignment saved = assignmentRepository.save(assignment);
            rebuildAssignmentStatusCache(saved.getId());
            AssignmentResponse res = assignmentMapper.toResponse(saved);
            populateResponseCounts(res);
            responses.add(res);
            startIndex = 1;
        }

        // For any subsequent batches, duplicate (clone) the quiz
        for (int i = startIndex; i < batches.size(); i++) {
            Batch currentBatch = batches.get(i);

            Assignment cloned = Assignment.builder()
                    .title(assignment.getTitle())
                    .description(assignment.getDescription())
                    .instructions(assignment.getInstructions())
                    .assignmentType(assignment.getAssignmentType())
                    .subject(assignment.getSubject())
                    .topic(assignment.getTopic())
                    .batch(currentBatch)
                    .teacher(teacher)
                    .resourceUrl(assignment.getResourceUrl())
                    .externalLink(assignment.getExternalLink())
                    .submissionType(assignment.getSubmissionType())
                    .totalMarks(assignment.getTotalMarks())
                    .passingMarks(assignment.getPassingMarks())
                    .dueDate(assignment.getDueDate())
                    .dueTime(assignment.getDueTime())
                    .lateSubmissionAllowed(assignment.getLateSubmissionAllowed())
                    .maxFileSize(assignment.getMaxFileSize())
                    .status(AssignmentStatus.ACTIVE)
                    .build();

            Assignment savedCloned = assignmentRepository.save(cloned);

            if (assignment.getQuestions() != null) {
                for (com.assignment.entity.Question q : assignment.getQuestions()) {
                    com.assignment.entity.Question clonedQ = com.assignment.entity.Question.builder()
                            .assignment(savedCloned)
                            .questionText(q.getQuestionText())
                            .optionA(q.getOptionA())
                            .optionB(q.getOptionB())
                            .optionC(q.getOptionC())
                            .optionD(q.getOptionD())
                            .correctAnswer(q.getCorrectAnswer())
                            .marks(q.getMarks())
                            .difficulty(q.getDifficulty())
                            .questionType(q.getQuestionType())
                            .build();
                    savedCloned.getQuestions().add(clonedQ);
                }
                assignmentRepository.save(savedCloned);
            }

            rebuildAssignmentStatusCache(savedCloned.getId());
            Assignment loadedCloned = assignmentRepository.findById(savedCloned.getId()).orElse(savedCloned);
            AssignmentResponse res = assignmentMapper.toResponse(loadedCloned);
            populateResponseCounts(res);
            responses.add(res);
        }

        return responses;
    }

    @Override
    @Transactional
    public AssignmentResponse unassignBatch(Long assignmentId, String teacherEmail) {
        Teacher teacher = getTeacher(teacherEmail);
        Assignment assignment = assignmentRepository.findByIdAndTeacherId(assignmentId, teacher.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found or unauthorized"));

        long submissionsCount = submissionRepository.countByAssignmentId(assignmentId);
        if (submissionsCount > 0) {
            throw new BadRequestException("Cannot unassign batch from quiz: students have already submitted answers");
        }

        assignment.setBatch(null);
        assignment.setStatus(AssignmentStatus.DRAFT);
        Assignment saved = assignmentRepository.save(assignment);

        redisService.deleteAssignmentStatus(assignmentId);

        AssignmentResponse res = assignmentMapper.toResponse(saved);
        populateResponseCounts(res);
        return res;
    }
}

