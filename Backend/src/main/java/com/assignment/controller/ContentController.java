package com.assignment.controller;

import com.assignment.dto.ContentRequestDTO;
import com.assignment.dto.ContentResponseDTO;
import com.assignment.response.ApiResponse;
import com.assignment.service.ContentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contents")
public class ContentController {

    private final ContentService contentService;

    public ContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse> createContent(@Valid @RequestBody ContentRequestDTO request) {
        ContentResponseDTO content = contentService.create(request);
        ApiResponse response = new ApiResponse("Content created successfully", content);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse> getAllContents() {
        List<ContentResponseDTO> contents = contentService.getAll();
        ApiResponse response = new ApiResponse("Contents retrieved successfully", contents);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getContentById(@PathVariable Long id) {
        ContentResponseDTO content = contentService.getById(id);
        ApiResponse response = new ApiResponse("Content retrieved successfully", content);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateContent(@PathVariable Long id, @Valid @RequestBody ContentRequestDTO request) {
        ContentResponseDTO content = contentService.update(id, request);
        ApiResponse response = new ApiResponse("Content updated successfully", content);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteContent(@PathVariable Long id) {
        contentService.delete(id);
        ApiResponse response = new ApiResponse("Content deleted successfully", null);
        return ResponseEntity.ok(response);
    }
}

