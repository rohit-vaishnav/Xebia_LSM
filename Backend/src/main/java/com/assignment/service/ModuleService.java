package com.assignment.service;

import com.assignment.dto.ModuleRequestDTO;
import com.assignment.dto.ModuleResponseDTO;

import java.util.List;

public interface ModuleService {
    ModuleResponseDTO create(ModuleRequestDTO request);
    List<ModuleResponseDTO> getAll();
    ModuleResponseDTO getById(Long id);
    ModuleResponseDTO update(Long id, ModuleRequestDTO request);
    void delete(Long id);
}


