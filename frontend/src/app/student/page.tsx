'use client';

import { useQuery } from '@tanstack/react-query';
import { assignmentService, Assignment } from '@/services/courses';
import { codingService } from '@/services/coding';
import styles from './dashboard.module.scss';
import { Code2, Clock, CheckCircle2, AlertCircle, Calendar, TrendingUp, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
    const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
        queryKey: ['my-assignments'],
        queryFn: assignmentService.getMyAssignments
    });

    const { data: submissions, isLoading: isLoadingSubmissions } = useQuery({
        queryKey: ['my-submissions'],
        queryFn: codingService.getMySubmissions
    });

    // Calculate stats
    const stats = {
        totalAssigned: assignments?.length || 0,
        completed: assignments?.filter((a: Assignment) => a.completed_count && a.completed_count > 0).length || 0,
        pending: assignments?.filter((a: Assignment) => !a.completed_count || a.completed_count === 0).length || 0,
        submissions: submissions?.length || 0
    };

    // Get upcoming deadlines (next 7 days)
    const upcomingDeadlines = assignments?.filter((a: Assignment) => {
        if (!a.due_date) return false;
        const deadline = new Date(a.due_date);
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
    }).sort((a: Assignment, b: Assignment) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    ).slice(0, 5) || [];

    // Recent submissions
    const recentSubmissions = submissions?.slice(0, 5) || [];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeRemaining = (dueDate: string) => {
        const diff = new Date(dueDate).getTime() - new Date().getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} ngày`;
        if (hours > 0) return `${hours} giờ`;
        return 'Sắp hết hạn';
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; class: string }> = {
            'accepted': { label: 'Đúng', class: styles.accepted },
            'wrong_answer': { label: 'Sai', class: styles.wrong },
            'pending': { label: 'Đang chấm', class: styles.pending },
            'judging': { label: 'Đang chấm', class: styles.pending },
        };
        return statusMap[status] || { label: status, class: '' };
    };

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                {/* Header */}
                <div className={styles.header}>
                    <h1>Xin chào! 👋</h1>
                    <p>Đây là tiến độ học tập của bạn</p>
                </div>

                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.blue}`}>
                            <BookOpen size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.value}>{stats.totalAssigned}</span>
                            <span className={styles.label}>Bài tập được giao</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.green}`}>
                            <CheckCircle2 size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.value}>{stats.completed}</span>
                            <span className={styles.label}>Đã hoàn thành</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.orange}`}>
                            <AlertCircle size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.value}>{stats.pending}</span>
                            <span className={styles.label}>Chưa làm</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.iconWrapper} ${styles.purple}`}>
                            <TrendingUp size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.value}>{stats.submissions}</span>
                            <span className={styles.label}>Lần nộp bài</span>
                        </div>
                    </div>
                </div>

                <div className={styles.mainGrid}>
                    {/* Upcoming Deadlines */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>
                                <Clock size={20} />
                                Sắp đến hạn
                            </h2>
                            <Link href="/student/assignments" className={styles.viewAll}>
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className={styles.sectionContent}>
                            {isLoadingAssignments ? (
                                <div className={styles.loading}>Đang tải...</div>
                            ) : upcomingDeadlines.length === 0 ? (
                                <div className={styles.empty}>
                                    <span>🎉</span>
                                    <p>Không có bài tập nào sắp đến hạn!</p>
                                </div>
                            ) : (
                                <div className={styles.deadlineList}>
                                    {upcomingDeadlines.map((assignment: Assignment) => (
                                        <Link
                                            key={assignment.assignment_id}
                                            href={`/student/problems/${assignment.problem_id}`}
                                            className={styles.deadlineItem}
                                        >
                                            <div className={styles.deadlineInfo}>
                                                <span className={styles.classCode}>{assignment.course_name}</span>
                                                <span className={styles.title}>{assignment.title}</span>
                                            </div>
                                            <div className={styles.deadlineTime}>
                                                <Calendar size={14} />
                                                <span>{getTimeRemaining(assignment.due_date!)}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Submissions */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>
                                <Code2 size={20} />
                                Nộp bài gần đây
                            </h2>
                        </div>
                        <div className={styles.sectionContent}>
                            {isLoadingSubmissions ? (
                                <div className={styles.loading}>Đang tải...</div>
                            ) : recentSubmissions.length === 0 ? (
                                <div className={styles.empty}>
                                    <span>📝</span>
                                    <p>Chưa có lần nộp bài nào</p>
                                </div>
                            ) : (
                                <div className={styles.submissionList}>
                                    {recentSubmissions.map((submission: any) => {
                                        const badge = getStatusBadge(submission.status);
                                        return (
                                            <div key={submission.submission_id} className={styles.submissionItem}>
                                                <div className={styles.submissionInfo}>
                                                    <span className={`${styles.statusBadge} ${badge.class}`}>
                                                        {badge.label}
                                                    </span>
                                                    <span className={styles.score}>{submission.score}/100</span>
                                                </div>
                                                <div className={styles.submissionMeta}>
                                                    <span>{submission.language}</span>
                                                    <span>•</span>
                                                    <span>{formatDate(submission.created_at)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className={styles.quickActions}>
                    <h2>Truy cập nhanh</h2>
                    <div className={styles.actionsGrid}>
                        <Link href="/student/problems" className={styles.actionCard}>
                            <Code2 size={32} />
                            <span>Danh sách bài tập</span>
                        </Link>
                        <Link href="/student/assignments" className={styles.actionCard}>
                            <BookOpen size={32} />
                            <span>Bài tập được giao</span>
                        </Link>
                        <Link href="/student/exams" className={styles.actionCard}>
                            <Clock size={32} />
                            <span>Bài thi & Luyện tập</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
