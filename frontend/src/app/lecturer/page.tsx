'use client';

import { useEffect, useState } from 'react';
import styles from '../admin/dashboard.module.scss'; // Reuse dashboard styles
import { Users, Code2, BookOpen, ClipboardList, TrendingUp } from 'lucide-react';
import { codingService } from '@/services/coding';
import { userService } from '@/services/api';
import Link from 'next/link';

export default function LecturerDashboard() {
    const [stats, setStats] = useState({
        students: 0,
        problems: 0,
        courses: 0,
        assignments: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // For MVP, reuse admin calls but ideally this would be filtered by lecturer
                const [users, problems] = await Promise.all([
                    userService.getUsers().catch(() => []),
                    codingService.getProblems().catch(() => [])
                ]);

                // Count only students for lecturer view? Or all users?
                // Let's count students
                const studentCount = users.filter((u: any) => u.role_id === 3).length;

                setStats({
                    students: studentCount,
                    problems: problems.length,
                    courses: 0, // Placeholder
                    assignments: 0 // Placeholder
                });
            } catch (error) {
                console.error('Failed to fetch stats', error);
            }
        };
        fetchData();
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h1>Tổng Quan Giảng Viên</h1>
                    <p>Chào mừng! Quản lý sinh viên và học liệu của bạn.</p>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.blue}`}>
                            <Users color="#3b82f6" size={24} />
                        </div>
                        <div className={styles.value}>{stats.students}</div>
                        <div className={styles.label}>Sinh viên</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.purple}`}>
                            <Code2 color="#a855f7" size={24} />
                        </div>
                        <div className={styles.value}>{stats.problems}</div>
                        <div className={styles.label}>Bài tập</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.green}`}>
                            <BookOpen color="#22c55e" size={24} />
                        </div>
                        <div className={styles.value}>{stats.courses}</div>
                        <div className={styles.label}>Học phần</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.orange}`}>
                            <ClipboardList color="#f97316" size={24} />
                        </div>
                        <div className={styles.value}>{stats.assignments}</div>
                        <div className={styles.label}>Phân công</div>
                    </div>
                </div>

                <div className={styles.quickActions}>
                    <h2>Truy Cập Nhanh</h2>
                    <div className={styles.actionsGrid}>
                        <Link href="/lecturer/users" className={styles.actionCard}>
                            <Users size={32} className={styles.icon} />
                            <span>Quản lý người dùng</span>
                        </Link>
                        <Link href="/lecturer/problems" className={styles.actionCard}>
                            <Code2 size={32} className={styles.icon} />
                            <span>Quản lý ngân hàng đề</span>
                        </Link>
                        <Link href="/lecturer/assignments" className={styles.actionCard}>
                            <ClipboardList size={32} className={styles.icon} />
                            <span>Tạo phân công</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
