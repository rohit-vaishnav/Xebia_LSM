package com.assignment.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Map;

public interface CloudinaryService {
    Map<String, Object> uploadFile(MultipartFile file) throws IOException;
    boolean isConfigured();
    
    // Existing AMS methods
    String uploadFile(MultipartFile file, String folder);
    String uploadBytes(byte[] bytes, String folder);
}
