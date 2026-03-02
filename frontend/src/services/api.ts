const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    let token = sessionStorage.getItem('token');

    // Helper to construct headers
    const getHeaders = (t: string | null) => ({
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...options.headers,
    });

    let response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: getHeaders(token),
    });

    if (response.status === 401) {
        const refreshToken = sessionStorage.getItem('refresh_token');
        if (refreshToken) {
            try {
                // Try to refresh
                const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    sessionStorage.setItem('token', data.access_token);
                    // If backend rotates refresh token, update it here too
                    if (data.refresh_token) {
                        sessionStorage.setItem('refresh_token', data.refresh_token);
                    }

                    // Retry original request
                    return fetch(`${API_URL}${url}`, {
                        ...options,
                        headers: getHeaders(data.access_token),
                    });
                }
            } catch (error) {
                console.error("Refresh token failed", error);
            }
        }

        // If we get here, refresh failed or no refresh token
        authService.logout();
    }

    return response;
}

export const authService = {
    async login(email: string, password: string) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();
        sessionStorage.setItem('token', data.access_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        sessionStorage.setItem('role', data.role); // Store role
        if (data.must_change_password) {
            sessionStorage.setItem('must_change_password', 'true');
        } else {
            sessionStorage.removeItem('must_change_password');
        }
        return data;
    },

    logout() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refresh_token');
        window.location.href = '/login';
    },

    isAuthenticated() {
        return !!sessionStorage.getItem('token');
    },

    getRole() {
        return sessionStorage.getItem('role');
    }
};

export const userService = {
    async getUsers() {
        const response = await fetchWithAuth('/users/');
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    async createUser(userData: any) {
        const response = await fetchWithAuth('/users/', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create user');
        }
        return response.json();
    },

    async bulkImportStudents(data: { class_id?: string; course_id?: string; students: any[] }) {
        const response = await fetchWithAuth('/users/bulk-import', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to import students');
        }
        return response.json();
    },

    async getStudents(classId?: string, courseId?: string, search?: string) {
        const params = new URLSearchParams();
        if (classId) params.append('class_id', classId);
        if (courseId) params.append('course_id', courseId);
        if (search) params.append('search', search);

        const url = `/users/students?${params.toString()}`;
        const response = await fetchWithAuth(url);
        if (!response.ok) throw new Error('Failed to fetch students');
        return response.json();
    },

    async sendActivationEmails(userIds: string[]) {
        const response = await fetchWithAuth('/users/send-activation-emails', {
            method: 'POST',
            body: JSON.stringify({ user_ids: userIds })
        });
        if (!response.ok) throw new Error('Failed to send emails');
        return response.json();
    },

    async getProfile() {
        const response = await fetchWithAuth('/users/me');
        if (!response.ok) throw new Error('Failed to fetch profile');
        return response.json();
    },

    async changePassword(data: any) {
        const response = await fetchWithAuth('/users/me/password', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to change password');
        }
        return response.json();
    }
};

export const menuService = {
    async getMyMenu() {
        const response = await fetchWithAuth('/menus/my-menu');
        if (!response.ok) throw new Error('Failed to fetch menu');
        return response.json();
    },

    async getAllMenus(role?: string) {
        const params = role ? `?role_name=${role}` : '';
        const response = await fetchWithAuth(`/menus/${params}`);
        if (!response.ok) throw new Error('Failed to fetch menus');
        return response.json();
    },

    async createMenu(data: {
        title: string;
        path?: string;
        icon?: string;
        role_name: string;
        parent_id?: number;
        order_index?: number;
    }) {
        const response = await fetchWithAuth('/menus/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create menu');
        }
        return response.json();
    },

    async updateMenu(menuId: number, data: {
        title?: string;
        path?: string;
        icon?: string;
        role_name?: string;
        parent_id?: number | null;
        order_index?: number;
    }) {
        const response = await fetchWithAuth(`/menus/${menuId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update menu');
        }
        return response.json();
    },

    async deleteMenu(menuId: number) {
        const response = await fetchWithAuth(`/menus/${menuId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete menu');
        }
        return response.json();
    }
};
