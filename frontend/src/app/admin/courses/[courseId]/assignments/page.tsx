'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { assignmentService, Assignment } from '@/services/courses';
import { codingService, Problem } from '@/services/coding';
import styles from './assignments.module.scss';
import { ClipboardList, Plus, Search, Edit, Trash2, X, Save, Calendar, Users, Code2, Eye } from 'lucide-react';
import RankingsModal from '@/components/RankingsModal';

export default function CourseAssignmentsPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [selectedRankingAssignment, setSelectedRankingAssignment] = useState<{ id: string; title: string } | null>(null);
    const [formData, setFormData] = useState({
        course_id: courseId,
        problem_id: '',
        title: '',
        description: '',
        max_score: 100,
        start_date: '',
        due_date: ''
    });

    const { data: assignments, isLoading } = useQuery({
        queryKey: ['assignments', courseId],
        queryFn: () => assignmentService.getAssignmentsByCourse(courseId)
    });

    // Only fetch problems for this course to assign
    const { data: problems } = useQuery({
        queryKey: ['problems', courseId],
        queryFn: () => codingService.getProblems(courseId)
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => assignmentService.createAssignment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => assignmentService.updateAssignment(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => assignmentService.deleteAssignment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
        }
    });

    const openCreateModal = () => {
        setEditingAssignment(null);
        setFormData({
            course_id: courseId,
            problem_id: '',
            title: '',
            description: '',
            max_score: 100,
            start_date: '',
            due_date: ''
        });
        setShowModal(true);
    };

    const openEditModal = (assignment: Assignment) => {
        setEditingAssignment(assignment);
        setFormData({
            course_id: assignment.course_id,
            problem_id: assignment.problem_id,
            title: assignment.title,
            description: assignment.description || '',
            max_score: assignment.max_score,
            start_date: assignment.start_date ? new Date(assignment.start_date).toISOString().slice(0, 16) : '',
            due_date: assignment.due_date ? new Date(assignment.due_date).toISOString().slice(0, 16) : ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAssignment(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            course_id: courseId, // Ensure courseId is correct
            start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
            due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined
        };

        if (editingAssignment) {
            updateMutation.mutate({ id: editingAssignment.assignment_id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Bạn có chắc muốn xóa phân công này?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredAssignments = assignments?.filter((a: Assignment) => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.problem_title?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    }) || [];

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDeadlineStatus = (due_date?: string) => {
        if (!due_date) return { class: '', label: 'Không hạn' };
        const now = new Date();
        const deadline = new Date(due_date);
        const diff = deadline.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return { class: styles.expired, label: 'Đã hết hạn' };
        if (days <= 3) return { class: styles.urgent, label: `Còn ${days} ngày` };
        return { class: styles.normal, label: `Còn ${days} ngày` };
    };

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <ClipboardList size={24} />
                            Phân Công Bài Tập
                        </h1>
                        <p>Quản lý bài tập cho học phần này</p>
                    </div>
                    <button className={styles.addBtn} onClick={openCreateModal}>
                        <Plus size={18} />
                        Tạo Phân Công
                    </button>
                </div>

                <div className={styles.filters}>
                    <div className={styles.searchBox}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm phân công..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loading}>Đang tải...</div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.icon}>📋</div>
                            <h3>Chưa có phân công</h3>
                            <p>Tạo phân công để gán bài tập cho sinh viên.</p>
                        </div>
                    ) : (
                        <div className={styles.assignmentGrid}>
                            {filteredAssignments.map((assignment: Assignment) => {
                                const deadlineStatus = getDeadlineStatus(assignment.due_date);
                                return (
                                    <div key={assignment.assignment_id} className={styles.assignmentCard}>
                                        <div className={styles.cardHeader}>
                                            <div className={styles.problemTag}>
                                                <Code2 size={14} />
                                                {assignment.problem_title}
                                            </div>
                                            <div className={styles.cardActions}>
                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() => openEditModal(assignment)}
                                                    title="Sửa"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className={styles.iconBtn}
                                                    title="Bảng xếp hạng"
                                                    onClick={() => setSelectedRankingAssignment({ id: assignment.assignment_id, title: assignment.title })}
                                                >
                                                    <Users size={16} />
                                                </button>
                                                <button
                                                    className={`${styles.iconBtn} ${styles.danger}`}
                                                    onClick={() => handleDelete(assignment.assignment_id)}
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className={styles.assignmentTitle}>{assignment.title}</h3>

                                        <div className={styles.meta}>
                                            <div className={styles.deadline}>
                                                <Calendar size={14} />
                                                <span>{formatDate(assignment.due_date)}</span>
                                            </div>
                                            <span className={`${styles.deadlineStatus} ${deadlineStatus.class}`}>
                                                {deadlineStatus.label}
                                            </span>
                                        </div>
                                        <div className={styles.stats}>
                                            <div className={styles.statItem}>
                                                <span className={styles.statValue}>{assignment.submission_count || 0}</span>
                                                <span className={styles.statLabel}>Nộp bài</span>
                                            </div>
                                            <div className={styles.statItem}>
                                                <span className={`${styles.statValue} ${styles.success}`}>{assignment.completed_count || 0}</span>
                                                <span className={styles.statLabel}>Hoàn thành</span>
                                            </div>
                                        </div>
                                        <button
                                            className={styles.viewBtn}
                                            onClick={() => setSelectedRankingAssignment({ id: assignment.assignment_id, title: assignment.title })}
                                        >
                                            <Eye size={16} />
                                            Xem chi tiết
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>{editingAssignment ? 'Sửa Phân Công' : 'Tạo Phân Công Mới'}</h2>
                                <button onClick={closeModal}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className={styles.modalForm}>
                                <div className={styles.formGroup}>
                                    <label>Tiêu đề *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="VD: Bài tập tuần 1"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Bài tập *</label>
                                    <select
                                        value={formData.problem_id}
                                        onChange={(e) => setFormData({ ...formData, problem_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Chọn bài tập</option>
                                        {problems?.map((problem: Problem) => (
                                            <option key={problem.problem_id} value={problem.problem_id}>
                                                {problem.problem_code} - {problem.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Mô tả</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Ghi chú cho sinh viên..."
                                        rows={3}
                                    />
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Điểm tối đa</label>
                                        <input
                                            type="number"
                                            value={formData.max_score}
                                            onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) })}
                                            min={0}
                                            max={1000}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Bắt đầu</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Hạn nộp</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" onClick={closeModal} className={styles.cancelBtn}>
                                        Hủy
                                    </button>
                                    <button type="submit" className={styles.submitBtn}>
                                        <Save size={16} />
                                        {editingAssignment ? 'Cập nhật' : 'Tạo'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {selectedRankingAssignment && (
                    <RankingsModal
                        assignmentId={selectedRankingAssignment.id}
                        title={selectedRankingAssignment.title}
                        onClose={() => setSelectedRankingAssignment(null)}
                    />
                )}

            </div>
        </div>
    );
}
