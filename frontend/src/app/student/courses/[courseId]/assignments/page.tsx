'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assignmentService, Assignment, courseService } from '@/services/courses';
import styles from '@/app/student/assignments/assignments.module.scss';
import { BookOpen, Search, Calendar, Clock, CheckCircle2, Code2, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function StudentCourseAssignmentsPage() {
    const params = useParams();
    const courseId = params?.courseId as string;

    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

    const { data: assignments, isLoading } = useQuery({
        queryKey: ['assignments', courseId],
        queryFn: () => assignmentService.getAssignmentsByCourse(courseId),
        enabled: !!courseId
    });

    const { data: course } = useQuery({
        queryKey: ['course', courseId],
        queryFn: () => courseService.getCourse(courseId),
        enabled: !!courseId
    });

    const filteredAssignments = assignments?.filter((a: Assignment) => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.problem_title?.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === 'all') return matchesSearch;
        if (filter === 'completed') return matchesSearch && a.completed_count && a.completed_count > 0;
        if (filter === 'pending') return matchesSearch && (!a.completed_count || a.completed_count === 0);
        return matchesSearch;
    }) || [];

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Không giới hạn';
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getDeadlineInfo = (due_date?: string) => {
        if (!due_date) return { text: 'Không hạn', class: styles.noDeadline };
        const now = new Date();
        const deadline = new Date(due_date);
        const diff = deadline.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (diff < 0) return { text: 'Đã hết hạn', class: styles.expired };
        if (days === 0) return { text: `Còn ${hours} giờ`, class: styles.urgent };
        if (days <= 3) return { text: `Còn ${days} ngày`, class: styles.warning };
        return { text: `Còn ${days} ngày`, class: styles.normal };
    };

    const stats = {
        total: assignments?.length || 0,
        completed: assignments?.filter((a: Assignment) => a.completed_count && a.completed_count > 0).length || 0,
        pending: assignments?.filter((a: Assignment) => !a.completed_count || a.completed_count === 0).length || 0
    };

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <BookOpen size={24} />
                            Bài tập học phần: {course?.course_name || ''}
                        </h1>
                        <p>Hoàn thành {stats.completed}/{stats.total} bài tập</p>
                    </div>
                    <div>
                        <Link href={`/student/courses/${courseId}`} className={styles.backLink}><ArrowLeft size={16} /> Quay lại học phần</Link>
                    </div>
                </div>

                <div className={styles.statsBar}>
                    <button className={`${styles.statBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>
                        <span className={styles.statValue}>{stats.total}</span>
                        <span className={styles.statLabel}>Tất cả</span>
                    </button>
                    <button className={`${styles.statBtn} ${filter === 'pending' ? styles.active : ''}`} onClick={() => setFilter('pending')}>
                        <span className={`${styles.statValue} ${styles.orange}`}>{stats.pending}</span>
                        <span className={styles.statLabel}>Chưa làm</span>
                    </button>
                    <button className={`${styles.statBtn} ${filter === 'completed' ? styles.active : ''}`} onClick={() => setFilter('completed')}>
                        <span className={`${styles.statValue} ${styles.green}`}>{stats.completed}</span>
                        <span className={styles.statLabel}>Hoàn thành</span>
                    </button>
                </div>

                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm kiếm bài tập..." />
                </div>

                <div className={styles.assignmentList}>
                    {isLoading ? (
                        <div className={styles.loading}>Đang tải...</div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className={styles.empty}>
                            <span className={styles.emptyIcon}>📚</span>
                            <h3>Không có bài tập cho học phần này</h3>
                            <p>Nếu bạn tin là có bài tập nhưng không thấy, hãy liên hệ giảng viên hoặc thử nhận lớp.</p>
                        </div>
                    ) : (
                        filteredAssignments.map((assignment: Assignment) => {
                            const deadline = getDeadlineInfo(assignment.due_date);
                            const isCompleted = assignment.completed_count && assignment.completed_count > 0;
                            return (
                                <Link key={assignment.assignment_id} href={`/student/problems/${assignment.problem_id}?assignment_id=${assignment.assignment_id}`} className={`${styles.assignmentCard} ${isCompleted ? styles.completed : ''}`}>
                                    <div className={styles.cardLeft}>
                                        <div className={styles.statusIcon}>
                                            {isCompleted ? (
                                                <CheckCircle2 size={24} className={styles.completedIcon} />
                                            ) : (
                                                <Clock size={24} className={styles.pendingIcon} />
                                            )}
                                        </div>
                                        <div className={styles.cardInfo}>
                                            <div className={styles.cardMeta}>
                                                <span className={styles.classCode}>{assignment.course_name}</span>
                                                <span className={`${styles.deadline} ${deadline.class}`}>{deadline.text}</span>
                                            </div>
                                            <h3 className={styles.cardTitle}>{assignment.title}</h3>
                                            <div className={styles.problemInfo}><Code2 size={14} /><span>{assignment.problem_title}</span></div>
                                            {assignment.due_date && (
                                                <div className={styles.dueDate}><Calendar size={14} /><span>Hạn: {formatDate(assignment.due_date)}</span></div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.cardRight}>
                                        {isCompleted ? (
                                            <span className={styles.completedBadge}>Đã hoàn thành</span>
                                        ) : (
                                            <span className={styles.startBtn}>Làm bài <ArrowRight size={16} /></span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
