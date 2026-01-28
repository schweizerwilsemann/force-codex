'use client';

import { useEffect, useState } from 'react';
import { userService } from '@/services/api';
import { useRouter } from 'next/navigation';
import styles from './users.module.scss';

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    // Form State
    const [newUser, setNewUser] = useState({
        email: '',
        full_name: '',
        role_name: 'student', // default
        student_code: '',
        class_name: '',
        lecturer_code: '',
        department: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
            if (err.message === 'Login failed' || err.message.includes('401')) {
                router.push('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await userService.createUser(newUser);
            setShowModal(false);
            fetchUsers(); // Refresh list
            // Reset form (simplified)
            setNewUser({ ...newUser, email: '', full_name: '', student_code: '' });
        } catch (err: any) {
            alert(err.message);
        }
    };
    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h1>Quản Lý Người Dùng</h1>
                    <button
                        onClick={() => setShowModal(true)}
                        className={styles.addButton}
                    >
                        Thêm Người Dùng
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Tên</th>
                                    <th>Email</th>
                                    <th>Vai trò</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.user_id}>
                                        <td>{user.full_name}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${user.role_id === 1 ? styles.admin :
                                                user.role_id === 2 ? styles.lecturer : styles.student
                                                }`}>
                                                {user.role_id}
                                            </span>
                                        </td>
                                        <td>
                                            {user.is_active ? (
                                                <span className={styles.active}>Hoạt động</span>
                                            ) : (
                                                <span className={styles.inactive}>Không hoạt động</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Create User Modal */}
                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h2>Tạo Người Dùng Mới</h2>
                            <form onSubmit={handleCreateUser}>
                                <div className={styles.formGroup}>
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Tên đầy đủ</label>
                                    <input
                                        type="text"
                                        required
                                        value={newUser.full_name}
                                        onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Vai trò</label>
                                    <select
                                        value={newUser.role_name}
                                        onChange={e => setNewUser({ ...newUser, role_name: e.target.value })}
                                    >
                                        <option value="student">Sinh viên</option>
                                        <option value="lecturer">Giảng viên</option>
                                    </select>
                                </div>

                                {newUser.role_name === 'student' && (
                                    <>
                                        <div className={styles.formGroup}>
                                            <label>Mã sinh viên</label>
                                            <input
                                                type="text"
                                                required
                                                value={newUser.student_code}
                                                onChange={e => setNewUser({ ...newUser, student_code: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Lớp</label>
                                            <input
                                                type="text"
                                                value={newUser.class_name}
                                                onChange={e => setNewUser({ ...newUser, class_name: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}
                                {newUser.role_name === 'lecturer' && (
                                    <>
                                        <div className={styles.formGroup}>
                                            <label>Mã giảng viên</label>
                                            <input
                                                type="text"
                                                required
                                                value={newUser.lecturer_code}
                                                onChange={e => setNewUser({ ...newUser, lecturer_code: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Khoa</label>
                                            <input
                                                type="text"
                                                value={newUser.department}
                                                onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className={styles.cancelBtn}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.submitBtn}
                                    >
                                        Tạo
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
