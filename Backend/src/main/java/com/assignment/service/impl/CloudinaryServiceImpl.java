package com.assignment.service.impl;

import com.assignment.exception.CustomException;
import com.assignment.service.CloudinaryService;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class CloudinaryServiceImpl implements CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryServiceImpl(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @Override
    public boolean isConfigured() {
        try {
            return cloudinary.config.cloudName != null && 
                   !cloudinary.config.cloudName.trim().isEmpty() && 
                   !cloudinary.config.cloudName.equalsIgnoreCase("mock");
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public Map<String, Object> uploadFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        if (!isConfigured()) {
            Map<String, Object> mockResult = new HashMap<>();
            mockResult.put("secure_url", "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=800&auto=format&fit=crop&q=60");
            mockResult.put("url", "http://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=800&auto=format&fit=crop&q=60");
            mockResult.put("original_filename", file.getOriginalFilename());
            mockResult.put("public_id", "mock-file-" + System.currentTimeMillis());
            return mockResult;
        }

        // Upload with resource_type auto (handles images, videos, audio, pdf, ppt, raw docs, etc.)
        Map params = ObjectUtils.asMap(
            "resource_type", "auto"
        );

        // Perform the upload
        Map rawResult = cloudinary.uploader().upload(file.getBytes(), params);
        
        // Convert to Map<String, Object> securely
        Map<String, Object> result = new HashMap<>();
        if (rawResult != null) {
            for (Object key : rawResult.keySet()) {
                if (key != null) {
                    result.put(key.toString(), rawResult.get(key));
                }
            }
        }
        return result;
    }

    @Override
    public String uploadFile(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        if (!isConfigured()) {
            return "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=800&auto=format&fit=crop&q=60";
        }
        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder,
                            "resource_type", "auto"
                    )
            );
            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            throw new CustomException("Failed to upload file to Cloudinary: " + e.getMessage(), 500);
        }
    }

    @Override
    public String uploadBytes(byte[] bytes, String folder) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        if (!isConfigured()) {
            return "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=800&auto=format&fit=crop&q=60";
        }
        try {
            boolean isPdf = bytes.length > 4 && 
                            bytes[0] == 0x25 && // '%'
                            bytes[1] == 0x50 && // 'P'
                            bytes[2] == 0x44 && // 'D'
                            bytes[3] == 0x46;   // 'F'
            
            java.util.Map<String, Object> options = new java.util.HashMap<>();
            options.put("folder", folder);
            if (isPdf) {
                options.put("resource_type", "raw");
            } else {
                options.put("resource_type", "auto");
            }

            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    bytes,
                    options
            );
            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            throw new CustomException("Failed to upload bytes to Cloudinary: " + e.getMessage(), 500);
        }
    }
}
