'use client';

import styles from './assignments.module.scss';
import { ClipboardList, Plus, Search, Calendar, Users, BookOpen } from 'lucide-react';

export default function LecturerAssignmentsPage() {
    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <ClipboardList size={24} />
                            Phân Công Bài Tập
                        </h1>
                        <p>Gán bài tập cho sinh viên và theo dõi tiến độ</p>
                    </div>
                    <button className={styles.addBtn}>
                        <Plus size={18} />
                        Tạo Phân Công
                    </button>
                </div>

                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm phân công..."
                    />
                </div>

                <div className={styles.content}>
                    <div className={styles.emptyState}>
                        <div className={styles.icon}>📋</div>
                        <h3>Chưa có phân công</h3>
                        <p>Tạo phân công để gán bài tập cho sinh viên.</p>
                        <div className={styles.features}>
                            <div className={styles.featureItem}>
                                <BookOpen size={20} />
                                <span>Chọn bài tập từ ngân hàng đề</span>
                            </div>
                            <div className={styles.featureItem}>
                                <Calendar size={20} />
                                <span>Đặt thời hạn nộp bài</span>
                            </div>
                            <div className={styles.featureItem}>
                                <Users size={20} />
                                <span>Gán cho lớp hoặc cá nhân</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
