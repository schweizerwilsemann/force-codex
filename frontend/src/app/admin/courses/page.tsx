'use client';

import styles from './courses.module.scss';
import { BookOpen, Plus, Search, Settings } from 'lucide-react';

export default function AdminCoursesPage() {
    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <BookOpen size={24} />
                            Quản Lý Khóa Học
                        </h1>
                        <p>Quản lý các khóa học và lớp học</p>
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
                        <p>Tính năng quản lý khóa học sẽ sớm được cập nhật.</p>
                        <p className={styles.note}>Bạn có thể tạo và quản lý các khóa học, gán bài tập và theo dõi tiến độ sinh viên tại đây.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
