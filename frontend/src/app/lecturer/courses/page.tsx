'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService, Course, EnrolledStudent } from '@/services/courses';
import { fetchWithAuth } from '@/services/api';
import styles from './courses.module.scss';
import { BookOpen, Plus, Search, Edit, Trash2, X, Save, Code2, Users } from 'lucide-react';

export default function LecturerCoursesPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [formData, setFormData] = useState({
        course_code: '',
        course_name: '',
        category: '',
        programming_languages: ['C', 'C++']
    });

    // Student Enrollment State (Classes are no longer tied to Courses)
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState<Course | null>(null);

    const { data: courses, isLoading, isError, error } = useQuery({
        queryKey: ['courses'],
        queryFn: () => courseService.getCourses(),
        retry: false
    });



    if (isError) {
        console.error('Failed to fetch courses:', error);
    }

    const createMutation = useMutation({
        mutationFn: (data: any) => courseService.createCourse(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            closeModal();
        },
        onError: (error: any) => {
            console.error('Create course error:', error);
            alert('Lỗi: ' + (error.message || 'Không thể tạo Học phần'));
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => courseService.updateCourse(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            closeModal();
        },
        onError: (error: any) => {
            console.error('Update course error:', error);
            alert('Lỗi: ' + (error.message || 'Không thể cập nhật Học phần'));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => courseService.deleteCourse(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        },
        onError: (error: any) => {
            console.error('Delete course error:', error);
            alert('Lỗi: ' + (error.message || 'Không thể xóa Học phần'));
        }
    });



    const openCreateModal = () => {
        console.log('openCreateModal called');
        setEditingCourse(null);
        setFormData({
            course_code: '',
            course_name: '',
            category: '',
            programming_languages: ['C', 'C++']
        });
        setShowModal(true);
        console.log('showModal set to true');
    };

    const openEditModal = (course: Course) => {
        setEditingCourse(course);
        setFormData({
            course_code: course.course_code,
            course_name: course.course_name,
            category: course.category || '',
            programming_languages: course.programming_languages || ['C', 'C++']
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCourse(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCourse) {
            updateMutation.mutate({ id: editingCourse.course_id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Bạn có chắc muốn xóa Học phần này?')) {
            deleteMutation.mutate(id);
        }
        if (confirm('Bạn có chắc muốn xóa Học phần này?')) {
            deleteMutation.mutate(id);
        }
    };

    const openEnrollModal = (course: Course) => {
        setSelectedCourseForEnroll(course);
        setShowEnrollModal(true);
    };

    const filteredCourses = courses?.filter((c: Course) =>
        c.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.course_code.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleLanguageToggle = (lang: string) => {
        const current = formData.programming_languages;
        if (current.includes(lang)) {
            setFormData({ ...formData, programming_languages: current.filter(l => l !== lang) });
        } else {
            setFormData({ ...formData, programming_languages: [...current, lang] });
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <BookOpen size={24} />
                            Quản Lý Học phần
                        </h1>
                        <p>{courses?.length || 0} Học phần</p>
                    </div>
                    <button className={styles.addBtn} onClick={openCreateModal}>
                        <Plus size={18} />
                        Tạo Học phần
                    </button>
                </div>

                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm Học phần..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loading}>Đang tải...</div>
                    ) : filteredCourses.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.icon}>📚</div>
                            <h3>Chưa có Học phần</h3>
                            <p>Tạo Học phần mới để bắt đầu.</p>
                        </div>
                    ) : (
                        <div className={styles.courseGrid}>
                            {filteredCourses.map((course: Course) => (
                                <div key={course.course_id} className={styles.courseCard}>
                                    <div className={styles.cardHeader}>
                                        <span className={styles.courseCode}>{course.course_code}</span>
                                        <div className={styles.cardActions}>
                                            <button
                                                className={styles.iconBtn}
                                                onClick={() => openEditModal(course)}
                                                title="Sửa"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className={`${styles.iconBtn} ${styles.danger}`}
                                                onClick={() => handleDelete(course.course_id)}
                                                title="Xóa"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className={styles.courseName}>{course.course_name}</h3>
                                    {course.category && (
                                        <span className={styles.category}>{course.category}</span>
                                    )}
                                    <div className={styles.stats}>
                                        <div className={styles.stat}>
                                            <Code2 size={14} />
                                            <span>{course.problem_count || 0} bài tập</span>
                                        </div>
                                        <div className={styles.stat}>
                                            <Users size={14} />
                                            <span>{course.enrollment_count || 0} sinh viên</span>
                                        </div>
                                    </div>
                                    <div className={styles.languages}>
                                        {course.programming_languages?.map(lang => (
                                            <span key={lang} className={styles.langTag}>{lang}</span>
                                        ))}
                                    </div>
                                    <button
                                        className={styles.manageClassesBtn}
                                        onClick={() => openEnrollModal(course)}
                                        style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', background: '#3b82f620', border: '1px solid #3b82f640', color: '#3b82f6', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Users size={16} />
                                        Sinh viên ({course.enrollment_count || 0})
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>{editingCourse ? 'Sửa Học phần' : 'Tạo Học phần Mới'}</h2>
                                <button onClick={closeModal}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className={styles.modalForm}>
                                <div className={styles.formGroup}>
                                    <label>Mã Học phần *</label>
                                    <input
                                        type="text"
                                        value={formData.course_code}
                                        onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                                        placeholder="VD: CS101"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Tên Học phần *</label>
                                    <input
                                        type="text"
                                        value={formData.course_name}
                                        onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                                        placeholder="VD: Lập trình C cơ bản"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Danh mục</label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="VD: Lập trình, Cơ sở dữ liệu..."
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Ngôn ngữ lập trình</label>
                                    <div className={styles.languageCheckboxes}>
                                        {['C', 'C++', 'Python', 'Java', 'JavaScript'].map(lang => (
                                            <label key={lang} className={styles.checkbox}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.programming_languages.includes(lang)}
                                                    onChange={() => handleLanguageToggle(lang)}
                                                />
                                                {lang}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" onClick={closeModal} className={styles.cancelBtn}>
                                        Hủy
                                    </button>
                                    <button type="submit" className={styles.submitBtn}>
                                        <Save size={16} />
                                        {editingCourse ? 'Cập nhật' : 'Tạo'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
                }

                {/* Student Enrollment Modal */}
                {showEnrollModal && selectedCourseForEnroll && (
                    <StudentEnrollmentModal
                        course={selectedCourseForEnroll}
                        onClose={() => setShowEnrollModal(false)}
                    />
                )}
            </div >
        </div >
    );
}

// Student Enrollment Modal Component
function StudentEnrollmentModal({ course, onClose }: { course: Course; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'search' | 'import'>('search');
    const [csvData, setCsvData] = useState('');
    const [parsedStudents, setParsedStudents] = useState<{ student_code: string; full_name: string; class_name?: string }[]>([]);

    // Fetch all students
    const { data: allStudents } = useQuery({
        queryKey: ['all-students'],
        queryFn: async () => {
            const response = await fetchWithAuth('/users/students');
            if (!response.ok) throw new Error('Không thể tải danh sách sinh viên');
            return response.json();
        }
    });

    const { data: enrolledStudents, isLoading } = useQuery({
        queryKey: ['course-students', course.course_id],
        queryFn: () => courseService.getEnrolledStudents(course.course_id)
    });

    const enrollMutation = useMutation({
        mutationFn: (studentIds: string[]) => courseService.enrollStudents(course.course_id, studentIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-students', course.course_id] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            queryClient.invalidateQueries({ queryKey: ['all-students'] });
            setSelectedStudentIds([]);
            setParsedStudents([]);
            setCsvData('');
            alert('Đã thêm sinh viên vào học phần thành công!');
        },
        onError: (error: any) => {
            alert('Lỗi: ' + (error.message || 'Không thể đăng ký sinh viên'));
        }
    });

    const bulkImportMutation = useMutation({
        mutationFn: async (students: { student_code: string; full_name: string; class_name?: string }[]) => {
            const response = await fetchWithAuth('/users/bulk-import', {
                method: 'POST',
                body: JSON.stringify({
                    course_id: course.course_id,
                    students: students.map(s => ({
                        student_code: s.student_code,
                        full_name: s.full_name,
                        email: `${s.student_code}@student.edu.vn`,
                        class_name: s.class_name
                    }))
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Không thể import sinh viên');
            }
            return response.json();
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['course-students', course.course_id] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            queryClient.invalidateQueries({ queryKey: ['all-students'] });
            setParsedStudents([]);
            setCsvData('');
            alert(`Import thành công!\nĐã tạo: ${result.created}\nĐã enroll: ${result.enrolled}\nBỏ qua: ${result.skipped}`);
        },
        onError: (error: any) => {
            alert('Lỗi: ' + (error.message || 'Không thể import sinh viên'));
        }
    });

    const unenrollMutation = useMutation({
        mutationFn: (studentId: string) => courseService.unenrollStudent(course.course_id, studentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-students', course.course_id] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        },
        onError: (error: any) => {
            alert('Lỗi: ' + (error.message || 'Không thể hủy đăng ký sinh viên'));
        }
    });

    // Filter students not yet enrolled
    const enrolledIds = enrolledStudents?.map((s: EnrolledStudent) => s.student_id) || [];
    const availableStudents = allStudents?.filter((s: any) =>
        !enrolledIds.includes(s.user_id) &&
        (s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.student_code && s.student_code.toLowerCase().includes(searchQuery.toLowerCase())))
    ) || [];

    const handleEnroll = () => {
        if (selectedStudentIds.length === 0) {
            alert('Vui lòng chọn ít nhất một sinh viên');
            return;
        }
        enrollMutation.mutate(selectedStudentIds);
    };

    const toggleStudent = (userId: string) => {
        if (selectedStudentIds.includes(userId)) {
            setSelectedStudentIds(selectedStudentIds.filter(id => id !== userId));
        } else {
            setSelectedStudentIds([...selectedStudentIds, userId]);
        }
    };

    const parseCSV = () => {
        const lines = csvData.split('\n').filter(line => line.trim());
        const students: { student_code: string; full_name: string; class_name?: string }[] = [];

        const hasHeader = lines[0]?.toLowerCase().includes('stt') || lines[0]?.toLowerCase().includes('mã sinh viên');
        const startIndex = hasHeader ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
            if (parts.length >= 3) {
                students.push({
                    student_code: parts[1],
                    full_name: parts[2],
                    class_name: parts[3] || undefined
                });
            }
        }
        setParsedStudents(students);
    };

    const handleBulkImport = () => {
        if (parsedStudents.length === 0) {
            alert('Vui lòng nhập và phân tích dữ liệu trước');
            return;
        }
        bulkImportMutation.mutate(parsedStudents);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal} style={{ maxWidth: '950px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2>Quản lý Sinh viên - {course.course_name}</h2>
                    </div>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <div className={styles.modalContent} style={{ padding: '1.5rem', overflow: 'auto', flex: 1 }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <button
                            onClick={() => setActiveTab('search')}
                            style={{
                                padding: '0.5rem 1rem',
                                background: activeTab === 'search' ? '#22c55e' : '#333',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <Search size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Tìm & Thêm
                        </button>
                        <button
                            onClick={() => setActiveTab('import')}
                            style={{
                                padding: '0.5rem 1rem',
                                background: activeTab === 'import' ? '#3b82f6' : '#333',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <Plus size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Import CSV
                        </button>
                    </div>

                    {/* Search & Add Tab */}
                    {activeTab === 'search' && (
                        <div style={{ marginBottom: '2rem', background: 'rgba(34,197,94,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Tìm sinh viên theo tên, email hoặc mã..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #333', background: '#1a1a2e', color: '#fff' }}
                                />
                            </div>

                            <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '1rem', background: '#0a0a15', borderRadius: '6px', border: '1px solid #333' }}>
                                {availableStudents.length === 0 ? (
                                    <p style={{ color: '#666', padding: '1rem', textAlign: 'center', margin: 0 }}>
                                        {searchQuery ? 'Không tìm thấy sinh viên' : 'Nhập từ khóa để tìm sinh viên'}
                                    </p>
                                ) : (
                                    availableStudents.slice(0, 50).map((student: any) => (
                                        <label
                                            key={student.user_id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.6rem 1rem',
                                                borderBottom: '1px solid #ffffff10',
                                                cursor: 'pointer',
                                                background: selectedStudentIds.includes(student.user_id) ? 'rgba(34,197,94,0.2)' : 'transparent'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.includes(student.user_id)}
                                                onChange={() => toggleStudent(student.user_id)}
                                            />
                                            <span style={{ color: '#fff', fontWeight: 500, minWidth: '100px' }}>{student.student_code || '—'}</span>
                                            <span style={{ color: '#ccc', flex: 1 }}>{student.full_name}</span>
                                            <span style={{ color: '#888', fontSize: '0.85rem' }}>{student.class_name || ''}</span>
                                        </label>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={handleEnroll}
                                disabled={selectedStudentIds.length === 0 || enrollMutation.isPending}
                                style={{
                                    padding: '0.6rem 1.5rem',
                                    background: selectedStudentIds.length > 0 ? '#22c55e' : '#333',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: selectedStudentIds.length > 0 ? 'pointer' : 'not-allowed',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Users size={16} />
                                {enrollMutation.isPending ? 'Đang thêm...' : `Thêm ${selectedStudentIds.length} sinh viên`}
                            </button>
                        </div>
                    )}

                    {/* Import CSV Tab */}
                    {activeTab === 'import' && (
                        <div style={{ marginBottom: '2rem', background: 'rgba(59,130,246,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)' }}>
                            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                Upload file CSV hoặc paste danh sách theo format: <code style={{ background: '#333', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>STT,Mã sinh viên,Họ và tên,Lớp</code>
                            </p>

                            {/* File Upload */}
                            <div style={{ marginBottom: '1rem' }}>
                                <input
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const text = event.target?.result as string;
                                                setCsvData(text);
                                            };
                                            reader.readAsText(file);
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                    id="csv-file-upload-lecturer"
                                />
                                <label
                                    htmlFor="csv-file-upload-lecturer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1rem',
                                        background: '#2a2a4a',
                                        color: '#fff',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        border: '1px dashed #555'
                                    }}
                                >
                                    <Plus size={16} />
                                    Chọn file CSV
                                </label>
                            </div>

                            <textarea
                                value={csvData}
                                onChange={(e) => setCsvData(e.target.value)}
                                placeholder={'STT,Mã sinh viên,Họ và tên,Lớp\n1,6251071037,Thành Ngọc Huy,CQ.62.CN.CNTT\n2,6351071001,Phạm Đức An,CQ.63.CN.CNTT'}
                                rows={6}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #333', background: '#1a1a2e', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '0.5rem' }}
                            />

                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <button
                                    onClick={parseCSV}
                                    style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    Phân tích dữ liệu
                                </button>
                            </div>

                            {parsedStudents.length > 0 && (
                                <div style={{ background: '#0a0a15', borderRadius: '6px', border: '1px solid #333', marginBottom: '1rem' }}>
                                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #333', color: '#fff', fontWeight: 600 }}>
                                        Xem trước: {parsedStudents.length} sinh viên
                                    </div>
                                    <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                                        {parsedStudents.slice(0, 10).map((s, i) => (
                                            <div key={i} style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #ffffff10', display: 'flex', gap: '1rem' }}>
                                                <span style={{ color: '#fff', minWidth: '100px' }}>{s.student_code}</span>
                                                <span style={{ color: '#ccc', flex: 1 }}>{s.full_name}</span>
                                                <span style={{ color: '#888' }}>{s.class_name || ''}</span>
                                            </div>
                                        ))}
                                        {parsedStudents.length > 10 && (
                                            <div style={{ padding: '0.5rem 1rem', color: '#666', textAlign: 'center' }}>
                                                ... và {parsedStudents.length - 10} sinh viên khác
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleBulkImport}
                                disabled={parsedStudents.length === 0 || bulkImportMutation.isPending}
                                style={{
                                    padding: '0.6rem 1.5rem',
                                    background: parsedStudents.length > 0 ? '#3b82f6' : '#333',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: parsedStudents.length > 0 ? 'pointer' : 'not-allowed',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Users size={16} />
                                {bulkImportMutation.isPending ? 'Đang import...' : `Import & Enroll ${parsedStudents.length} sinh viên`}
                            </button>

                            <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                                * Sinh viên mới sẽ được tạo tự động và enroll vào học phần này
                            </p>
                        </div>
                    )}

                    {/* Enrolled students list */}
                    <h4 style={{ color: '#fff', marginBottom: '1rem' }}>
                        Sinh viên đã đăng ký ({enrolledStudents?.length || 0})
                    </h4>

                    {isLoading ? (
                        <p style={{ color: '#ccc', textAlign: 'center', padding: '2rem' }}>Đang tải...</p>
                    ) : !enrolledStudents || enrolledStudents.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                            Chưa có sinh viên đăng ký học phần này.
                        </p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem', color: '#888', fontSize: '0.85rem' }}>Mã SV</th>
                                    <th style={{ padding: '0.75rem', color: '#888', fontSize: '0.85rem' }}>Họ tên</th>
                                    <th style={{ padding: '0.75rem', color: '#888', fontSize: '0.85rem' }}>Lớp</th>
                                    <th style={{ padding: '0.75rem', color: '#888', fontSize: '0.85rem', textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrolledStudents.map((student: EnrolledStudent) => (
                                    <tr key={student.student_id} style={{ borderBottom: '1px solid #ffffff10' }}>
                                        <td style={{ padding: '0.75rem', color: '#fff', fontWeight: 500 }}>{student.student_code}</td>
                                        <td style={{ padding: '0.75rem', color: '#ccc' }}>{student.full_name}</td>
                                        <td style={{ padding: '0.75rem', color: '#ccc' }}>{student.class_name || '-'}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Bạn có chắc muốn hủy đăng ký sinh viên này?')) {
                                                        unenrollMutation.mutate(student.student_id);
                                                    }
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                title="Hủy đăng ký"
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
            </div>
        </div>
    );
}

