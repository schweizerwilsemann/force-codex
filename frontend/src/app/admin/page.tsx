'use client';

import { useEffect, useState } from 'react';
import styles from './dashboard.module.scss';
import { Users, Code2, BookOpen, ClipboardList, TrendingUp } from 'lucide-react';
import { codingService } from '@/services/coding';
import { userService } from '@/services/api';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        users: 0,
        problems: 0,
        courses: 0,
        assignments: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Parallel fetching of counts (mocked or real)
                // For MVP, we'll fetch real lists and count them (not efficient for large data but fine for functionality demo)
                const [users, problems] = await Promise.all([
                    userService.getUsers().catch(() => []),
                    codingService.getProblems().catch(() => [])
                ]);

                setStats({
                    users: users.length,
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
                    <h1>Tổng Quan Admin</h1>
                    <p>Chào mừng trở lại! Đây là tổng hợp hoạt động của hệ thống.</p>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.blue}`}>
                            <Users color="#3b82f6" size={24} />
                        </div>
                        <div className={styles.value}>{stats.users}</div>
                        <div className={styles.label}>Người dùng</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.purple}`}>
                            <Code2 color="#a855f7" size={24} />
                        </div>
                        <div className={styles.value}>{stats.problems}</div>
                        <div className={styles.label}>Bài tập Code</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.green}`}>
                            <BookOpen color="#22c55e" size={24} />
                        </div>
                        <div className={styles.value}>{stats.courses}</div>
                        <div className={styles.label}>Khóa học</div>
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
                        <Link href="/admin/users" className={styles.actionCard}>
                            <Users size={32} className={styles.icon} />
                            <span>Quản lý người dùng</span>
                        </Link>
                        <Link href="/admin/problems" className={styles.actionCard}>
                            <Code2 size={32} className={styles.icon} />
                            <span>Quản lý ngân hàng đề</span>
                        </Link>
                        <Link href="/admin/courses" className={styles.actionCard}>
                            <BookOpen size={32} className={styles.icon} />
                            <span>Quản lý khóa học</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
