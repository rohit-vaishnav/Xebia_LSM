package com.assignment.repository;

import com.assignment.entity.learning.CourseEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<CourseEntity, Long> {
    Optional<CourseEntity> findBySlug(String slug);

    @EntityGraph(attributePaths = {"modules", "modules.submodules", "modules.submodules.contents"})
    @Query("SELECT c FROM CourseEntity c WHERE c.id = :id")
    Optional<CourseEntity> findByIdWithModules(@Param("id") Long id);

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT c FROM CourseEntity c")
    List<CourseEntity> findAllWithCategory();
}

