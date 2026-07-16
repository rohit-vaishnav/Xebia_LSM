package com.assignment.serviceImpl;

import com.assignment.cache.RedisService;
import com.assignment.dto.CourseRequestDTO;
import com.assignment.dto.CourseResponseDTO;
import com.assignment.entity.learning.CategoryEntity;
import com.assignment.entity.learning.CourseEntity;
import com.assignment.exception.ResourceNotFoundException;
import com.assignment.mapper.CourseMapper;
import com.assignment.repository.CategoryRepository;
import com.assignment.repository.CourseRepository;
import com.assignment.service.CourseService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final CategoryRepository categoryRepository;
    private final RedisService redisService;

    public CourseServiceImpl(CourseRepository courseRepository, CategoryRepository categoryRepository, RedisService redisService) {
        this.courseRepository = courseRepository;
        this.categoryRepository = categoryRepository;
        this.redisService = redisService;
    }

    private boolean shouldFilterPublishedOnly() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                boolean isAdmin = auth.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
                return !isAdmin;
            }
        } catch (Exception e) {
            // ignore
        }
        return true;
    }

    @Override
    public CourseResponseDTO create(CourseRequestDTO request) {
        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + request.getCategoryId()));

        CourseEntity course = CourseMapper.toEntity(request, category);
        CourseEntity savedCourse = courseRepository.save(course);

        // Invalidate cache
        redisService.delete("courses_all");
        redisService.delete("courses_published_only");
        redisService.delete("category_courses_" + request.getCategoryId());

        return CourseMapper.toResponseDTO(savedCourse);
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<CourseResponseDTO> getAll() {
        String cacheKey = "courses_all";
        boolean filterPublished = shouldFilterPublishedOnly();
        if (filterPublished) {
            cacheKey = "courses_published_only";
        }
        Object cached = redisService.get(cacheKey);
        if (cached instanceof List) {
            return (List<CourseResponseDTO>) cached;
        }

        List<CourseResponseDTO> result = courseRepository.findAll().stream()
                .filter(course -> !filterPublished || Boolean.TRUE.equals(course.getIsPublished()))
                .map(course -> {
                    if (course.getCategory() != null) {
                        course.getCategory().getName();
                    }
                    return CourseMapper.toResponseDTO(course);
                })
                .collect(Collectors.toList());

        redisService.set(cacheKey, result, 30L);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResponseDTO getById(Long id) {
        String cacheKey = "course_" + id;
        Object cached = redisService.get(cacheKey);
        if (cached instanceof CourseResponseDTO) {
            CourseResponseDTO cachedCourse = (CourseResponseDTO) cached;
            if (shouldFilterPublishedOnly() && !Boolean.TRUE.equals(cachedCourse.getIsPublished())) {
                throw new ResourceNotFoundException("Course not found with id: " + id);
            }
            return cachedCourse;
        }

        CourseEntity course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));

        if (shouldFilterPublishedOnly() && !Boolean.TRUE.equals(course.getIsPublished())) {
            throw new ResourceNotFoundException("Course not found with id: " + id);
        }

        if (course.getModules() != null) {
            course.getModules().forEach(module -> {
                if (module.getSubmodules() != null) {
                    module.getSubmodules().forEach(submodule -> {
                        if (submodule.getContents() != null) {
                            submodule.getContents().size();
                        }
                    });
                }
            });
        }
        CourseResponseDTO result = CourseMapper.toResponseDTOWithModules(course);

        redisService.set(cacheKey, result, 30L);
        return result;
    }

    @Override
    public CourseResponseDTO update(Long id, CourseRequestDTO request) {
        CourseEntity course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));

        Long oldCategoryId = course.getCategory() != null ? course.getCategory().getId() : null;

        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + request.getCategoryId()));

        CourseMapper.updateEntity(course, request, category);
        CourseEntity updatedCourse = courseRepository.save(course);

        // Invalidate cache
        redisService.delete("courses_all");
        redisService.delete("courses_published_only");
        redisService.delete("course_" + id);
        redisService.delete("modules_course_" + id);
        if (oldCategoryId != null) {
            redisService.delete("category_courses_" + oldCategoryId);
        }
        redisService.delete("category_courses_" + request.getCategoryId());

        return CourseMapper.toResponseDTO(updatedCourse);
    }

    @Override
    public void delete(Long id) {
        CourseEntity course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));
        
        Long categoryId = course.getCategory() != null ? course.getCategory().getId() : null;

        courseRepository.delete(course);

        // Invalidate cache
        redisService.delete("courses_all");
        redisService.delete("courses_published_only");
        redisService.delete("course_" + id);
        redisService.delete("modules_course_" + id);
        if (categoryId != null) {
            redisService.delete("category_courses_" + categoryId);
        }
    }
}

