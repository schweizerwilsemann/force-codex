'use client';

import styles from './courses.module.scss';
import { BookOpen, Plus, Search, Users, Calendar } from 'lucide-react';

export default function LecturerCoursesPage() {
    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <BookOpen size={24} />
                            Khóa Học Của Tôi
                        </h1>
                        <p>Quản lý các khóa học bạn đang giảng dạy</p>
                    </div>
                    <button className={styles.addBtn}>
                        <Plus size={18} />
                        Tạo Khóa Học
                    </button>
                </div>

                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm khóa học..."
                    />
                </div>

                <div className={styles.content}>
                    <div className={styles.emptyState}>
                        <div className={styles.icon}>📚</div>
                        <h3>Chưa có khóa học</h3>
                        <p>Bạn chưa được phân công khóa học nào.</p>
                        <div className={styles.features}>
                            <div className={styles.featureItem}>
                                <Users size={20} />
                                <span>Quản lý sinh viên</span>
                            </div>
                            <div className={styles.featureItem}>
                                <Calendar size={20} />
                                <span>Lịch học & deadline</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
