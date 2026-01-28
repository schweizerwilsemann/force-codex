'use client';

import styles from './exams.module.scss';
import { useQuery } from '@tanstack/react-query';
import { codingService } from '@/services/coding';
import { useRouter } from 'next/navigation';

export default function StudentExamsPage() {
    const router = useRouter();
    const { data: problems, isLoading } = useQuery({
        queryKey: ['problems'],
        queryFn: codingService.getProblems
    });

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h1>Bài Thi & Luyện Tập</h1>
                    <p>Chọn một bài tập để giải.</p>
                </div>

                <div className={styles.grid}>
                    {isLoading ? (
                        <div>Đang tải bài tập...</div>
                    ) : (
                        problems?.map((problem: any) => (
                            <div key={problem.problem_id} className={styles.card}>
                                <h3>{problem.title}</h3>
                                <span className={styles.badge}>{problem.difficulty}</span>
                                <p>{problem.description?.substring(0, 100)}...</p>
                                <button
                                    className={styles.button}
                                    onClick={() => router.push(`/student/problems/${problem.problem_id}`)}
                                >
                                    Bắt đầu
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
