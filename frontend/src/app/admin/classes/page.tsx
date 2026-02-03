'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService, Class, courseService, Course } from '@/services/courses';
import { userService } from '@/services/api';
import styles from './classes.module.scss';
import { Users, Plus, Search, Edit, Trash2, X, Save, BookOpen, GraduationCap, ClipboardList } from 'lucide-react';

export default function AdminClassesPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [formData, setFormData] = useState({
        class_code: '',
        course_id: '',
        lecturer_id: '',
        semester: ''
    });

    const { data: classes, isLoading } = useQuery({
        queryKey: ['classes'],
        queryFn: () => classService.getClasses()
    });

    const { data: courses } = useQuery({
        queryKey: ['courses'],
        queryFn: () => courseService.getCourses()
    });

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: userService.getUsers
    });

    const lecturers = users?.filter((u: any) => u.role_id === 2) || [];

    const createMutation = useMutation({
        mutationFn: (data: any) => classService.createClass(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => classService.updateClass(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => classService.deleteClass(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
        }
    });

    const openCreateModal = () => {
        setEditingClass(null);
        setFormData({
            class_code: '',
            course_id: '',
            lecturer_id: '',
            semester: ''
        });
        setShowModal(true);
    };

    const openEditModal = (cls: Class) => {
        setEditingClass(cls);
        setFormData({
            class_code: cls.class_code,
            course_id: cls.course_id,
            lecturer_id: cls.lecturer_id || '',
            semester: cls.semester || ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingClass(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            lecturer_id: formData.lecturer_id || undefined
        };
        if (editingClass) {
            updateMutation.mutate({ id: editingClass.class_id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Bạn có chắc muốn xóa lớp học này?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredClasses = classes?.filter((c: Class) =>
        c.class_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lecturer_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <Users size={24} />
                            Quản Lý Lớp Học
                        </h1>
                        <p>{classes?.length || 0} lớp học</p>
                    </div>
                    <button className={styles.addBtn} onClick={openCreateModal}>
                        <Plus size={18} />
                        Tạo Lớp Học
                    </button>
                </div>

                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm lớp học..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.tableContainer}>
                    {isLoading ? (
                        <div className={styles.loading}>Đang tải...</div>
                    ) : filteredClasses.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.icon}>🏫</div>
                            <h3>Chưa có lớp học</h3>
                            <p>Tạo lớp học mới để bắt đầu.</p>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Mã lớp</th>
                                    <th>Học phần</th>
                                    <th>Giảng viên</th>
                                    <th>Học kỳ</th>
                                    <th>Sinh viên</th>
                                    <th>Bài tập</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClasses.map((cls: Class) => (
                                    <tr key={cls.class_id}>
                                        <td className={styles.codeCell}>
                                            <span className={styles.classCode}>{cls.class_code}</span>
                                        </td>
                                        <td>
                                            <div className={styles.courseInfo}>
                                                <BookOpen size={14} />
                                                <span>{cls.course_name || '—'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.lecturerInfo}>
                                                <GraduationCap size={14} />
                                                <span>{cls.lecturer_name || 'Chưa phân công'}</span>
                                            </div>
                                        </td>
                                        <td className={styles.semester}>{cls.semester || '—'}</td>
                                        <td className={styles.count}>
                                            <Users size={14} />
                                            {cls.student_count || 0}
                                        </td>
                                        <td className={styles.count}>
                                            <ClipboardList size={14} />
                                            {cls.assignment_count || 0}
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <button
                                                className={styles.iconBtn}
                                                onClick={() => openEditModal(cls)}
                                                title="Sửa"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className={`${styles.iconBtn} ${styles.danger}`}
                                                onClick={() => handleDelete(cls.class_id)}
                                                title="Xóa"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>{editingClass ? 'Sửa Lớp Học' : 'Tạo Lớp Học Mới'}</h2>
                                <button onClick={closeModal}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className={styles.modalForm}>
                                <div className={styles.formGroup}>
                                    <label>Mã lớp *</label>
                                    <input
                                        type="text"
                                        value={formData.class_code}
                                        onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
                                        placeholder="VD: CS101-01"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Học phần *</label>
                                    <select
                                        value={formData.course_id}
                                        onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Chọn Học phần</option>
                                        {courses?.map((course: Course) => (
                                            <option key={course.course_id} value={course.course_id}>
                                                {course.course_code} - {course.course_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Giảng viên</label>
                                    <select
                                        value={formData.lecturer_id}
                                        onChange={(e) => setFormData({ ...formData, lecturer_id: e.target.value })}
                                    >
                                        <option value="">Chưa phân công</option>
                                        {lecturers.map((lecturer: any) => (
                                            <option key={lecturer.user_id} value={lecturer.user_id}>
                                                {lecturer.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Học kỳ</label>
                                    <input
                                        type="text"
                                        value={formData.semester}
                                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                        placeholder="VD: HK1 2025-2026"
                                    />
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" onClick={closeModal} className={styles.cancelBtn}>
                                        Hủy
                                    </button>
                                    <button type="submit" className={styles.submitBtn}>
                                        <Save size={16} />
                                        {editingClass ? 'Cập nhật' : 'Tạo'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
