'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/api';
import { classService, courseService, Class, Course } from '@/services/courses';
import styles from './students.module.scss';
import { Users, Plus, Search, Upload, X, Save, Download, UserPlus, Filter, Check, AlertCircle, Mail } from 'lucide-react';

interface Student {
    user_id: string;
    email: string;
    full_name: string;
    is_active: boolean;
    student_code: string;
    class_name?: string;
    year_of_admission?: number;
    major?: string;
}

interface StudentImportItem {
    student_code: string;
    full_name: string;
    email: string;
    class_name?: string;
    year_of_admission?: number;
    major?: string;
}

export default function LecturerStudentsPage() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [showSingleModal, setShowSingleModal] = useState(false);
    const [importData, setImportData] = useState<StudentImportItem[]>([]);
    const [manualEntry, setManualEntry] = useState('');
    const [importResult, setImportResult] = useState<any>(null);
    const [singleStudent, setSingleStudent] = useState({
        student_code: '',
        full_name: '',
        email: '',
        class_name: '',
        year_of_admission: new Date().getFullYear(),
        major: '',
        initial_class_id: ''
    });
    const [importCourseId, setImportCourseId] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    const { data: students, isLoading } = useQuery({
        queryKey: ['students', selectedCourseFilter],
        queryFn: () => userService.getStudents(undefined, selectedCourseFilter || undefined),
        enabled: !!selectedCourseFilter // Only fetch if course is selected
    });

    const { data: courses } = useQuery({
        queryKey: ['courses'],
        queryFn: courseService.getCourses
    });

    const { data: classes } = useQuery({
        queryKey: ['classes'],
        queryFn: classService.getClasses
    });



    const importMutation = useMutation({
        mutationFn: (data: { class_id?: string; course_id?: string; students: StudentImportItem[] }) =>
            userService.bulkImportStudents(data),
        onSuccess: (result) => {
            setImportResult(result);
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
        onError: (error: any) => {
            alert('Lỗi: ' + error.message);
        }
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => {
            const payload = { ...data, role_name: 'student' };
            if (!payload.initial_class_id) {
                delete payload.initial_class_id;
            }
            return userService.createUser(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setShowSingleModal(false);
            setSingleStudent({
                student_code: '',
                full_name: '',
                email: '',
                class_name: '',
                year_of_admission: new Date().getFullYear(),
                major: '',
                initial_class_id: ''
            });
        },
        onError: (error: any) => {
            alert('Lỗi: ' + error.message);
        }
    });

    const sendEmailMutation = useMutation({
        mutationFn: (userIds: string[]) => userService.sendActivationEmails(userIds),
        onSuccess: (result) => {
            alert(`Đã gửi email thành công cho ${result.sent} sinh viên.`);
            setSelectedStudentIds([]);
            setSelectAll(false);
        },
        onError: (error: any) => {
            alert('Lỗi gửi email: ' + error.message);
        }
    });

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
                // Format: STT, Mã sinh viên, Họ và tên, Lớp
                if (parts.length >= 3) { // Ensure at least code and name
                    const studentCode = parts[1];
                    // Generate email if missing
                    const email = `${studentCode}@student.edu.vn`;

                    students.push({
                        student_code: studentCode,
                        full_name: parts[2],
                        email: email,
                        class_name: parts[3] || undefined,
                        year_of_admission: undefined, // Not provided in this format
                        major: undefined
                    });
                }
            } else {
                // Old Format: student_code, full_name, email, class_name...
                if (parts.length >= 3) {
                    students.push({
                        student_code: parts[0],
                        full_name: parts[1],
                        email: parts[2],
                        class_name: parts[3] || undefined,
                        year_of_admission: parts[4] ? parseInt(parts[4]) : undefined,
                        major: parts[5] || undefined
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
        if (importData.length === 0) {
            alert('Không có dữ liệu để import');
            return;
        }
        if (!importCourseId) {
            alert('Vui lòng chọn Học phần');
            return;
        }
        importMutation.mutate({
            course_id: importCourseId,
            students: importData
        });
    };

    const handleSingleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(singleStudent);
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportData([]);
        setImportResult(null);
        setManualEntry('');
        setImportCourseId('');
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

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        if (checked && students) {
            setSelectedStudentIds(students.map((s: Student) => s.user_id));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleSelectStudent = (userId: string, checked: boolean) => {
        if (checked) {
            setSelectedStudentIds([...selectedStudentIds, userId]);
        } else {
            setSelectedStudentIds(selectedStudentIds.filter(id => id !== userId));
            setSelectAll(false);
        }
    };

    const handleSendEmail = (userIds: string[]) => {
        if (confirm(`Bạn có chắc muốn gửi email kích hoạt cho ${userIds.length} sinh viên?`)) {
            sendEmailMutation.mutate(userIds);
        }
    };

    const filteredStudents = students?.filter((s: Student) =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_code.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h1>
                            <Users size={24} />
                            Quản Lý Sinh Viên
                        </h1>
                        <p>{students?.length || 0} sinh viên</p>
                    </div>
                    <div className={styles.headerActions}>
                        {selectedStudentIds.length > 0 && (
                            <button
                                className={styles.importBtn} // reuse verify style 
                                style={{ background: '#3b82f6', color: '#fff', border: 'none' }}
                                onClick={() => handleSendEmail(selectedStudentIds)}
                            >
                                <Mail size={18} />
                                Gửi Mail ({selectedStudentIds.length})
                            </button>
                        )}
                        <button className={styles.importBtn} onClick={() => setShowImportModal(true)}>
                            <Upload size={18} />
                            Import Hàng Loạt
                        </button>
                        <button className={styles.addBtn} onClick={() => setShowSingleModal(true)}>
                            <UserPlus size={18} />
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
                    <div className={styles.classFilter}>
                        <Filter size={18} />
                        <select
                            value={selectedCourseFilter}
                            onChange={(e) => {
                                setSelectedCourseFilter(e.target.value);
                            }}
                        >
                            <option value="">Chọn Học phần</option>
                            {courses?.map((course: Course) => (
                                <option key={course.course_id} value={course.course_id}>
                                    {course.course_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {!selectedCourseFilter && (
                    <div className={styles.emptyState}>
                        <div className={styles.icon}>👈</div>
                        <h3>Chọn Học phần để xem danh sách sinh viên</h3>
                    </div>
                )}

                {selectedCourseFilter && (
                    <div className={styles.tableContainer}>
                        {isLoading ? (
                            <div className={styles.loading}>Đang tải...</div>
                        ) : filteredStudents.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.icon}>👨‍🎓</div>
                                <h3>Chưa có sinh viên</h3>
                                <p>Import danh sách hoặc thêm sinh viên mới.</p>
                            </div>
                        ) : (
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                            />
                                        </th>
                                        <th>Mã SV</th>
                                        <th>Họ tên</th>
                                        <th>Email</th>
                                        <th>Lớp</th>
                                        <th>Khóa</th>
                                        <th>Ngành</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student: Student) => (
                                        <tr key={student.user_id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.user_id)}
                                                    onChange={(e) => handleSelectStudent(student.user_id, e.target.checked)}
                                                />
                                            </td>
                                            <td className={styles.codeCell}>
                                                <span className={styles.studentCode}>{student.student_code}</span>
                                            </td>
                                            <td className={styles.nameCell}>{student.full_name}</td>
                                            <td>{student.email}</td>
                                            <td>{student.class_name || '—'}</td>
                                            <td>{student.year_of_admission || '—'}</td>
                                            <td>{student.major || '—'}</td>
                                            <td>
                                                <span className={`${styles.status} ${student.is_active ? styles.active : styles.inactive}`}>
                                                    {student.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className={styles.iconBtn}
                                                    title="Gửi email kích hoạt"
                                                    onClick={() => handleSendEmail([student.user_id])}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                                                >
                                                    <Mail size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Import Modal */}
                {showImportModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>Import Sinh Viên Hàng Loạt</h2>
                                <button onClick={closeImportModal}><X size={20} /></button>
                            </div>

                            {importResult ? (
                                <div className={styles.importResult}>
                                    <div className={styles.resultStats}>
                                        <div className={`${styles.statItem} ${styles.success}`}>
                                            <Check size={24} />
                                            <span className={styles.number}>{importResult.created}</span>
                                            <span className={styles.label}>Đã tạo</span>
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
                                    <div className={styles.formGroup}>
                                        <label>Chọn Học phần *</label>
                                        <select
                                            value={importCourseId}
                                            onChange={(e) => {
                                                setImportCourseId(e.target.value);
                                            }}
                                        >
                                            <option value="">-- Chọn Học phần --</option>
                                            {courses?.map((c: any) => (
                                                <option key={c.course_id} value={c.course_id}>
                                                    {c.course_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>



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
                                                        {importData.length > 5 && (
                                                            <tr>
                                                                <td colSpan={3} className={styles.moreRows}>
                                                                    ... và {importData.length - 5} sinh viên khác
                                                                </td>
                                                            </tr>
                                                        )}
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

                {/* Single Create Modal */}
                {showSingleModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>Thêm Sinh Viên</h2>
                                <button onClick={() => setShowSingleModal(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSingleCreate} className={styles.modalForm}>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Mã sinh viên *</label>
                                        <input
                                            type="text"
                                            value={singleStudent.student_code}
                                            onChange={(e) => setSingleStudent({ ...singleStudent, student_code: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Họ tên *</label>
                                        <input
                                            type="text"
                                            value={singleStudent.full_name}
                                            onChange={(e) => setSingleStudent({ ...singleStudent, full_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        value={singleStudent.email}
                                        onChange={(e) => setSingleStudent({ ...singleStudent, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Lớp</label>
                                        <input
                                            type="text"
                                            value={singleStudent.class_name}
                                            onChange={(e) => setSingleStudent({ ...singleStudent, class_name: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Khóa</label>
                                        <input
                                            type="number"
                                            value={singleStudent.year_of_admission}
                                            onChange={(e) => setSingleStudent({ ...singleStudent, year_of_admission: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Ngành</label>
                                    <input
                                        type="text"
                                        value={singleStudent.major}
                                        onChange={(e) => setSingleStudent({ ...singleStudent, major: e.target.value })}
                                    />
                                </div>

                                <div className={styles.modalActions}>
                                    <button type="button" onClick={() => setShowSingleModal(false)} className={styles.cancelBtn}>
                                        Hủy
                                    </button>
                                    <button type="submit" className={styles.submitBtn}>
                                        <Save size={16} />
                                        Tạo sinh viên
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
                }
            </div >
        </div >
    );
}
