package com.assignment.controller;

import com.assignment.dto.request.LoginRequest;
import com.assignment.dto.request.StudentRegisterRequest;
import com.assignment.dto.request.TeacherRegisterRequest;
import com.assignment.dto.response.ApiResponse;
import com.assignment.dto.response.AuthResponse;
import com.assignment.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Simple refresh request model
    public static class RefreshRequest {
        private String refreshToken;
        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    }

    private void setJwtCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("JWT_TOKEN", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // In production, set to true to enforce HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(24 * 60 * 60); // 24 hours
        response.addCookie(cookie);
    }

    @PostMapping("/register/teacher")
    public ResponseEntity<ApiResponse<AuthResponse>> registerTeacher(
            @Valid @RequestBody TeacherRegisterRequest request,
            HttpServletResponse servletResponse
    ) {
        AuthResponse response = authService.registerTeacher(request);
        setJwtCookie(servletResponse, response.getToken());
        return ResponseEntity.ok(ApiResponse.success("Teacher registered successfully", response));
    }

    @PostMapping("/register/student")
    public ResponseEntity<ApiResponse<AuthResponse>> registerStudent(
            @Valid @RequestBody StudentRegisterRequest request,
            HttpServletResponse servletResponse
    ) {
        AuthResponse response = authService.registerStudent(request);
        setJwtCookie(servletResponse, response.getToken());
        return ResponseEntity.ok(ApiResponse.success("Student registered successfully", response));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse servletResponse
    ) {
        if (request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email and password are required", 400));
        }

        String email = request.getEmail().trim().toLowerCase();
        String password = request.getPassword();

        // 1. Check for LMS Admin / Instructor credentials
        if ("admin@xebia.com".equals(email) && "admin123".equals(password)) {
            Map<String, Object> responseData = createAuthResponse(email, "Sarah Chen");
            return ResponseEntity.ok(ApiResponse.success("Login successful", responseData));
        } else if ("instructor@xebia.com".equals(email) && "instructor123".equals(password)) {
            Map<String, Object> responseData = createAuthResponse(email, "Priya Sharma");
            return ResponseEntity.ok(ApiResponse.success("Login successful", responseData));
        }

        // 2. Delegate to normal AMS authentication
        AuthResponse response = authService.login(request);
        setJwtCookie(servletResponse, response.getToken());
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, Object>>> refresh(@RequestBody RefreshRequest request) {
        if (request.getRefreshToken() == null || !request.getRefreshToken().startsWith("mock-refresh-")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid refresh token", 401));
        }

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("accessToken", "mock-jwt-access-token-" + System.currentTimeMillis());
        responseData.put("refreshToken", request.getRefreshToken());
        responseData.put("expiresIn", 3600); // 1 hour

        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", responseData));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfile(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Missing or invalid authorization header", 401));
        }

        Map<String, Object> user = new HashMap<>();
        user.put("email", "admin@xebia.com");
        user.put("fullName", "Sarah Chen");
        user.put("role", "Admin");
        user.put("avatar", "https://api.dicebear.com/7.x/initials/svg?seed=Sarah%20Chen");

        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", user));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse servletResponse) {
        Cookie cookie = new Cookie("JWT_TOKEN", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        servletResponse.addCookie(cookie);
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @GetMapping("/batches")
    public ResponseEntity<ApiResponse<java.util.List<com.assignment.dto.response.BatchResponse>>> getPublicBatches() {
        java.util.List<com.assignment.dto.response.BatchResponse> response = authService.getPublicBatches();
        return ResponseEntity.ok(ApiResponse.success("Batches retrieved successfully", response));
    }

    @PutMapping("/profile/update")
    public ResponseEntity<ApiResponse<AuthResponse>> updateProfile(
            @RequestParam("name") String name,
            java.security.Principal principal
    ) {
        if (principal == null) {
            throw new com.assignment.exception.UnauthorizedException("Access Denied: You must be logged in to update your profile");
        }
        AuthResponse response = authService.updateProfile(principal.getName(), name);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", response));
    }

    private Map<String, Object> createAuthResponse(String email, String name) {
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("accessToken", "mock-jwt-access-token-" + System.currentTimeMillis());
        responseData.put("refreshToken", "mock-refresh-token-" + System.currentTimeMillis());
        responseData.put("expiresIn", 3600); // 1 hour

        Map<String, Object> user = new HashMap<>();
        user.put("email", email);
        user.put("fullName", name);
        user.put("role", "Admin");
        user.put("avatar", "https://api.dicebear.com/7.x/initials/svg?seed=" + name.replace(" ", "%20"));

        responseData.put("user", user);
        return responseData;
    }
}
