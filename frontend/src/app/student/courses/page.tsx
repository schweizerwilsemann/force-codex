'use client';

import { useQuery } from '@tanstack/react-query';
import { courseService, Course } from '@/services/courses';
import Link from 'next/link';
import styles from './courses.module.scss';
import { BookOpen, Code2, Users } from 'lucide-react';

export default function StudentCoursesPage() {
    const { data: courses, isLoading } = useQuery({
        queryKey: ['my-courses'],
        queryFn: courseService.getMyCourses
    });

    if (isLoading) return <div className={styles.container}>Đang tải...</div>;

    return (
        <div className={styles.container}>
            <h1>
                <BookOpen size={28} />
                Học phần của tôi
            </h1>

            {courses && courses.length > 0 ? (
                <div className={styles.grid}>
                    {courses.map((course: Course) => (
                        <Link
                            key={course.course_id}
                            href={`/student/courses/${course.course_id}`}
                            className={styles.card}
                        >
                            <h3>{course.course_name}</h3>
                            <span className={styles.code}>{course.course_code}</span>

                            <div className={styles.languages}>
                                {course.programming_languages.map(lang => (
                                    <span key={lang}>{lang}</span>
                                ))}
                            </div>

                            <div className={styles.stats}>
                                <div>
                                    <Code2 size={16} />
                                    {course.problem_count || 0} bài tập
                                </div>
                                <div>
                                    <Users size={16} />
                                    {course.enrollment_count || 0} SV
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className={styles.empty}>
                    <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>Bạn chưa tham gia học phần nào</h3>
                    <p>Liên hệ giảng viên để được thêm vào lớp học.</p>
                </div>
            )}
        </div>
    );
}
