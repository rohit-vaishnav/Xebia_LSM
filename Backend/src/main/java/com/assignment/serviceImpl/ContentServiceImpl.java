package com.assignment.serviceImpl;

import com.assignment.cache.RedisService;
import com.assignment.dto.ContentRequestDTO;
import com.assignment.dto.ContentResponseDTO;
import com.assignment.entity.Assignment;
import com.assignment.entity.Question;
import com.assignment.entity.Teacher;
import com.assignment.entity.learning.ContentEntity;
import com.assignment.entity.learning.SubmoduleEntity;
import com.assignment.enums.AssignmentStatus;
import com.assignment.enums.AssignmentType;
import com.assignment.exception.ResourceNotFoundException;
import com.assignment.mapper.ContentMapper;
import com.assignment.repository.AssignmentRepository;
import com.assignment.repository.ContentRepository;
import com.assignment.repository.SubmoduleRepository;
import com.assignment.repository.TeacherRepository;
import com.assignment.service.ContentService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ContentServiceImpl implements ContentService {

    private final ContentRepository contentRepository;
    private final SubmoduleRepository submoduleRepository;
    private final RedisService redisService;
    private final AssignmentRepository assignmentRepository;
    private final TeacherRepository teacherRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ContentServiceImpl(
            ContentRepository contentRepository,
            SubmoduleRepository submoduleRepository,
            RedisService redisService,
            AssignmentRepository assignmentRepository,
            TeacherRepository teacherRepository
    ) {
        this.contentRepository = contentRepository;
        this.submoduleRepository = submoduleRepository;
        this.redisService = redisService;
        this.assignmentRepository = assignmentRepository;
        this.teacherRepository = teacherRepository;
    }

    @Override
    public ContentResponseDTO create(ContentRequestDTO request) {
        SubmoduleEntity submodule = submoduleRepository.findById(request.getSubmoduleId())
                .orElseThrow(() -> new ResourceNotFoundException("Submodule not found with id: " + request.getSubmoduleId()));

        ContentEntity content = ContentMapper.toEntity(request, submodule);
        syncContentToAssignment(content);
        ContentEntity savedContent = contentRepository.save(content);

        // Invalidate cache
        redisService.delete("contents_submodule_" + request.getSubmoduleId());
        Long courseId = (submodule.getModule() != null && submodule.getModule().getCourse() != null) ? submodule.getModule().getCourse().getId() : null;
        if (courseId != null) {
            redisService.delete("course_" + courseId);
        }
        redisService.delete("courses_all");

        return ContentMapper.toResponseDTO(savedContent);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContentResponseDTO> getAll() {
        return contentRepository.findAllWithSubmodule().stream()
                .map(ContentMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ContentResponseDTO getById(Long id) {
        ContentEntity content = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found with id: " + id));
        return ContentMapper.toResponseDTO(content);
    }

    @Override
    public ContentResponseDTO update(Long id, ContentRequestDTO request) {
        ContentEntity content = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found with id: " + id));

        Long oldSubmoduleId = content.getSubmodule() != null ? content.getSubmodule().getId() : null;
        Long oldCourseId = (content.getSubmodule() != null && content.getSubmodule().getModule() != null && content.getSubmodule().getModule().getCourse() != null) 
                ? content.getSubmodule().getModule().getCourse().getId() : null;

        SubmoduleEntity submodule = submoduleRepository.findById(request.getSubmoduleId())
                .orElseThrow(() -> new ResourceNotFoundException("Submodule not found with id: " + request.getSubmoduleId()));

        ContentMapper.updateEntity(content, request, submodule);
        syncContentToAssignment(content);
        ContentEntity updatedContent = contentRepository.save(content);

        // Invalidate cache
        if (oldSubmoduleId != null) {
            redisService.delete("contents_submodule_" + oldSubmoduleId);
        }
        redisService.delete("contents_submodule_" + request.getSubmoduleId());

        if (oldCourseId != null) {
            redisService.delete("course_" + oldCourseId);
        }
        Long newCourseId = (submodule.getModule() != null && submodule.getModule().getCourse() != null) ? submodule.getModule().getCourse().getId() : null;
        if (newCourseId != null) {
            redisService.delete("course_" + newCourseId);
        }
        redisService.delete("courses_all");

        return ContentMapper.toResponseDTO(updatedContent);
    }

    @Override
    public void delete(Long id) {
        ContentEntity content = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found with id: " + id));

        Long submoduleId = content.getSubmodule() != null ? content.getSubmodule().getId() : null;
        Long courseId = (content.getSubmodule() != null && content.getSubmodule().getModule() != null && content.getSubmodule().getModule().getCourse() != null) 
                ? content.getSubmodule().getModule().getCourse().getId() : null;

        contentRepository.delete(content);

        if (content.getAssignmentId() != null) {
            try {
                assignmentRepository.deleteById(content.getAssignmentId());
            } catch (Exception e) {
                // Ignore if already deleted
            }
        }

        // Invalidate cache
        if (submoduleId != null) {
            redisService.delete("contents_submodule_" + submoduleId);
        }
        if (courseId != null) {
            redisService.delete("course_" + courseId);
        }
        redisService.delete("courses_all");
    }

    private void syncContentToAssignment(ContentEntity content) {
        if (!"assignment".equalsIgnoreCase(content.getType()) && !"quiz".equalsIgnoreCase(content.getType())) {
            return;
        }

        Assignment assignment = null;
        if (content.getAssignmentId() != null) {
            assignment = assignmentRepository.findById(content.getAssignmentId()).orElse(null);
        }

        if (assignment == null) {
            assignment = new Assignment();
            assignment.setQuestions(new java.util.ArrayList<>());
        }

        assignment.setTitle(content.getTitle());
        assignment.setDescription(content.getTitle());
        assignment.setInstructions(content.getText());

        if ("quiz".equalsIgnoreCase(content.getType())) {
            assignment.setAssignmentType(AssignmentType.QUIZ);
        } else {
            assignment.setAssignmentType(AssignmentType.PDF);
        }

        if (content.getSubmodule() != null && content.getSubmodule().getModule() != null && content.getSubmodule().getModule().getCourse() != null) {
            assignment.setSubject(content.getSubmodule().getModule().getCourse().getTitle());
        } else {
            assignment.setSubject("LMS Course Content");
        }

        if (content.getSubmodule() != null) {
            assignment.setTopic(content.getSubmodule().getTitle());
        } else {
            assignment.setTopic("LMS Module");
        }

        double totalMarks = 100.0;
        double passingMarks = 40.0;

        if (content.getText() != null && content.getText().trim().startsWith("{")) {
            try {
                JsonNode meta = objectMapper.readTree(content.getText());
                if ("quiz".equalsIgnoreCase(content.getType())) {
                    if (meta.has("quizData") && meta.get("quizData").has("questions")) {
                        JsonNode questions = meta.get("quizData").get("questions");
                        double sum = 0;
                        for (JsonNode q : questions) {
                            sum += q.has("marks") ? q.get("marks").asDouble() : 1.0;
                        }
                        if (sum > 0) totalMarks = sum;
                    }
                    if (meta.has("quizData") && meta.get("quizData").has("passingPercentage")) {
                        passingMarks = totalMarks * (meta.get("quizData").get("passingPercentage").asDouble() / 100.0);
                    }
                } else {
                    if (meta.has("assignmentData")) {
                        JsonNode asgData = meta.get("assignmentData");
                        if (asgData.has("totalMarks")) totalMarks = asgData.get("totalMarks").asDouble();
                        if (asgData.has("passingMarks")) passingMarks = asgData.get("passingMarks").asDouble();
                    }
                }
            } catch (Exception e) {
                // Ignore
            }
        }

        assignment.setTotalMarks(totalMarks);
        assignment.setPassingMarks(passingMarks);
        assignment.setDueDate(LocalDate.now().plusYears(1));
        assignment.setDueTime(LocalTime.MAX);
        assignment.setStatus(AssignmentStatus.ACTIVE);
        assignment.setLateSubmissionAllowed(true);
        assignment.setMaxFileSize(26214400L); // 25MB

        List<Teacher> teachers = teacherRepository.findAll();
        if (!teachers.isEmpty()) {
            assignment.setTeacher(teachers.get(0));
        }

        Assignment savedAssignment = assignmentRepository.save(assignment);

        if (assignment.getAssignmentType() == AssignmentType.QUIZ) {
            savedAssignment.getQuestions().clear();
            if (content.getText() != null && content.getText().trim().startsWith("{")) {
                try {
                    JsonNode meta = objectMapper.readTree(content.getText());
                    if (meta.has("quizData") && meta.get("quizData").has("questions")) {
                        JsonNode questions = meta.get("quizData").get("questions");
                        for (JsonNode qNode : questions) {
                            Question question = new Question();
                            question.setAssignment(savedAssignment);
                            question.setQuestionText(qNode.has("title") ? qNode.get("title").asText() : "");

                            JsonNode opts = qNode.get("options");
                            if (opts != null && opts.size() > 0) {
                                question.setOptionA(opts.get(0).has("text") ? opts.get(0).get("text").asText() : "");
                                if (opts.size() > 1) question.setOptionB(opts.get(1).has("text") ? opts.get(1).get("text").asText() : "");
                                if (opts.size() > 2) question.setOptionC(opts.get(2).has("text") ? opts.get(2).get("text").asText() : "");
                                if (opts.size() > 3) question.setOptionD(opts.get(3).has("text") ? opts.get(3).get("text").asText() : "");

                                String correct = "A";
                                for (int i = 0; i < opts.size(); i++) {
                                    if (opts.get(i).has("isCorrect") && opts.get(i).get("isCorrect").asBoolean()) {
                                        correct = String.valueOf((char) ('A' + i));
                                        break;
                                    }
                                }
                                question.setCorrectAnswer(correct);
                            }
                            question.setMarks(qNode.has("marks") ? qNode.get("marks").asDouble() : 1.0);
                            question.setQuestionType("MCQ");
                            savedAssignment.getQuestions().add(question);
                        }
                    }
                } catch (Exception e) {
                    // Ignore
                }
            }
            savedAssignment = assignmentRepository.save(savedAssignment);
        }

        content.setAssignmentId(savedAssignment.getId());
    }
}

