import { fetchWithAuth } from './api';

// --- Types ---
export interface Course {
    course_id: string;
    course_code: string;
    course_name: string;
    category?: string;
    programming_languages: string[];
    problem_count?: number;
    enrollment_count?: number;  // Changed from class_count
}

export interface Class {
    class_id: string;
    class_code: string;
    semester?: string;
    academic_year?: string;
    department?: string;
    lecturer_id?: string;
    lecturer_name?: string;
    student_count?: number;
    course_id: string;
    course_name?: string;
    assignment_count?: number;
}

export interface Assignment {
    assignment_id: string;
    course_id: string;
    problem_id: string;
    title: string;
    description?: string;
    max_score: number;
    start_date?: string;
    due_date?: string;
    problem_title?: string;
    course_name?: string;
    submission_count?: number;
    completed_count?: number;
}

export interface EnrolledStudent {
    student_id: string;
    student_code: string;
    full_name: string;
    class_name?: string;
}

// --- Course Service ---
export const courseService = {
    async getCourses(): Promise<Course[]> {
        const response = await fetchWithAuth('/courses/');
        if (!response.ok) throw new Error('Không thể tải danh sách Học phần');
        return response.json();
    },

    async getCourse(id: string): Promise<Course> {
        const response = await fetchWithAuth(`/courses/${id}`);
        if (!response.ok) throw new Error('Không thể tải Học phần');
        return response.json();
    },

    async createCourse(data: Omit<Course, 'course_id' | 'problem_count' | 'enrollment_count'>): Promise<Course> {
        const response = await fetchWithAuth('/courses/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể tạo Học phần');
        }
        return response.json();
    },

    async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
        const response = await fetchWithAuth(`/courses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể cập nhật Học phần');
        }
        return response.json();
    },

    async deleteCourse(id: string): Promise<void> {
        const response = await fetchWithAuth(`/courses/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể xóa Học phần');
        }
    },

    // Get students enrolled in a course
    async getEnrolledStudents(courseId: string): Promise<EnrolledStudent[]> {
        const response = await fetchWithAuth(`/enrollments/course/${courseId}/students`);
        if (!response.ok) throw new Error('Không thể tải danh sách sinh viên');
        return response.json();
    },

    // Enroll students in a course
    async enrollStudents(courseId: string, studentIds: string[]): Promise<void> {
        const response = await fetchWithAuth(`/enrollments/course/${courseId}/enroll`, {
            method: 'POST',
            body: JSON.stringify({ student_ids: studentIds })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể đăng ký sinh viên');
        }
    },

    // Unenroll a student from a course
    async unenrollStudent(courseId: string, studentId: string): Promise<void> {
        const response = await fetchWithAuth(`/enrollments/course/${courseId}/students/${studentId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể hủy đăng ký sinh viên');
        }
    }
};

// --- Class Service (Administrative Class) ---
export const classService = {
    async getClasses(): Promise<Class[]> {
        const response = await fetchWithAuth('/classes/');
        if (!response.ok) throw new Error('Không thể tải danh sách lớp học');
        return response.json();
    },

    async getClass(id: string): Promise<Class> {
        const response = await fetchWithAuth(`/classes/${id}`);
        if (!response.ok) throw new Error('Không thể tải lớp học');
        return response.json();
    },

    async createClass(data: { class_code: string; course_id: string; lecturer_id?: string; semester?: string; academic_year?: string; department?: string }): Promise<Class> {
        const response = await fetchWithAuth('/classes/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể tạo lớp học');
        }
        return response.json();
    },

    async updateClass(id: string, data: Partial<Class>): Promise<Class> {
        const response = await fetchWithAuth(`/classes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể cập nhật lớp học');
        }
        return response.json();
    },

    async deleteClass(id: string): Promise<void> {
        const response = await fetchWithAuth(`/classes/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể xóa lớp học');
        }
    },

    async getStudents(classId: string): Promise<EnrolledStudent[]> {
        const response = await fetchWithAuth(`/classes/${classId}/students`);
        if (!response.ok) throw new Error('Không thể tải danh sách sinh viên');
        return response.json();
    },

    async assignStudents(classId: string, studentIds: string[]): Promise<void> {
        const response = await fetchWithAuth(`/classes/${classId}/students`, {
            method: 'POST',
            body: JSON.stringify({ student_ids: studentIds })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể thêm sinh viên');
        }
    },

    async removeStudent(classId: string, studentId: string): Promise<void> {
        const response = await fetchWithAuth(`/classes/${classId}/students/${studentId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể xóa sinh viên');
        }
    }
};

// --- Assignment Service ---
export const assignmentService = {
    async getAssignments(classId?: string): Promise<Assignment[]> {
        const url = classId ? `/assignments/?class_id=${classId}` : '/assignments/';
        const response = await fetchWithAuth(url);
        if (!response.ok) throw new Error('Không thể tải danh sách bài tập');
        return response.json();
    },

    async getMyAssignments(): Promise<Assignment[]> {
        const response = await fetchWithAuth('/assignments/my-assignments');
        if (!response.ok) throw new Error('Không thể tải danh sách bài tập');
        return response.json();
    },

    async getAssignment(id: string): Promise<Assignment> {
        const response = await fetchWithAuth(`/assignments/${id}`);
        if (!response.ok) throw new Error('Không thể tải bài tập');
        return response.json();
    },

    async createAssignment(data: {
        course_id: string;
        problem_id: string;
        title: string;
        description?: string;
        max_score?: number;
        start_date?: string;
        due_date?: string;
    }): Promise<Assignment> {
        const response = await fetchWithAuth('/assignments/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể tạo bài tập');
        }
        return response.json();
    },

    async updateAssignment(id: string, data: Partial<Assignment>): Promise<Assignment> {
        const response = await fetchWithAuth(`/assignments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể cập nhật bài tập');
        }
        return response.json();
    },

    async deleteAssignment(id: string): Promise<void> {
        const response = await fetchWithAuth(`/assignments/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể xóa bài tập');
        }
    },

    async getSubmissions(assignmentId: string): Promise<any[]> {
        const response = await fetchWithAuth(`/assignments/${assignmentId}/submissions`);
        if (!response.ok) throw new Error('Không thể tải danh sách nộp bài');
        return response.json();
    }
};
