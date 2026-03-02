import { fetchWithAuth } from './api';

export interface TestCase {
    test_case_id: string; // UUID
    input: string;
    expected_output: string;
    is_sample: boolean;
    points: number;
}

export interface Problem {
    problem_id: string; // UUID
    problem_code: string;
    title: string;
    description?: string;
    difficulty: string;
    time_limit: number;
    memory_limit: number;
    allowed_languages: string[];
    sample_test_cases?: TestCase[];
    course_id?: string;
}

export interface Submission {
    submission_id: string; // UUID
    student_id: string; // UUID
    problem_id: string; // UUID
    language: string;
    source_code: string;
    status: string;
    score: number;
    execution_time?: number;
    memory_used?: number;
    test_cases_passed: number;
    total_test_cases: number;
    created_at: string;
    test_results?: any[];
}

export interface StudentBasicInfo {
    student_id: string;
    student_code: string;
    user: {
        full_name: string;
        email: string;
    };
}

export interface SubmissionWithStudent extends Submission {
    student: StudentBasicInfo;
}

export interface SubmissionCreate {
    problem_id: string; // UUID
    language: string;
    source_code: string;
    assignment_id?: string; // UUID
}

export const codingService = {
    async getProblems(courseId?: string) {
        const url = courseId ? `/coding/problems?course_id=${courseId}` : '/coding/problems';
        const response = await fetchWithAuth(url);
        if (!response.ok) throw new Error('Failed to fetch problems');
        return response.json();
    },

    async getProblem(id: string) {
        const response = await fetchWithAuth(`/coding/problems/${id}`);
        if (!response.ok) throw new Error('Failed to fetch problem');
        return response.json();
    },

    async createSubmission(data: SubmissionCreate) {
        const response = await fetchWithAuth('/coding/submissions', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to submit solution');
        }
        return response.json();
    },

    async getSubmission(id: string) {
        const response = await fetchWithAuth(`/coding/submissions/${id}`);
        if (!response.ok) throw new Error('Failed to fetch submission');
        return response.json();
    },

    async getMySubmissions() {
        const response = await fetchWithAuth('/coding/my-submissions');
        if (!response.ok) throw new Error('Failed to fetch submissions');
        return response.json();
    },

    async getProblemSubmissions(problemId: string) {
        const response = await fetchWithAuth(`/coding/problems/${problemId}/submissions`);
        if (!response.ok) throw new Error('Không thể tải lịch sử nộp bài');
        return response.json();
    },

    async getAllProblemSubmissions(problemId: string) {
        const response = await fetchWithAuth(`/coding/problems/${problemId}/all-submissions`);
        if (!response.ok) throw new Error('Không thể tải danh sách nộp bài');
        return response.json();
    },

    // --- Admin Functions ---

    async createProblem(data: Omit<Problem, 'problem_id' | 'sample_test_cases'>) {
        const response = await fetchWithAuth('/coding/problems', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể tạo bài tập');
        }
        return response.json();
    },

    async updateProblem(id: string, data: Omit<Problem, 'problem_id' | 'sample_test_cases'>) {
        const response = await fetchWithAuth(`/coding/problems/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể cập nhật bài tập');
        }
        return response.json();
    },

    async deleteProblem(id: string) {
        const response = await fetchWithAuth(`/coding/problems/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể xóa bài tập');
        }
        return response.json();
    },

    async getTestCases(problemId: string) {
        const response = await fetchWithAuth(`/coding/problems/${problemId}/test-cases`);
        if (!response.ok) throw new Error('Không thể tải test cases');
        return response.json();
    },

    async createTestCase(problemId: string, data: Omit<TestCase, 'test_case_id'>) {
        const response = await fetchWithAuth(`/coding/problems/${problemId}/test-cases`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể tạo test case');
        }
        return response.json();
    },

    async deleteTestCase(testCaseId: string) {
        const response = await fetchWithAuth(`/coding/test-cases/${testCaseId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể xóa test case');
        }
        return response.json();
    },

    async updateTestCase(testCaseId: string, data: Omit<TestCase, 'test_case_id'>) {
        const response = await fetchWithAuth(`/coding/test-cases/${testCaseId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Không thể cập nhật test case');
        }
        return response.json();
    },

    async bulkCreateTestCases(problemId: string, testCases: Omit<TestCase, 'test_case_id'>[]) {
        // Create multiple test cases sequentially
        const results = [];
        for (const tc of testCases) {
            const response = await fetchWithAuth(`/coding/problems/${problemId}/test-cases`, {
                method: 'POST',
                body: JSON.stringify(tc)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `Không thể tạo test case: ${tc.input.substring(0, 20)}...`);
            }
            results.push(await response.json());
        }
        return results;
    }
};
