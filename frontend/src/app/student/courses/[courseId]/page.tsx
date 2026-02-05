'use client';

import { useQuery } from '@tanstack/react-query';
import { courseService, assignmentService } from '@/services/courses'; // Ensure mapping is correct
import Link from 'next/link';
import { useParams } from 'next/navigation'; // Correct hook for App Router params
import styles from './detail.module.scss';
import { ArrowLeft, BookOpen, Clock, FileCode, CheckCircle } from 'lucide-react';

export default function StudentCourseDetailPage() {
    const params = useParams(); // params is an object { courseId: string }
    // Ensure courseId is extracted safely. In Next.js 13+ App Router, params are available via hook.
    // However, depending on TS config, it might be typed as string | string[] | undefined.
    const courseId = params?.courseId as string;

    const { data: course, isLoading: loadingCourse } = useQuery({
        queryKey: ['course', courseId],
        queryFn: () => courseService.getCourse(courseId),
        enabled: !!courseId
    });

    // We assume backend supports filtering assignments by course_id in some way, 
    // BUT currently there isn't a direct "get assignments by course" endpoint for students unless generic one works.
    // However, the user request assumes students see assignments.
    // We might need to fetch ALL assignments and filter locally OR update backend.
    // Backend `assignmentService.getAssignments` takes `classId`.
    // Wait, the requirements said "why do they see assignments from OTHER courses?".
    // We need an endpoint for assignments BY COURSE.
    // Let's check `backend/app/api/v1/endpoints/assignments.py`.
    // For now, I will use a placeholder or assume I need to implement fetching assignments by course.
    // Actually, `Course` model has `assignments` relationship.
    // But `Course` schema response might not include full assignment list details? 
    // `Course` schema in frontend defines `problem_count`, no `assignments`.

    // Let's try to add logic to fetch assignments by passing course_id if backend supports it.
    // Check backend endpoint `GET /assignments/`.
    // It accepts `class_id`. Does it accept `course_id`? 
    // If not, I should add it.

    const { data: assignments, isLoading: loadingAssignments, isError: assignmentsError, error: assignmentsErrorObj, refetch: refetchAssignments } = useQuery({
        queryKey: ['assignments', courseId],
        queryFn: () => fetchAssignmentsByCourse(courseId),
        enabled: !!courseId
    });

    // Debug: check if current user is enrolled in this course
    const { data: myCourses } = useQuery({
        queryKey: ['my-courses'],
        queryFn: () => courseService.getMyCourses()
    });

    const isEnrolled = !!myCourses && Array.isArray(myCourses) && myCourses.some((c: any) => c.course_id === courseId);

    if (loadingCourse) return <div className={styles.container}>Đang tải thông tin học phần...</div>;

    if (!course) return <div className={styles.container}>Không tìm thấy học phần</div>;

    // Helpful debug info when assignments are missing
    const assignmentCount = assignments ? (Array.isArray(assignments) ? assignments.length : 0) : 0;

    return (
        <div className={styles.container}>
            <Link href="/student/courses" className={styles.backBtn}>
                <ArrowLeft size={16} />
                Quay lại danh sách học phần
            </Link>

            <div className={styles.header}>
                <h1>{course.course_name}</h1>
                <div className={styles.meta}>
                    <span>Mã học phần: {course.course_code}</span>
                    <span>Ngôn ngữ: {course.programming_languages.join(', ')}</span>
                </div>
            </div>

            <div className={styles.section}>
                <h2>
                    <FileCode size={24} />
                    Bài tập & Kiểm tra
                </h2>
                <div style={{ marginTop: 8, marginBottom: 12, display: 'flex', gap: 8 }}>
                    <Link href={`/student/courses/${courseId}/problems`} className={styles.viewProblemsBtn}>Xem bài tập học phần</Link>
                    <Link href={`/student/courses/${courseId}/assignments`} className={styles.viewAssignmentsBtn}>Xem danh sách bài tập</Link>
                </div>

                {/* {loadingAssignments ? (
                    <div>Đang tải bài tập...</div>
                ) : assignmentsError ? (
                    <div className={styles.emptyState}>
                        <div>Không thể tải bài tập: {(assignmentsErrorObj as any)?.message || 'Lỗi không xác định'}</div>
                        <div style={{ marginTop: 8 }}>
                            <button className={styles.button} onClick={() => refetchAssignments()}>Thử lại</button>
                        </div>
                    </div>
                ) : assignmentCount > 0 ? (
                    <div className={styles.grid}>
                        {assignments.map((assignment: any) => (
                            <Link
                                key={assignment.assignment_id}
                                href={`/student/assignments/${assignment.assignment_id}`}
                                className={styles.assignmentCard}
                            >
                                <div className={styles.title}>{assignment.title}</div>
                                <div className={styles.problemTitle}>
                                    <Code2 size={16} />
                                    {assignment.problem_title || 'Bài tập coding'}
                                </div>
                                <div className={styles.dates}>
                                    {assignment.due_date && (
                                        <div>
                                            <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
                                            Hạn nộp: {new Date(assignment.due_date).toLocaleDateString('vi-VN')}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <div>Chưa có bài tập nào cho học phần này.</div>
                        <div style={{ marginTop: 8 }}>
                            <button className={styles.button} onClick={() => refetchAssignments()}>Tải lại</button>
                        </div>

                        <div style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>
                            <div><strong>Enrolled in this course:</strong> {isEnrolled ? 'Yes' : 'No'}</div>
                            <details style={{ marginTop: 6 }}>
                                <summary>My enrolled courses ({(myCourses || []).length})</summary>
                                <pre style={{ maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(myCourses || [], null, 2)}</pre>
                            </details>

                            <details style={{ marginTop: 6 }}>
                                <summary>Raw assignments response</summary>
                                <pre style={{ maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(assignments || [], null, 2)}</pre>
                            </details>
                        </div>
                    </div>
                )} */}
            </div>
        </div>
    );
}

// Temporary helper until I confirm backend endpoint
import { Code2 } from 'lucide-react';
async function fetchAssignmentsByCourse(courseId: string) {
    // We need to implement this in `services/courses.ts` and backend
    // For now, let's assume we can pass specific filter or fetch all and filter client side (not ideal but safe for V1)
    // But `assignmentService.getAssignments` uses `fetchWithAuth`.
    // I will call a new method `getAssignmentsByCourse` which I will add.
    return assignmentService.getAssignmentsByCourse(courseId);
}
