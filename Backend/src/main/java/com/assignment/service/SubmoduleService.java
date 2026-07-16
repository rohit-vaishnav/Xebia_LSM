package com.assignment.service;

import com.assignment.dto.SubmoduleRequestDTO;
import com.assignment.dto.SubmoduleResponseDTO;

import java.util.List;

public interface SubmoduleService {
    SubmoduleResponseDTO create(SubmoduleRequestDTO request);
    List<SubmoduleResponseDTO> getAll();
    SubmoduleResponseDTO getById(Long id);
    SubmoduleResponseDTO update(Long id, SubmoduleRequestDTO request);
    void delete(Long id);
}


