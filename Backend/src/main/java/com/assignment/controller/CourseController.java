package com.assignment.controller;

import com.assignment.dto.CourseRequestDTO;
import com.assignment.dto.CourseResponseDTO;
import com.assignment.response.ApiResponse;
import com.assignment.service.CourseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse> createCourse(@Valid @RequestBody CourseRequestDTO request) {
        CourseResponseDTO course = courseService.create(request);
        ApiResponse response = new ApiResponse("Course created successfully", course);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse> getAllCourses() {
        List<CourseResponseDTO> courses = courseService.getAll();
        ApiResponse response = new ApiResponse("Courses retrieved successfully", courses);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getCourseById(@PathVariable Long id) {
        CourseResponseDTO course = courseService.getById(id);
        ApiResponse response = new ApiResponse("Course retrieved successfully", course);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateCourse(@PathVariable Long id, @Valid @RequestBody CourseRequestDTO request) {
        CourseResponseDTO course = courseService.update(id, request);
        ApiResponse response = new ApiResponse("Course updated successfully", course);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteCourse(@PathVariable Long id) {
        courseService.delete(id);
        ApiResponse response = new ApiResponse("Course deleted successfully", null);
        return ResponseEntity.ok(response);
    }
}

