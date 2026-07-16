package com.assignment.controller;

import com.assignment.dto.response.ApiResponse;
import com.assignment.entity.DiscussionPost;
import com.assignment.entity.Student;
import com.assignment.entity.Teacher;
import com.assignment.repository.DiscussionRepository;
import com.assignment.repository.StudentRepository;
import com.assignment.repository.TeacherRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/student/discussions")
@RequiredArgsConstructor
public class DiscussionController {

    private final DiscussionRepository discussionRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping
    public ResponseEntity<ApiResponse<List<DiscussionPost>>> getAllDiscussions() {
        List<DiscussionPost> posts = discussionRepository.findAll();
        posts.sort((a, b) -> b.getId().compareTo(a.getId()));
        return ResponseEntity.ok(ApiResponse.success("Discussions retrieved successfully", posts));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DiscussionPost>> createPost(
            @RequestBody Map<String, String> payload,
            Principal principal
    ) {
        String message = payload.get("message");
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Message is required", 400));
        }

        String email = principal.getName();
        String name = "User";
        String role = "STUDENT";

        Optional<Student> studentOpt = studentRepository.findByEmail(email);
        if (studentOpt.isPresent()) {
            name = studentOpt.get().getFullName();
            role = "STUDENT";
        } else {
            Optional<Teacher> teacherOpt = teacherRepository.findByEmail(email);
            if (teacherOpt.isPresent()) {
                name = teacherOpt.get().getFullName();
                role = "TEACHER";
            }
        }

        DiscussionPost post = DiscussionPost.builder()
                .userEmail(email)
                .userName(name)
                .userRole(role)
                .message(message)
                .repliesJson("[]")
                .likes(0)
                .build();

        DiscussionPost saved = discussionRepository.save(post);
        return ResponseEntity.status(201).body(ApiResponse.success("Post created successfully", saved, 201));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<DiscussionPost>> likePost(@PathVariable Long id) {
        DiscussionPost post = discussionRepository.findById(id)
                .orElseThrow(() -> new com.assignment.exception.ResourceNotFoundException("Post not found"));
        post.setLikes(post.getLikes() + 1);
        DiscussionPost saved = discussionRepository.save(post);
        return ResponseEntity.ok(ApiResponse.success("Post liked successfully", saved));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<ApiResponse<DiscussionPost>> addReply(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            Principal principal
    ) {
        String replyMsg = payload.get("message");
        if (replyMsg == null || replyMsg.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Reply message is required", 400));
        }

        DiscussionPost post = discussionRepository.findById(id)
                .orElseThrow(() -> new com.assignment.exception.ResourceNotFoundException("Post not found"));

        String email = principal.getName();
        String name = "User";
        String role = "STUDENT";

        Optional<Student> studentOpt = studentRepository.findByEmail(email);
        if (studentOpt.isPresent()) {
            name = studentOpt.get().getFullName();
            role = "STUDENT";
        } else {
            Optional<Teacher> teacherOpt = teacherRepository.findByEmail(email);
            if (teacherOpt.isPresent()) {
                name = teacherOpt.get().getFullName();
                role = "TEACHER";
            }
        }

        try {
            ArrayNode replies = (ArrayNode) objectMapper.readTree(post.getRepliesJson() != null ? post.getRepliesJson() : "[]");
            ObjectNode replyNode = objectMapper.createObjectNode();
            replyNode.put("id", System.currentTimeMillis());
            replyNode.put("user", name);
            replyNode.put("email", email);
            replyNode.put("role", role);
            replyNode.put("message", replyMsg);
            replyNode.put("time", LocalDateTime.now().toString());

            replies.add(replyNode);
            post.setRepliesJson(objectMapper.writeValueAsString(replies));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to add reply: " + e.getMessage(), 500));
        }

        DiscussionPost saved = discussionRepository.save(post);
        return ResponseEntity.ok(ApiResponse.success("Reply added successfully", saved));
    }
}
