package com.assignment.service;

import com.assignment.dto.CategoryRequestDTO;
import com.assignment.dto.CategoryResponseDTO;
import com.assignment.dto.CategoryWiseCourseResponseDTO;

import java.util.List;

public interface CategoryService {
    CategoryResponseDTO create(CategoryRequestDTO request);
    List<CategoryResponseDTO> getAll();
    CategoryResponseDTO getById(Long id);
    CategoryWiseCourseResponseDTO getCategoryCourses(Long categoryId);
    CategoryResponseDTO update(Long id, CategoryRequestDTO request);
    void delete(Long id);
}


