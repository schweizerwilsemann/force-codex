'use client';

import styles from './assignments.module.scss';
import { ClipboardList, Plus, Search, Calendar, Users } from 'lucide-react';

export default function AdminAssignmentsPage() {
    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <ClipboardList size={24} />
                            Quản Lý Phân Công
                        </h1>
                        <p>Phân công bài tập cho sinh viên và lớp học</p>
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
                        <p>Tính năng quản lý phân công sẽ sớm được cập nhật.</p>
                        <div className={styles.features}>
                            <div className={styles.featureItem}>
                                <Calendar size={20} />
                                <span>Đặt deadline cho bài tập</span>
                            </div>
                            <div className={styles.featureItem}>
                                <Users size={20} />
                                <span>Gán bài tập cho lớp/sinh viên</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
