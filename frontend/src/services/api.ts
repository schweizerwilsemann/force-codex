const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const KEY_ACCESS = 'token';
const KEY_REFRESH = 'refresh_token';
const KEY_ROLE = 'role';
const KEY_MUST_CHANGE = 'must_change_password';

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

/** Move refresh token / role from sessionStorage (old behavior) into localStorage. */
function migrateLegacyAuthFromSessionStorage(): void {
    if (!isBrowser()) return;
    const rt = sessionStorage.getItem(KEY_REFRESH);
    if (rt && !localStorage.getItem(KEY_REFRESH)) {
        localStorage.setItem(KEY_REFRESH, rt);
        sessionStorage.removeItem(KEY_REFRESH);
    }
    const role = sessionStorage.getItem(KEY_ROLE);
    if (role && !localStorage.getItem(KEY_ROLE)) {
        localStorage.setItem(KEY_ROLE, role);
        sessionStorage.removeItem(KEY_ROLE);
    }
    const must = sessionStorage.getItem(KEY_MUST_CHANGE);
    if (must && !localStorage.getItem(KEY_MUST_CHANGE)) {
        localStorage.setItem(KEY_MUST_CHANGE, must);
        sessionStorage.removeItem(KEY_MUST_CHANGE);
    }
}

function getAccessToken(): string | null {
    if (!isBrowser()) return null;
    migrateLegacyAuthFromSessionStorage();
    return sessionStorage.getItem(KEY_ACCESS);
}

function getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    migrateLegacyAuthFromSessionStorage();
    return localStorage.getItem(KEY_REFRESH);
}

function applyRefreshPayload(data: {
    access_token: string;
    refresh_token?: string;
    role?: string;
}): void {
    if (!isBrowser()) return;
    sessionStorage.setItem(KEY_ACCESS, data.access_token);
    if (data.refresh_token) {
        localStorage.setItem(KEY_REFRESH, data.refresh_token);
    }
    if (data.role) {
        localStorage.setItem(KEY_ROLE, data.role);
    }
}

function clearAuthStorage(): void {
    if (!isBrowser()) return;
    sessionStorage.removeItem(KEY_ACCESS);
    sessionStorage.removeItem(KEY_REFRESH);
    sessionStorage.removeItem(KEY_ROLE);
    sessionStorage.removeItem(KEY_MUST_CHANGE);
    localStorage.removeItem(KEY_REFRESH);
    localStorage.removeItem(KEY_ROLE);
    localStorage.removeItem(KEY_MUST_CHANGE);
}

let refreshInFlight: Promise<boolean> | null = null;

async function performRefreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!refreshResponse.ok) {
            if (refreshResponse.status === 401) {
                clearAuthStorage();
            }
            return false;
        }
        const data = await refreshResponse.json();
        applyRefreshPayload(data);
        return true;
    } catch {
        return false;
    }
}

function refreshAccessToken(): Promise<boolean> {
    if (refreshInFlight) return refreshInFlight;
    const p = performRefreshAccessToken().finally(() => {
        refreshInFlight = null;
    });
    refreshInFlight = p;
    return p;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    let token = getAccessToken();

    const getHeaders = (t: string | null) => ({
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...options.headers,
    });

    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: getHeaders(token),
    });

    if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            token = getAccessToken();
            return fetch(`${API_URL}${url}`, {
                ...options,
                headers: getHeaders(token),
            });
        }
        authService.logout();
    }

    return response;
}

export const authService = {
    /**
     * If this tab has no access token but a refresh token exists (e.g. new tab),
     * exchange it for an access token. Call from guards before isAuthenticated().
     */
    async tryRestoreSession(): Promise<boolean> {
        if (!isBrowser()) return false;
        migrateLegacyAuthFromSessionStorage();
        if (getAccessToken()) return true;
        return refreshAccessToken();
    },

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
        if (!isBrowser()) return data;
        migrateLegacyAuthFromSessionStorage();
        sessionStorage.setItem(KEY_ACCESS, data.access_token);
        localStorage.setItem(KEY_REFRESH, data.refresh_token);
        localStorage.setItem(KEY_ROLE, data.role);
        if (data.must_change_password) {
            localStorage.setItem(KEY_MUST_CHANGE, 'true');
        } else {
            localStorage.removeItem(KEY_MUST_CHANGE);
        }
        return data;
    },

    logout() {
        clearAuthStorage();
        if (isBrowser()) {
            window.location.href = '/login';
        }
    },

    isAuthenticated() {
        return !!getAccessToken();
    },

    getRole() {
        if (!isBrowser()) return null;
        migrateLegacyAuthFromSessionStorage();
        return localStorage.getItem(KEY_ROLE) ?? sessionStorage.getItem(KEY_ROLE);
    },

    clearMustChangePasswordFlag() {
        if (!isBrowser()) return;
        localStorage.removeItem(KEY_MUST_CHANGE);
        sessionStorage.removeItem(KEY_MUST_CHANGE);
    },
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
