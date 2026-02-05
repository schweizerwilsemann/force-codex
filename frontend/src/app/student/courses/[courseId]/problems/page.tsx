'use client';

import { useQuery } from '@tanstack/react-query';
import { codingService, Problem } from '@/services/coding';
import styles from './problems.module.scss';
import { useParams } from 'next/navigation';
import { Code2, Clock, Database } from 'lucide-react';
import Link from 'next/link';

export default function StudentCourseProblemsPage() {
    const params = useParams();
    const courseId = params.courseId as string;

    const { data: problems, isLoading } = useQuery({
        queryKey: ['problems', courseId],
        queryFn: () => codingService.getProblems(courseId),
        enabled: !!courseId
    });

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h1>
                        <Code2 size={28} />
                        Bài tập học phần
                    </h1>
                    <p>{problems?.length || 0} bài tập</p>
                </div>

                <div className={styles.grid}>
                    {isLoading ? (
                        <div>Đang tải...</div>
                    ) : problems && problems.length > 0 ? (
                        problems.map((p: Problem) => (
                            <Link key={p.problem_id} href={`/student/problems/${p.problem_id}`} className={styles.card}>
                                <span className={styles.badge}>{p.problem_code}</span>
                                <h3>{p.title}</h3>

                                <div className={styles.metaRow}>
                                    <span className={styles.badge}>{p.difficulty === 'easy' ? 'Easy' : p.difficulty === 'medium' ? 'Medium' : 'Hard'}</span>

                                    <div className={styles.metaIcons}>
                                        <span className={styles.metaItem}><Clock size={14} /> <span className={styles.iconText}>{p.time_limit}ms</span></span>
                                        <span className={styles.metaItem}><Database size={14} /> <span className={styles.iconText}>{p.memory_limit}MB</span></span>
                                    </div>
                                </div>

                                <p>{p.description}</p>
                            </Link>
                        ))
                    ) : (
                        <div className={styles.empty}>Chưa có bài tập cho học phần này.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
