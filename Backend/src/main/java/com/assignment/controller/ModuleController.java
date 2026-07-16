package com.assignment.controller;

import com.assignment.dto.ModuleRequestDTO;
import com.assignment.dto.ModuleResponseDTO;
import com.assignment.response.ApiResponse;
import com.assignment.service.ModuleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/modules")
public class ModuleController {

    private final ModuleService moduleService;

    public ModuleController(ModuleService moduleService) {
        this.moduleService = moduleService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse> createModule(@Valid @RequestBody ModuleRequestDTO request) {
        ModuleResponseDTO module = moduleService.create(request);
        ApiResponse response = new ApiResponse("Module created successfully", module);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse> getAllModules() {
        List<ModuleResponseDTO> modules = moduleService.getAll();
        ApiResponse response = new ApiResponse("Modules retrieved successfully", modules);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getModuleById(@PathVariable Long id) {
        ModuleResponseDTO module = moduleService.getById(id);
        ApiResponse response = new ApiResponse("Module retrieved successfully", module);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateModule(@PathVariable Long id, @Valid @RequestBody ModuleRequestDTO request) {
        ModuleResponseDTO module = moduleService.update(id, request);
        ApiResponse response = new ApiResponse("Module updated successfully", module);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteModule(@PathVariable Long id) {
        moduleService.delete(id);
        ApiResponse response = new ApiResponse("Module deleted successfully", null);
        return ResponseEntity.ok(response);
    }
}

