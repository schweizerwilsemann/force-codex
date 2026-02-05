'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { userService } from '@/services/api';
import styles from './profile.module.scss';
import { User, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function StudentProfilePage() {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const { data: user, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: userService.getProfile
    });

    const changePasswordMutation = useMutation({
        mutationFn: (data: any) => userService.changePassword(data),
        onSuccess: () => {
            setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            sessionStorage.removeItem('must_change_password');
        },
        onError: (error: any) => {
            setMessage({ type: 'error', text: error.message });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
            return;
        }

        changePasswordMutation.mutate({
            old_password: oldPassword,
            new_password: newPassword
        });
    };

    if (isLoading) return <div className={styles.container}>Đang tải...</div>;

    return (
        <div className={styles.container}>
            <h1>
                <User size={28} />
                Hồ sơ cá nhân
            </h1>

            <div className={styles.card}>
                <div className={styles.section}>
                    <h2>Thông tin tài khoản</h2>
                    <div className={styles.formGroup}>
                        <label>Họ và tên</label>
                        <input type="text" value={user?.full_name || ''} disabled />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Email</label>
                        <input type="email" value={user?.email || ''} disabled />
                    </div>
                </div>

                <div className={styles.section}>
                    <h2>Đổi mật khẩu</h2>
                    {message && (
                        <div className={message.type === 'success' ? styles.success : styles.error}>
                            {message.type === 'success' ? <CheckCircle size={16} style={{ display: 'inline', marginRight: 8 }} /> : <AlertCircle size={16} style={{ display: 'inline', marginRight: 8 }} />}
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label>Mật khẩu hiện tại</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Mật khẩu mới</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Xác nhận mật khẩu mới</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={changePasswordMutation.isPending}
                        >
                            {changePasswordMutation.isPending ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
