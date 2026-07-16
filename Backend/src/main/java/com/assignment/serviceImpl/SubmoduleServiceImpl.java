package com.assignment.serviceImpl;

import com.assignment.cache.RedisService;
import com.assignment.dto.SubmoduleRequestDTO;
import com.assignment.dto.SubmoduleResponseDTO;
import com.assignment.entity.learning.ModuleEntity;
import com.assignment.entity.learning.SubmoduleEntity;
import com.assignment.exception.ResourceNotFoundException;
import com.assignment.mapper.SubmoduleMapper;
import com.assignment.repository.ModuleRepository;
import com.assignment.repository.SubmoduleRepository;
import com.assignment.service.SubmoduleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class SubmoduleServiceImpl implements SubmoduleService {

    private final SubmoduleRepository submoduleRepository;
    private final ModuleRepository moduleRepository;
    private final RedisService redisService;

    public SubmoduleServiceImpl(SubmoduleRepository submoduleRepository, ModuleRepository moduleRepository, RedisService redisService) {
        this.submoduleRepository = submoduleRepository;
        this.moduleRepository = moduleRepository;
        this.redisService = redisService;
    }

    @Override
    public SubmoduleResponseDTO create(SubmoduleRequestDTO request) {
        ModuleEntity module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new ResourceNotFoundException("Module not found with id: " + request.getModuleId()));

        SubmoduleEntity submodule = SubmoduleMapper.toEntity(request, module);
        SubmoduleEntity savedSubmodule = submoduleRepository.save(submodule);

        // Invalidate cache
        redisService.delete("submodules_module_" + request.getModuleId());
        if (module.getCourse() != null) {
            redisService.delete("course_" + module.getCourse().getId());
        }
        redisService.delete("courses_all");

        return SubmoduleMapper.toResponseDTO(savedSubmodule);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubmoduleResponseDTO> getAll() {
        return submoduleRepository.findAllWithModule().stream()
                .map(SubmoduleMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SubmoduleResponseDTO getById(Long id) {
        String cacheKey = "contents_submodule_" + id;
        Object cached = redisService.get(cacheKey);
        if (cached instanceof SubmoduleResponseDTO) {
            return (SubmoduleResponseDTO) cached;
        }

        SubmoduleEntity submodule = submoduleRepository.findByIdWithContents(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submodule not found with id: " + id));
        SubmoduleResponseDTO result = SubmoduleMapper.toResponseDTOWithContents(submodule);

        redisService.set(cacheKey, result, 30L);
        return result;
    }

    @Override
    public SubmoduleResponseDTO update(Long id, SubmoduleRequestDTO request) {
        SubmoduleEntity submodule = submoduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submodule not found with id: " + id));

        Long oldModuleId = submodule.getModule() != null ? submodule.getModule().getId() : null;
        Long oldCourseId = (submodule.getModule() != null && submodule.getModule().getCourse() != null) ? submodule.getModule().getCourse().getId() : null;

        ModuleEntity module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new ResourceNotFoundException("Module not found with id: " + request.getModuleId()));

        SubmoduleMapper.updateEntity(submodule, request, module);
        SubmoduleEntity updatedSubmodule = submoduleRepository.save(submodule);

        // Invalidate cache
        redisService.delete("contents_submodule_" + id);
        if (oldModuleId != null) {
            redisService.delete("submodules_module_" + oldModuleId);
        }
        redisService.delete("submodules_module_" + request.getModuleId());
        
        if (oldCourseId != null) {
            redisService.delete("course_" + oldCourseId);
        }
        if (module.getCourse() != null) {
            redisService.delete("course_" + module.getCourse().getId());
        }
        redisService.delete("courses_all");

        return SubmoduleMapper.toResponseDTO(updatedSubmodule);
    }

    @Override
    public void delete(Long id) {
        SubmoduleEntity submodule = submoduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submodule not found with id: " + id));

        Long moduleId = submodule.getModule() != null ? submodule.getModule().getId() : null;
        Long courseId = (submodule.getModule() != null && submodule.getModule().getCourse() != null) ? submodule.getModule().getCourse().getId() : null;

        submoduleRepository.delete(submodule);

        // Invalidate cache
        redisService.delete("contents_submodule_" + id);
        if (moduleId != null) {
            redisService.delete("submodules_module_" + moduleId);
        }
        if (courseId != null) {
            redisService.delete("course_" + courseId);
        }
        redisService.delete("courses_all");
    }
}

