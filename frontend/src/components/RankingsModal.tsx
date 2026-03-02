'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { assignmentService, StudentAssignmentResult } from '@/services/courses';
import styles from './RankingsModal.module.scss';
import { X } from 'lucide-react';

interface Props {
    assignmentId?: string | null;
    title?: string | null;
    onClose: () => void;
}

export default function RankingsModal({ assignmentId, title, onClose }: Props) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['assignment-rankings', assignmentId],
        queryFn: () => assignmentId ? assignmentService.getAssignmentRankings(assignmentId) : Promise.resolve([]),
        enabled: !!assignmentId
    });

    if (!assignmentId) return null;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>Bảng xếp hạng — {title}</h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng"><X size={18} /></button>
                </div>

                <div className={styles.body}>
                    {isLoading ? (
                        <div>Đang tải...</div>
                    ) : error ? (
                        <div>Không thể tải bảng xếp hạng</div>
                    ) : (!data || data.length === 0) ? (
                        <div>Chưa có dữ liệu</div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Họ tên</th>
                                    <th>Attempts</th>
                                    <th>Best</th>
                                    <th>Adjusted</th>
                                    <th>Last submitted</th>
                                    <th>Late</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((r: StudentAssignmentResult, idx: number) => (
                                    <tr key={r.student_id}>
                                        <td>{idx + 1}</td>
                                        <td>{r.student_name}</td>
                                        <td>{r.attempts}</td>
                                        <td>{r.best_score ?? '—'}</td>
                                        <td>{r.adjusted_score ?? '—'}</td>
                                        <td>{r.last_submission ? new Date(r.last_submission).toLocaleString('vi-VN') : '—'}</td>
                                        <td>{r.late_status || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
