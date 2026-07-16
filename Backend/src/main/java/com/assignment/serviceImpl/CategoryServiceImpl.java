package com.assignment.serviceImpl;

import com.assignment.cache.RedisService;
import com.assignment.dto.CategoryRequestDTO;
import com.assignment.dto.CategoryResponseDTO;
import com.assignment.dto.CategoryWiseCourseResponseDTO;
import com.assignment.entity.learning.CategoryEntity;
import com.assignment.exception.ResourceNotFoundException;
import com.assignment.mapper.CategoryMapper;
import com.assignment.repository.CategoryRepository;
import com.assignment.service.CategoryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final RedisService redisService;

    public CategoryServiceImpl(CategoryRepository categoryRepository, RedisService redisService) {
        this.categoryRepository = categoryRepository;
        this.redisService = redisService;
    }

    @Override
    public CategoryResponseDTO create(CategoryRequestDTO request) {
        CategoryEntity category = CategoryMapper.toEntity(request);
        CategoryEntity savedCategory = categoryRepository.save(category);
        
        // Invalidate categories list cache
        redisService.delete("categories_all");
        
        return CategoryMapper.toResponseDTO(savedCategory);
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<CategoryResponseDTO> getAll() {
        String cacheKey = "categories_all";
        Object cached = redisService.get(cacheKey);
        if (cached instanceof List) {
            return (List<CategoryResponseDTO>) cached;
        }

        List<CategoryResponseDTO> result = categoryRepository.findAll().stream()
                .map(CategoryMapper::toResponseDTO)
                .collect(Collectors.toList());

        redisService.set(cacheKey, result, 30L);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponseDTO getById(Long id) {
        String cacheKey = "category_" + id;
        Object cached = redisService.get(cacheKey);
        if (cached instanceof CategoryResponseDTO) {
            return (CategoryResponseDTO) cached;
        }

        CategoryEntity category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        CategoryResponseDTO result = CategoryMapper.toResponseDTO(category);

        redisService.set(cacheKey, result, 30L);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryWiseCourseResponseDTO getCategoryCourses(Long categoryId) {
        String cacheKey = "category_courses_" + categoryId;
        Object cached = redisService.get(cacheKey);
        if (cached instanceof CategoryWiseCourseResponseDTO) {
            return (CategoryWiseCourseResponseDTO) cached;
        }

        CategoryEntity category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
        if (category.getCourses() != null) {
            category.getCourses().size();
        }
        CategoryWiseCourseResponseDTO result = CategoryMapper.toCategoryWiseCourseResponseDTO(category);

        redisService.set(cacheKey, result, 30L);
        return result;
    }

    @Override
    public CategoryResponseDTO update(Long id, CategoryRequestDTO request) {
        CategoryEntity category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        CategoryMapper.updateEntity(category, request);
        CategoryEntity updatedCategory = categoryRepository.save(category);

        // Invalidate cache
        redisService.delete("categories_all");
        redisService.delete("category_" + id);
        redisService.delete("category_courses_" + id);

        return CategoryMapper.toResponseDTO(updatedCategory);
    }

    @Override
    public void delete(Long id) {
        CategoryEntity category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        categoryRepository.delete(category);

        // Invalidate cache
        redisService.delete("categories_all");
        redisService.delete("category_" + id);
        redisService.delete("category_courses_" + id);
    }
}

