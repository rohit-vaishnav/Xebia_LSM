package com.assignment.controller;

import com.assignment.dto.SubmoduleRequestDTO;
import com.assignment.dto.SubmoduleResponseDTO;
import com.assignment.response.ApiResponse;
import com.assignment.service.SubmoduleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/submodules")
public class SubmoduleController {

    private final SubmoduleService submoduleService;

    public SubmoduleController(SubmoduleService submoduleService) {
        this.submoduleService = submoduleService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse> createSubmodule(@Valid @RequestBody SubmoduleRequestDTO request) {
        SubmoduleResponseDTO submodule = submoduleService.create(request);
        ApiResponse response = new ApiResponse("Submodule created successfully", submodule);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse> getAllSubmodules() {
        List<SubmoduleResponseDTO> submodules = submoduleService.getAll();
        ApiResponse response = new ApiResponse("Submodules retrieved successfully", submodules);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getSubmoduleById(@PathVariable Long id) {
        SubmoduleResponseDTO submodule = submoduleService.getById(id);
        ApiResponse response = new ApiResponse("Submodule retrieved successfully", submodule);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateSubmodule(@PathVariable Long id, @Valid @RequestBody SubmoduleRequestDTO request) {
        SubmoduleResponseDTO submodule = submoduleService.update(id, request);
        ApiResponse response = new ApiResponse("Submodule updated successfully", submodule);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteSubmodule(@PathVariable Long id) {
        submoduleService.delete(id);
        ApiResponse response = new ApiResponse("Submodule deleted successfully", null);
        return ResponseEntity.ok(response);
    }
}

