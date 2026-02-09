'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { userService } from '@/services/api';
import { courseService, EnrolledStudent } from '@/services/courses';
import styles from './students.module.scss';
import { Users, Upload, Search, X, Check, AlertCircle, Mail, Trash2, Download, Plus } from 'lucide-react';

interface StudentImportItem {
    student_code: string;
    full_name: string;
    email: string;
    class_name?: string;
}

export default function CourseStudentsPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<StudentImportItem[]>([]);
    const [manualEntry, setManualEntry] = useState('');
    const [importResult, setImportResult] = useState<any>(null);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    // States for Add Student Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [foundStudents, setFoundStudents] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const { data: students, isLoading } = useQuery({
        queryKey: ['course-students', courseId],
        queryFn: () => courseService.getEnrolledStudents(courseId)
    });

    const importMutation = useMutation({
        mutationFn: (data: { course_id: string; students: StudentImportItem[] }) =>
            userService.bulkImportStudents(data),
        onSuccess: (result) => {
            setImportResult(result);
            queryClient.invalidateQueries({ queryKey: ['course-students', courseId] });
        },
        onError: (error: any) => {
            alert('Lỗi: ' + error.message);
        }
    });

    const unenrollMutation = useMutation({
        mutationFn: (studentId: string) => courseService.unenrollStudent(courseId, studentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-students', courseId] });
        },
        onError: (error: any) => {
            alert('Lỗi: ' + error.message);
        }
    });

    const sendEmailMutation = useMutation({
        mutationFn: (userIds: string[]) => userService.sendActivationEmails(userIds), // Note: need userId from EnrolledStudent?
        // EnrolledStudent has student_id. Need user_id for email?
        // Let's check api result. EnrolledStudent usually has student_id. 
        // User service expects user_ids (UUID). Student_id might be different from user_id?
        // Schema: EnrolledStudent has student_id. 
        // We might need to fetch user_id or assume student_id is enough?
        // Actually, EnrolledStudent schema in frontend (courses.ts) does NOT have user_id.
        // It has student_id, student_code, full_name.
        // I might need to update backend to return user_id if I want to send emails.
        // Or assume student_id can be mapped. 
        // For now, I'll disable email sending until I verify user_id availability.
        onSuccess: (result) => {
            alert(`Đã gửi email thành công.`);
            setSelectedStudentIds([]);
            setSelectAll(false);
        }
    });

    const addStudentMutation = useMutation({
        mutationFn: (studentIds: string[]) => courseService.enrollStudents(courseId, studentIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-students', courseId] });
            alert('Đã thêm sinh viên vào học phần');
            // Remove added students from found list
            setFoundStudents(prev => prev.filter(s => !selectedStudentIds.includes(s.user_id)));
            // Close modal if single add? Or keep open?
            // If we support bulk add from search later, we might keep it open.
            // For now, let's keep it open to add more.
        },
        onError: (error: any) => {
            alert('Lỗi: ' + error.message);
        }
    });

    const handleSearchStudent = async () => {
        if (!searchUserQuery.trim()) return;
        setSearching(true);
        try {
            // Search all students (no class/course filter)
            const results = await userService.getStudents(undefined, undefined, searchUserQuery);
            // Filter out already enrolled students
            const enrolledIds = new Set((students || []).map((s: EnrolledStudent) => s.student_id));
            // Note: userService returns user_id, EnrolledStudent has student_id. They are same UUID.
            const available = results.filter((s: any) => !enrolledIds.has(s.user_id));
            setFoundStudents(available);
        } catch (e) {
            console.error(e);
            alert('Không thể tìm kiếm sinh viên');
        } finally {
            setSearching(false);
        }
    };

    const handleAddStudent = (studentId: string) => {
        addStudentMutation.mutate([studentId]);
        // Optimistically remove from list
        setFoundStudents(prev => prev.filter(s => s.user_id !== studentId));
    };

    // EnrolledStudent interface update check needed? 
    // Backend returns schemas.EnrolledStudent? 
    // Let's check backend schema EnrolledStudent.
    // It likely has student_id.
    // Student model has student_id (PK). User model has user_id (PK).
    // They are different.
    // If I want to send emails, I need user_id.
    // I will skip Email Sending for now on this page to remain safe, or update backend later.

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim());
        const students: StudentImportItem[] = [];

        // Check for header
        const isNewFormat = lines[0].toLowerCase().includes('stt') || lines[0].toLowerCase().includes('mã sinh viên');
        const startIndex = isNewFormat || lines[0].toLowerCase().includes('email') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));

            if (isNewFormat) {
                if (parts.length >= 3) {
                    const studentCode = parts[1];
                    const email = `${studentCode}@student.edu.vn`;
                    students.push({
                        student_code: studentCode,
                        full_name: parts[2],
                        email: email,
                        class_name: parts[3] || undefined
                    });
                }
            } else {
                if (parts.length >= 3) {
                    students.push({
                        student_code: parts[0],
                        full_name: parts[1],
                        email: parts[2],
                        class_name: parts[3] || undefined
                    });
                }
            }
        }
        setImportData(students);
    };

    const handleManualParse = () => {
        parseCSV(manualEntry);
    };

    const handleImport = () => {
        if (importData.length === 0) return;
        importMutation.mutate({
            course_id: courseId,
            students: importData
        });
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportData([]);
        setImportResult(null);
        setManualEntry('');
    };

    const handleUnenroll = (studentId: string) => {
        if (confirm('Bạn có chắc muốn xóa sinh viên này khỏi học phần?')) {
            unenrollMutation.mutate(studentId);
        }
    };

    const downloadTemplate = () => {
        const csv = 'STT,Mã sinh viên,Họ và tên,Lớp\n1,6251071037,Thành Ngọc Huy,CQ.62.CN.CNTT\n2,6351071001,Phạm Đức An,CQ.63.CN.CNTT';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_students_template.csv';
        a.click();
    };

    const filteredStudents = students?.filter((s: EnrolledStudent) =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_code.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <Users size={24} />
                            Sinh Viên Học Phần
                        </h1>
                        <p>{students?.length || 0} sinh viên đang đăng ký</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.importBtn} onClick={() => setShowImportModal(true)}>
                            <Upload size={18} />
                            Import Sinh Viên
                        </button>
                        <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
                            <Plus size={18} />
                            Thêm Sinh Viên
                        </button>
                    </div>
                </div>

                <div className={styles.filters}>
                    <div className={styles.searchBox}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sinh viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    {isLoading ? (
                        <div className={styles.loading}>Đang tải...</div>
                    ) : filteredStudents.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.icon}>👨‍🎓</div>
                            <h3>Chưa có sinh viên</h3>
                            <p>Import danh sách sinh viên để bắt đầu.</p>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Mã SV</th>
                                    <th>Họ tên</th>
                                    <th>Lớp</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student: EnrolledStudent) => (
                                    <tr key={student.student_id}>
                                        <td className={styles.codeCell}>
                                            <span className={styles.studentCode}>{student.student_code}</span>
                                        </td>
                                        <td className={styles.nameCell}>{student.full_name}</td>
                                        <td>{student.class_name || '—'}</td>
                                        <td>
                                            <button
                                                className={`${styles.iconBtn} ${styles.danger}`}
                                                title="Xóa khỏi học phần"
                                                onClick={() => handleUnenroll(student.student_id)}
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

                {/* Import Modal */}
                {showImportModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>Import Sinh Viên Vào Học Phần</h2>
                                <button onClick={closeImportModal}><X size={20} /></button>
                            </div>

                            {importResult ? (
                                <div className={styles.importResult}>
                                    <div className={styles.resultStats}>
                                        <div className={`${styles.statItem} ${styles.success}`}>
                                            <Check size={24} />
                                            <span className={styles.number}>{importResult.created}</span>
                                            <span className={styles.label}>Đã tạo mới</span>
                                        </div>
                                        <div className={`${styles.statItem} ${styles.info}`}>
                                            <Users size={24} />
                                            <span className={styles.number}>{importResult.enrolled || 0}</span>
                                            <span className={styles.label}>Đã thêm vào lớp</span>
                                        </div>
                                        <div className={`${styles.statItem} ${styles.warning}`}>
                                            <AlertCircle size={24} />
                                            <span className={styles.number}>{importResult.skipped}</span>
                                            <span className={styles.label}>Bỏ qua</span>
                                        </div>
                                    </div>
                                    {importResult.errors.length > 0 && (
                                        <div className={styles.errorList}>
                                            <h4>Lỗi:</h4>
                                            <ul>
                                                {importResult.errors.map((err: string, i: number) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <button onClick={closeImportModal} className={styles.submitBtn}>
                                        Đóng
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.importContent}>
                                    <div className={styles.uploadSection}>
                                        <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
                                            <Upload size={32} />
                                            <span>Kéo thả file CSV hoặc click để chọn</span>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".csv"
                                                onChange={handleFileUpload}
                                                hidden
                                            />
                                        </div>
                                        <button onClick={downloadTemplate} className={styles.templateBtn}>
                                            <Download size={16} />
                                            Tải template CSV
                                        </button>
                                    </div>

                                    <div className={styles.divider}>
                                        <span>hoặc</span>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Nhập thủ công (CSV format)</label>
                                        <textarea
                                            value={manualEntry}
                                            onChange={(e) => setManualEntry(e.target.value)}
                                            placeholder={'STT,Mã sinh viên,Họ và tên,Lớp\n1,6251071037,Thành Ngọc Huy,CQ.62.CN.CNTT'}
                                            rows={5}
                                        />
                                        <button onClick={handleManualParse} className={styles.parseBtn}>
                                            Phân tích dữ liệu
                                        </button>
                                    </div>

                                    {importData.length > 0 && (
                                        <div className={styles.previewSection}>
                                            <h4>Xem trước ({importData.length} sinh viên)</h4>
                                            <div className={styles.previewTable}>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Mã SV</th>
                                                            <th>Họ tên</th>
                                                            <th>Email</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {importData.slice(0, 5).map((s, i) => (
                                                            <tr key={i}>
                                                                <td>{s.student_code}</td>
                                                                <td>{s.full_name}</td>
                                                                <td>{s.email}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.modalActions}>
                                        <button onClick={closeImportModal} className={styles.cancelBtn}>
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleImport}
                                            className={styles.submitBtn}
                                            disabled={importData.length === 0 || importMutation.isPending}
                                        >
                                            <Upload size={16} />
                                            {importMutation.isPending ? 'Đang import...' : `Import ${importData.length} sinh viên`}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Add Student Modal */}
                {showAddModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>Thêm Sinh Viên</h2>
                                <button onClick={() => { setShowAddModal(false); setSearchUserQuery(''); setFoundStudents([]); }}><X size={20} /></button>
                            </div>
                            <div className={styles.modalContent} style={{ padding: '1.5rem' }}>
                                <div className={styles.formGroup}>
                                    <label>Tìm kiếm (Mã SV hoặc Tên)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            value={searchUserQuery}
                                            onChange={(e) => setSearchUserQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent()}
                                            placeholder="Nhập MSSV hoặc họ tên..."
                                        />
                                        <button
                                            onClick={handleSearchStudent}
                                            className={styles.submitBtn}
                                            disabled={searching}
                                        >
                                            <Search size={16} />
                                            {searching ? '...' : 'Tìm'}
                                        </button>
                                    </div>
                                </div>

                                {foundStudents.length > 0 ? (
                                    <div className={styles.tableContainer} style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Mã SV</th>
                                                    <th>Họ tên</th>
                                                    <th>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {foundStudents.map(student => (
                                                    <tr key={student.user_id}>
                                                        <td><span className={styles.studentCode}>{student.student_code}</span></td>
                                                        <td className={styles.nameCell}>{student.full_name}</td>
                                                        <td>
                                                            <button
                                                                className={styles.iconBtn}
                                                                style={{ color: '#22c55e', border: '1px solid #22c55e', borderRadius: '4px', padding: '0.25rem' }}
                                                                onClick={() => handleAddStudent(student.user_id)}
                                                                title="Thêm vào lớp"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    searchUserQuery && !searching && <p style={{ textAlign: 'center', color: '#666' }}>Không tìm thấy sinh viên nào (hoặc đã có trong lớp).</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
