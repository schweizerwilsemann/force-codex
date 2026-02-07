'use client';

import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codingService, Problem, TestCase, SubmissionWithStudent } from '@/services/coding';
import styles from './problems.module.scss';
import { useParams } from 'next/navigation';
import {
    Plus, Edit, Trash2, Search, ChevronDown, ChevronUp,
    Code2, CheckCircle2, XCircle, Eye, Save, X, Upload, FileText,
    ChevronLeft, ChevronRight, Users
} from 'lucide-react';

export default function CourseProblemsPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
    const [showTestCases, setShowTestCases] = useState<string | null>(null);
    const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null);
    const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        problem_code: '',
        title: '',
        description: '',
        difficulty: 'medium',
        time_limit: 1000,
        memory_limit: 256,
        allowed_languages: ['C', 'C++'],
        course_id: courseId
    });

    // Test case form
    const [testCaseForm, setTestCaseForm] = useState({
        input: '',
        expected_output: '',
        is_sample: false,
        points: 10
    });

    // Bulk import state
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [bulkImportText, setBulkImportText] = useState('');
    const [editingTestCaseId, setEditingTestCaseId] = useState<string | null>(null);

    // Pagination state
    const [testPage, setTestPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const { data: problems, isLoading } = useQuery({
        queryKey: ['problems', courseId],
        queryFn: () => codingService.getProblems(courseId)
    });

    const { data: testCases, isLoading: isLoadingTestCases } = useQuery({
        queryKey: ['testCases', showTestCases],
        queryFn: () => codingService.getTestCases(showTestCases!),
        enabled: !!showTestCases
    });

    const { data: submissions, isLoading: isLoadingSubmissions } = useQuery({
        queryKey: ['problemSubmissions', viewingSubmissions],
        queryFn: () => codingService.getAllProblemSubmissions(viewingSubmissions!),
        enabled: !!viewingSubmissions
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => codingService.createProblem(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems', courseId] });
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => codingService.updateProblem(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems', courseId] });
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => codingService.deleteProblem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems', courseId] });
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

    const updateTestCaseMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => codingService.updateTestCase(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testCases', showTestCases] });
            setTestCaseForm({ input: '', expected_output: '', is_sample: false, points: 10 });
            setEditingTestCaseId(null);
            alert('Cập nhật test case thành công');
        },
        onError: (err: any) => alert(err.message)
    });

    const bulkCreateTestCasesMutation = useMutation({
        mutationFn: ({ problemId, testCases }: { problemId: string; testCases: any[] }) =>
            codingService.bulkCreateTestCases(problemId, testCases),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testCases', showTestCases] });
            setBulkImportText('');
            setShowBulkImport(false);
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
            allowed_languages: ['C', 'C++'],
            course_id: courseId
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
            allowed_languages: problem.allowed_languages || ['C', 'C++'],
            course_id: problem.course_id || courseId
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProblem(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Ensure course_id is set
        const submitData = { ...formData, course_id: courseId };

        if (editingProblem) {
            updateMutation.mutate({ id: editingProblem.problem_id, data: submitData });
        } else {
            createMutation.mutate(submitData);
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
            if (editingTestCaseId) {
                updateTestCaseMutation.mutate({ id: editingTestCaseId, data: testCaseForm });
            } else {
                createTestCaseMutation.mutate({ problemId: showTestCases, data: testCaseForm });
            }
        }
    };

    const handleEditTestCase = (tc: TestCase) => {
        setEditingTestCaseId(tc.test_case_id);
        setTestCaseForm({
            input: tc.input,
            expected_output: tc.expected_output,
            is_sample: tc.is_sample,
            points: tc.points
        });
        setShowBulkImport(false);
    };

    const handleCancelEditTestCase = () => {
        setEditingTestCaseId(null);
        setTestCaseForm({ input: '', expected_output: '', is_sample: false, points: 10 });
    };

    const parseBulkTestCases = (text: string) => {
        const lines = text.trim().split('\n');
        const testCases: any[] = [];

        for (const line of lines) {
            if (!line.trim()) continue;

            // Format: input|||expected_output|||points (optional)
            const parts = line.split('|||');
            if (parts.length >= 2) {
                testCases.push({
                    input: parts[0].trim(),
                    expected_output: parts[1].trim(),
                    points: parts[2] ? parseInt(parts[2].trim()) || 10 : 10,
                    is_sample: false
                });
            }
        }
        return testCases;
    };

    const handleBulkImport = () => {
        if (!showTestCases || !bulkImportText.trim()) return;

        const newTestCases = parseBulkTestCases(bulkImportText);
        if (newTestCases.length === 0) {
            alert('Không tìm thấy test case hợp lệ. Định dạng: input|||output|||points');
            return;
        }

        // Check for duplicates
        if (testCases) {
            const existingInputs = new Set(testCases.map((tc: TestCase) => tc.input.trim()));
            const uniqueTestCases = newTestCases.filter((tc: any) => !existingInputs.has(tc.input.trim()));

            if (uniqueTestCases.length === 0) {
                alert('Tất cả các test cases này đã tồn tại!');
                return;
            }

            if (uniqueTestCases.length < newTestCases.length) {
                const duplicatesCount = newTestCases.length - uniqueTestCases.length;
                if (!confirm(`Phát hiện ${duplicatesCount} test cases trùng lặp. Bạn có muốn import ${uniqueTestCases.length} test cases còn lại không?`)) {
                    return;
                }
                bulkCreateTestCasesMutation.mutate({ problemId: showTestCases, testCases: uniqueTestCases });
            } else {
                if (confirm(`Bạn sắp import ${uniqueTestCases.length} test cases. Tiếp tục?`)) {
                    bulkCreateTestCasesMutation.mutate({ problemId: showTestCases, testCases: uniqueTestCases });
                }
            }
        } else {
            if (confirm(`Bạn sắp import ${newTestCases.length} test cases. Tiếp tục?`)) {
                bulkCreateTestCasesMutation.mutate({ problemId: showTestCases, testCases: newTestCases });
            }
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
                            Quản Lý Bài Tập Học Phần
                        </h1>
                        <p>{problems?.length || 0} bài tập trong học phần này</p>
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
                                                    onClick={() => {
                                                        if (showTestCases !== problem.problem_id) setTestPage(1);
                                                        setShowTestCases(showTestCases === problem.problem_id ? null : problem.problem_id);
                                                    }}
                                                    title="Xem test cases"
                                                >
                                                    {showTestCases === problem.problem_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() => {
                                                        setViewingSubmissions(problem.problem_id);
                                                        setShowSubmissionsModal(true);
                                                    }}
                                                    title="Xem bài nộp"
                                                >
                                                    <Users size={16} />
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
                                                                    {testCases?.slice((testPage - 1) * ITEMS_PER_PAGE, testPage * ITEMS_PER_PAGE).map((tc: TestCase, idx: number) => (
                                                                        <div key={tc.test_case_id} className={styles.testCaseItem}>
                                                                            <div className={styles.testCaseHeader}>
                                                                                <span>Test {(testPage - 1) * ITEMS_PER_PAGE + idx + 1}</span>
                                                                                {tc.is_sample && <span className={styles.sampleBadge}>Ví dụ</span>}
                                                                                <span className={styles.points}>{tc.points} điểm</span>
                                                                                <button
                                                                                    className={styles.iconBtn}
                                                                                    onClick={() => handleEditTestCase(tc)}
                                                                                    style={{ marginRight: '0.5rem' }}
                                                                                    title="Sửa"
                                                                                >
                                                                                    <Edit size={14} />
                                                                                </button>
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

                                                                    {/* Pagination Controls */}
                                                                    {testCases && testCases.length > ITEMS_PER_PAGE && (
                                                                        <div className={styles.pagination}>
                                                                            <button
                                                                                onClick={() => setTestPage(p => Math.max(1, p - 1))}
                                                                                disabled={testPage === 1}
                                                                            >
                                                                                <ChevronLeft size={16} />
                                                                            </button>
                                                                            <span>Trang {testPage} / {Math.ceil(testCases.length / ITEMS_PER_PAGE)}</span>
                                                                            <button
                                                                                onClick={() => setTestPage(p => Math.min(Math.ceil(testCases.length / ITEMS_PER_PAGE), p + 1))}
                                                                                disabled={testPage >= Math.ceil(testCases.length / ITEMS_PER_PAGE)}
                                                                            >
                                                                                <ChevronRight size={16} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <form className={styles.addTestCaseForm} onSubmit={handleAddTestCase}>
                                                                    <div className={styles.testCaseFormHeader}>
                                                                        <h5>{showBulkImport ? 'Import Nhiều Test Cases' : (editingTestCaseId ? 'Sửa Test Case' : 'Thêm Test Case Mới')}</h5>
                                                                        <button
                                                                            type="button"
                                                                            className={styles.toggleBulkBtn}
                                                                            onClick={() => setShowBulkImport(!showBulkImport)}
                                                                        >
                                                                            {showBulkImport ? (
                                                                                <><FileText size={14} /> Thêm từng cái</>
                                                                            ) : (
                                                                                <><Upload size={14} /> Import hàng loạt</>
                                                                            )}
                                                                        </button>
                                                                    </div>

                                                                    {showBulkImport ? (
                                                                        <div className={styles.bulkImportSection}>
                                                                            <p className={styles.bulkHelp}>
                                                                                Mỗi dòng một test case. Định dạng: <code>đầu_vào|||đầu_ra|||điểm</code>
                                                                            </p>
                                                                            <p className={styles.bulkExample}>
                                                                                Ví dụ: <code>1 2|||3|||10</code>
                                                                            </p>
                                                                            <textarea
                                                                                className={styles.bulkTextarea}
                                                                                value={bulkImportText}
                                                                                onChange={(e) => setBulkImportText(e.target.value)}
                                                                                placeholder={`1 2|||3|||10\n5 7|||12|||10\n-3 8|||5|||10`}
                                                                                rows={6}
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                className={styles.bulkImportBtn}
                                                                                onClick={handleBulkImport}
                                                                                disabled={bulkCreateTestCasesMutation.isPending}
                                                                            >
                                                                                {bulkCreateTestCasesMutation.isPending ? (
                                                                                    'Đang import...'
                                                                                ) : (
                                                                                    <><Upload size={16} /> Import Test Cases</>
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <>
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
                                                                                {editingTestCaseId ? (
                                                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                                                                        <button type="button" className={styles.cancelBtn} onClick={handleCancelEditTestCase}>
                                                                                            Hủy
                                                                                        </button>
                                                                                        <button type="submit" className={styles.addTestCaseBtn}>
                                                                                            <Save size={16} /> Lưu
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <button type="submit" className={styles.addTestCaseBtn}>
                                                                                        <Plus size={16} /> Thêm
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    )}
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

                {/* Submissions Modal */}
                {showSubmissionsModal && (
                    <div className={styles.modalOverlay}>
                        <div className={`${styles.modal} ${styles.largeModal}`}>
                            <div className={styles.modalHeader}>
                                <h2>Danh Sách Nộp Bài</h2>
                                <button onClick={() => setShowSubmissionsModal(false)}><X size={20} /></button>
                            </div>
                            <div className={styles.modalContent}>
                                {isLoadingSubmissions ? (
                                    <div className={styles.loading}>Đang tải...</div>
                                ) : (
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Sinh viên</th>
                                                <th>MSSV</th>
                                                <th>Trạng thái</th>
                                                <th>Điểm</th>
                                                <th>Thời gian</th>
                                                <th>Nộp lúc</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions?.map((sub: SubmissionWithStudent) => (
                                                <tr key={sub.submission_id}>
                                                    <td>{sub.student?.user?.full_name}</td>
                                                    <td>{sub.student?.student_code}</td>
                                                    <td>
                                                        <span className={sub.status === 'accepted' ? styles.statusSuccess : sub.status === 'wrong_answer' ? styles.statusError : styles.statusPending}>
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                    <td>{sub.score}</td>
                                                    <td>{sub.execution_time ? `${sub.execution_time}ms` : '-'}</td>
                                                    <td>{new Date(sub.created_at).toLocaleString('vi-VN')}</td>
                                                </tr>
                                            ))}
                                            {(!submissions || submissions.length === 0) && (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Chưa có bài nộp nào</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
