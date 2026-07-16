package com.assignment.service;

import com.assignment.dto.ContentRequestDTO;
import com.assignment.dto.ContentResponseDTO;

import java.util.List;

public interface ContentService {
    ContentResponseDTO create(ContentRequestDTO request);
    List<ContentResponseDTO> getAll();
    ContentResponseDTO getById(Long id);
    ContentResponseDTO update(Long id, ContentRequestDTO request);
    void delete(Long id);
}


