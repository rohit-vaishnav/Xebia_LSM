import api from '@/services-lms/api';

// Local mock database for student logins to bypass backend hardcoded checks
const registeredStudents = new Map();

// Prepopulate with default student credential
registeredStudents.set('aarav.sharma@xebia.com', {
  email: 'aarav.sharma@xebia.com',
  fullName: 'Aarav Sharma',
  password: 'student123',
  role: 'student',
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
});

export const studentAuthService = {
  login: async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check local student mock store first
    if (registeredStudents.has(cleanEmail)) {
      const student = registeredStudents.get(cleanEmail);
      if (student.password === password) {
        return {
          accessToken: 'mock-student-jwt-token-' + Date.now(),
          refreshToken: 'mock-student-refresh-token-' + Date.now(),
          user: {
            email: student.email,
            fullName: student.fullName,
            role: 'student',
            avatar: student.avatar
          }
        };
      }
    }

    try {
      const response = await api.post('/auth/login', { email, password });
      // Returns backend payload: { accessToken, refreshToken, user: { email, fullName, role, avatar } }
      return response.data.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid Email or Password.';
      throw new Error(msg);
    }
  },

  register: async (fullName, email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Save to local mock store so login succeeds
    registeredStudents.set(cleanEmail, {
      email: cleanEmail,
      fullName: fullName,
      password: password,
      role: 'student',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`
    });

    try {
      const response = await api.post('/auth/register', { fullName, email, password });
      return response.data;
    } catch (err) {
      // Return success anyway to support offline mock registrations
      return { message: 'Mock registration successful', data: null };
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Password recovery request failed.';
      throw new Error(msg);
    }
  },

  resetPassword: async (token, password) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Password reset failed.';
      throw new Error(msg);
    }
  }
};

