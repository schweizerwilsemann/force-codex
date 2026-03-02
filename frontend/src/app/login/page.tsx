'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import styles from './login.module.scss';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (authService.isAuthenticated()) {
            const role = authService.getRole();
            if (role === 'student') {
                router.push('/student/courses');
            } else {
                router.push('/admin/users');
            }
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await authService.login(email, password);
            if (data.must_change_password) {
                // Redirect to profile to change password
                if (data.role === 'student') router.push('/student/profile');
                else if (data.role === 'lecturer') router.push('/lecturer/profile'); // Assuming exists or will exist
                else router.push('/admin/profile'); // Assuming exists
                return;
            }

            if (data.role === 'student') {
                router.push('/student/courses');
            } else if (data.role === 'lecturer') {
                router.push('/lecturer'); // Dashboard
            } else {
                // admin
                router.push('/admin'); // Dashboard
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h2>
                        Đăng nhập tài khoản
                    </h2>
                    <p>
                        Nền tảng học tập ForceCodeX
                    </p>
                </div>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <div>
                            <label style={{ color: 'white', fontWeight: 'bold' }} htmlFor="email-address" className="sr-only">
                                Địa chỉ email
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className={styles.input}
                                placeholder="Địa chỉ email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={{ color: 'white', fontWeight: 'bold' }} htmlFor="password" className="sr-only">
                                Mật khẩu
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className={styles.input}
                                placeholder="Mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={styles.button}
                        >
                            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
