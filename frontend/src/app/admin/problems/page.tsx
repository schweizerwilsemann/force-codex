'use client';

import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codingService, Problem, TestCase } from '@/services/coding';
import styles from './problems.module.scss';
import {
    Plus, Edit, Trash2, Search, ChevronDown, ChevronUp,
    Code2, CheckCircle2, XCircle, Eye, Save, X
} from 'lucide-react';

export default function AdminProblemsPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
    const [showTestCases, setShowTestCases] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        problem_code: '',
        title: '',
        description: '',
        difficulty: 'medium',
        time_limit: 1000,
        memory_limit: 256,
        allowed_languages: ['C', 'C++']
    });

    // Test case form
    const [testCaseForm, setTestCaseForm] = useState({
        input: '',
        expected_output: '',
        is_sample: false,
        points: 10
    });

    const { data: problems, isLoading } = useQuery({
        queryKey: ['problems'],
        queryFn: () => codingService.getProblems()
    });

    const { data: testCases, isLoading: isLoadingTestCases } = useQuery({
        queryKey: ['testCases', showTestCases],
        queryFn: () => codingService.getTestCases(showTestCases!),
        enabled: !!showTestCases
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => codingService.createProblem(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => codingService.updateProblem(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => codingService.deleteProblem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems'] });
        }
    });

    const createTestCaseMutation = useMutation({
        mutationFn: ({ problemId, data }: { problemId: string; data: any }) =>
            codingService.createTestCase(problemId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testCases', showTestCases] });
            setTestCaseForm({ input: '', expected_output: '', is_sample: false, points: 10 });
        }
    });

    const deleteTestCaseMutation = useMutation({
        mutationFn: (id: string) => codingService.deleteTestCase(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testCases', showTestCases] });
        }
    });

    const openCreateModal = () => {
        setEditingProblem(null);
        setFormData({
            problem_code: '',
            title: '',
            description: '',
            difficulty: 'medium',
            time_limit: 1000,
            memory_limit: 256,
            allowed_languages: ['C', 'C++']
        });
        setShowModal(true);
    };

    const openEditModal = (problem: Problem) => {
        setEditingProblem(problem);
        setFormData({
            problem_code: problem.problem_code,
            title: problem.title,
            description: problem.description || '',
            difficulty: problem.difficulty,
            time_limit: problem.time_limit ?? 0,
            memory_limit: problem.memory_limit ?? 0,
            allowed_languages: problem.allowed_languages || ['C', 'C++']
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProblem(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProblem) {
            updateMutation.mutate({ id: editingProblem.problem_id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Bạn có chắc muốn xóa bài tập này?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleAddTestCase = (e: React.FormEvent) => {
        e.preventDefault();
        if (showTestCases) {
            createTestCaseMutation.mutate({ problemId: showTestCases, data: testCaseForm });
        }
    };

    const filteredProblems = problems?.filter((p: Problem) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.problem_code.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return styles.easy;
            case 'medium': return styles.medium;
            case 'hard': return styles.hard;
            default: return '';
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <Code2 size={24} />
                            Quản Lý Bài Tập
                        </h1>
                        <p>{problems?.length || 0} bài tập</p>
                    </div>
                    <button className={styles.addBtn} onClick={openCreateModal}>
                        <Plus size={18} />
                        Tạo Bài Tập
                    </button>
                </div>

                {/* Search */}
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm bài tập..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Problems Table */}
                <div className={styles.tableContainer}>
                    {isLoading ? (
                        <div className={styles.loading}>Đang tải...</div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Tiêu đề</th>
                                    <th>Độ khó</th>
                                    <th>Giới hạn</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProblems.map((problem: Problem) => (
                                    <Fragment key={problem.problem_id}>
                                        <tr key={problem.problem_id}>
                                            <td className={styles.codeCell}>{problem.problem_code}</td>
                                            <td className={styles.titleCell}>{problem.title}</td>
                                            <td>
                                                <span className={`${styles.badge} ${getDifficultyClass(problem.difficulty)}`}>
                                                    {problem.difficulty === 'easy' ? 'Dễ' :
                                                        problem.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                                                </span>
                                            </td>
                                            <td className={styles.limitsCell}>
                                                {problem.time_limit}ms / {problem.memory_limit}MB
                                            </td>
                                            <td className={styles.actionsCell}>
                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() => setShowTestCases(showTestCases === problem.problem_id ? null : problem.problem_id)}
                                                    title="Xem test cases"
                                                >
                                                    {showTestCases === problem.problem_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() => openEditModal(problem)}
                                                    title="Sửa"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className={`${styles.iconBtn} ${styles.danger}`}
                                                    onClick={() => handleDelete(problem.problem_id)}
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                        {showTestCases === problem.problem_id && (
                                            <tr className={styles.testCasesRow}>
                                                <td colSpan={5}>
                                                    <div className={styles.testCasesPanel}>
                                                        <h4>Test Cases</h4>
                                                        {isLoadingTestCases ? (
                                                            <p>Đang tải...</p>
                                                        ) : (
                                                            <>
                                                                <div className={styles.testCasesList}>
                                                                    {testCases?.map((tc: TestCase, idx: number) => (
                                                                        <div key={tc.test_case_id} className={styles.testCaseItem}>
                                                                            <div className={styles.testCaseHeader}>
                                                                                <span>Test {idx + 1}</span>
                                                                                {tc.is_sample && <span className={styles.sampleBadge}>Ví dụ</span>}
                                                                                <span className={styles.points}>{tc.points} điểm</span>
                                                                                <button
                                                                                    className={styles.deleteBtn}
                                                                                    onClick={() => deleteTestCaseMutation.mutate(tc.test_case_id)}
                                                                                >
                                                                                    <X size={14} />
                                                                                </button>
                                                                            </div>
                                                                            <div className={styles.testCaseContent}>
                                                                                <div>
                                                                                    <label>Đầu vào:</label>
                                                                                    <pre>{tc.input}</pre>
                                                                                </div>
                                                                                <div>
                                                                                    <label>Đầu ra:</label>
                                                                                    <pre>{tc.expected_output}</pre>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <form className={styles.addTestCaseForm} onSubmit={handleAddTestCase}>
                                                                    <h5>Thêm Test Case Mới</h5>
                                                                    <div className={styles.formRow}>
                                                                        <div className={styles.formGroup}>
                                                                            <label>Đầu vào</label>
                                                                            <textarea
                                                                                value={testCaseForm.input}
                                                                                onChange={(e) => setTestCaseForm({ ...testCaseForm, input: e.target.value })}
                                                                                required
                                                                            />
                                                                        </div>
                                                                        <div className={styles.formGroup}>
                                                                            <label>Đầu ra mong đợi</label>
                                                                            <textarea
                                                                                value={testCaseForm.expected_output}
                                                                                onChange={(e) => setTestCaseForm({ ...testCaseForm, expected_output: e.target.value })}
                                                                                required
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className={styles.formRow}>
                                                                        <label className={styles.checkbox}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={testCaseForm.is_sample}
                                                                                onChange={(e) => setTestCaseForm({ ...testCaseForm, is_sample: e.target.checked })}
                                                                            />
                                                                            Là ví dụ (hiển thị cho sinh viên)
                                                                        </label>
                                                                        <div className={styles.formGroup} style={{ width: '100px' }}>
                                                                            <label>Điểm</label>
                                                                            <input
                                                                                type="number"
                                                                                value={testCaseForm.points}
                                                                                onChange={(e) => setTestCaseForm({ ...testCaseForm, points: parseInt(e.target.value) })}
                                                                            />
                                                                        </div>
                                                                        <button type="submit" className={styles.addTestCaseBtn}>
                                                                            <Plus size={16} /> Thêm
                                                                        </button>
                                                                    </div>
                                                                </form>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Create/Edit Modal */}
                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>{editingProblem ? 'Sửa Bài Tập' : 'Tạo Bài Tập Mới'}</h2>
                                <button onClick={closeModal}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Mã bài tập *</label>
                                        <input
                                            type="text"
                                            value={formData.problem_code}
                                            onChange={(e) => setFormData({ ...formData, problem_code: e.target.value })}
                                            placeholder="VD: P001"
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Độ khó</label>
                                        <select
                                            value={formData.difficulty}
                                            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                        >
                                            <option value="easy">Dễ</option>
                                            <option value="medium">Trung bình</option>
                                            <option value="hard">Khó</option>
                                        </select>
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Tiêu đề *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Tên bài tập"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Mô tả</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Mô tả chi tiết bài tập..."
                                        rows={6}
                                    />
                                </div>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Giới hạn thời gian (ms)</label>
                                        <input
                                            type="number"
                                            value={formData.time_limit ?? ''}
                                            onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Giới hạn bộ nhớ (MB)</label>
                                        <input
                                            type="number"
                                            value={formData.memory_limit ?? ''}
                                            onChange={(e) => setFormData({ ...formData, memory_limit: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" onClick={closeModal} className={styles.cancelBtn}>
                                        Hủy
                                    </button>
                                    <button type="submit" className={styles.submitBtn}>
                                        <Save size={16} />
                                        {editingProblem ? 'Cập nhật' : 'Tạo'}
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
