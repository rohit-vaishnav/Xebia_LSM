package com.assignment.service;

import com.assignment.dto.CourseRequestDTO;
import com.assignment.dto.CourseResponseDTO;

import java.util.List;

public interface CourseService {
    CourseResponseDTO create(CourseRequestDTO request);
    List<CourseResponseDTO> getAll();
    CourseResponseDTO getById(Long id);
    CourseResponseDTO update(Long id, CourseRequestDTO request);
    void delete(Long id);
}

