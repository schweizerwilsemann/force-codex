'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { courseService } from '@/services/courses';
import styles from './page.module.scss';
import { BookOpen, Users, Code2, Edit, Trash2, Calendar } from 'lucide-react';

export default function CourseOverviewPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const { data: course, isLoading } = useQuery({
        queryKey: ['course', courseId],
        queryFn: () => courseService.getCourse(courseId)
    });

    if (isLoading) return <div className={styles.loading}>Đang tải...</div>;
    if (!course) return <div className={styles.emptyState}><h3>Không tìm thấy học phần</h3></div>;

    const stats = [
        { label: 'Sinh viên', value: course.enrollment_count || 0, icon: Users, color: '#3b82f6' },
        { label: 'Bài tập', value: course.problem_count || 0, icon: Code2, color: '#a855f7' },
        // { label: 'Bài tập về nhà', value: 0, icon: Calendar, color: '#f59e0b' } // Placeholder if needed
    ];

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <BookOpen size={28} />
                            {course.course_name}
                        </h1>
                        <p>{course.course_code} • {course.category || 'Chưa phân loại'}</p>
                    </div>
                    {/* Actions if needed, e.g. Edit Course */}
                </div>

                {/* Stats Grid */}
                <div className={styles.courseGrid} style={{ marginBottom: '2rem' }}>
                    {stats.map((stat, index) => (
                        <div key={index} className={styles.courseCard} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '48px', height: '48px',
                                borderRadius: '12px',
                                background: `${stat.color}20`,
                                color: stat.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>{stat.value}</h3>
                                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Description */}
                <div className={styles.courseCard}>
                    <h3 className={styles.courseName}>Mô tả học phần</h3>
                    <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                        {course.programming_languages && course.programming_languages.length > 0 && (
                            <div className={styles.languages} style={{ marginBottom: '1rem' }}>
                                {course.programming_languages.map(lang => (
                                    <span key={lang} className={styles.langTag}>{lang}</span>
                                ))}
                            </div>
                        )}
                        {/* Description field might be missing in Course interface in frontend? */}
                        {/* Checking Course interface in courses.ts... It doesn't have description. */}
                        {/* Accessing it might be undefined if API returns it but TS doesn't know. */}
                        {/* I will add it if I see it in API response often, but strictly TS says no. */}
                    </div>
                </div>
            </div>
        </div>
    );
}
