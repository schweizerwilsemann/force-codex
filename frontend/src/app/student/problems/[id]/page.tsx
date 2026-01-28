'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { codingService } from '@/services/coding';
import styles from './coding.module.scss';
import { useParams } from 'next/navigation';
import CodeEditor from '@/components/CodeEditor';
import ResizablePanel from '@/components/ResizablePanel';
import {
    Play, Send, RotateCcw, Settings, ChevronDown,
    Clock, Database, CheckCircle2, XCircle, AlertCircle,
    Code2, FileText, History, MessageSquare
} from 'lucide-react';

type TabType = 'description' | 'submissions' | 'discussion';

const LANGUAGE_TEMPLATES: Record<string, string> = {
    'C': `#include <stdio.h>

int main() {
    // Write your code here
    
    return 0;
}`,
    'C++': `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    
    return 0;
}`
};

export default function CodingPage() {
    const params = useParams();
    const problemId = params.id as string;
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('C');
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('description');
    const [isRunning, setIsRunning] = useState(false);

    const { data: problem, isLoading: isProblemLoading } = useQuery({
        queryKey: ['problem', problemId],
        queryFn: () => codingService.getProblem(problemId)
    });

    const { data: submissionHistory, isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery({
        queryKey: ['problem-submissions', problemId],
        queryFn: () => codingService.getProblemSubmissions(problemId),
        enabled: activeTab === 'submissions'
    });

    // Set initial code template when language changes
    useEffect(() => {
        if (!code || code === LANGUAGE_TEMPLATES['C'] || code === LANGUAGE_TEMPLATES['C++']) {
            setCode(LANGUAGE_TEMPLATES[language] || LANGUAGE_TEMPLATES['C']);
        }
    }, [language]);

    const submitMutation = useMutation({
        mutationFn: codingService.createSubmission,
        onSuccess: (data) => {
            setSubmissionId(data.submission_id);
            setIsRunning(true);
        }
    });

    const { data: submissionData, refetch: refetchSubmission } = useQuery({
        queryKey: ['submission', submissionId],
        queryFn: () => codingService.getSubmission(submissionId!),
        enabled: !!submissionId,
    });

    // Polling logic
    useEffect(() => {
        if (submissionId && submissionData?.status && ['pending', 'judging'].includes(submissionData.status)) {
            const interval = setInterval(() => {
                refetchSubmission();
            }, 1000);
            return () => clearInterval(interval);
        } else if (submissionData?.status && !['pending', 'judging'].includes(submissionData.status)) {
            setIsRunning(false);
        }
    }, [submissionId, submissionData?.status, refetchSubmission]);

    const handleSubmit = () => {
        submitMutation.mutate({
            problem_id: problemId,
            language,
            source_code: code
        });
    };

    const handleReset = () => {
        setCode(LANGUAGE_TEMPLATES[language] || LANGUAGE_TEMPLATES['C']);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'passed':
                return <CheckCircle2 size={16} className={styles.passedIcon} />;
            case 'wrong_answer':
            case 'runtime_error':
            case 'time_limit_exceeded':
                return <XCircle size={16} className={styles.failedIcon} />;
            default:
                return <AlertCircle size={16} className={styles.pendingIcon} />;
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'accepted': 'Đúng',
            'wrong_answer': 'Sai kết quả',
            'runtime_error': 'Lỗi runtime',
            'time_limit_exceeded': 'Quá thời gian',
            'compile_error': 'Lỗi biên dịch',
            'pending': 'Đang chờ',
            'judging': 'Đang chấm...'
        };
        return labels[status] || status;
    };

    // Calculate metrics for display
    const metrics = useMemo(() => {
        if (!submissionData || !problem) return null;
        return {
            timePercent: Math.min(100, (submissionData.execution_time / problem.time_limit) * 100),
            memoryPercent: Math.min(100, (submissionData.memory_used / (problem.memory_limit * 1024)) * 100),
        };
    }, [submissionData, problem]);

    // Left Panel Content (Problem Description)
    const LeftPanelContent = () => (
        <div className={styles.problemPanel}>
            {/* Tabs */}
            <div className={styles.tabBar}>
                <button
                    className={`${styles.tab} ${activeTab === 'description' ? styles.active : ''}`}
                    onClick={() => setActiveTab('description')}
                >
                    <FileText size={16} />
                    Mô tả
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'submissions' ? styles.active : ''}`}
                    onClick={() => setActiveTab('submissions')}
                >
                    <History size={16} />
                    Lịch sử
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'discussion' ? styles.active : ''}`}
                    onClick={() => setActiveTab('discussion')}
                >
                    <MessageSquare size={16} />
                    Thảo luận
                </button>
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {activeTab === 'description' && (
                    <>
                        {isProblemLoading ? (
                            <div className={styles.loading}>Đang tải bài tập...</div>
                        ) : (
                            <>
                                {/* Problem Header */}
                                <div className={styles.problemHeader}>
                                    <span className={styles.problemCode}>{problem?.problem_code}</span>
                                    <h1>{problem?.title}</h1>
                                    <div className={styles.meta}>
                                        <span className={`${styles.difficulty} ${styles[problem?.difficulty?.toLowerCase()]}`}>
                                            {problem?.difficulty}
                                        </span>
                                        <span className={styles.limits}>
                                            <Clock size={14} /> {problem?.time_limit}ms
                                        </span>
                                        <span className={styles.limits}>
                                            <Database size={14} /> {problem?.memory_limit}MB
                                        </span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className={styles.description}>
                                    {problem?.description}
                                </div>

                                {/* Sample Test Cases */}
                                {problem?.sample_test_cases?.length > 0 && (
                                    <div className={styles.samples}>
                                        <h3>Ví dụ</h3>
                                        {problem.sample_test_cases.map((tc: any, idx: number) => (
                                            <div key={idx} className={styles.sampleCase}>
                                                <div className={styles.sampleHeader}>Ví dụ {idx + 1}</div>
                                                <div className={styles.sampleContent}>
                                                    <div className={styles.inputOutput}>
                                                        <label>Đầu vào:</label>
                                                        <pre>{tc.input}</pre>
                                                    </div>
                                                    <div className={styles.inputOutput}>
                                                        <label>Đầu ra:</label>
                                                        <pre>{tc.expected_output}</pre>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Complexity Info */}
                                {(problem?.time_complexity || problem?.space_complexity) && (
                                    <div className={styles.complexity}>
                                        <h3>Độ phức tạp dự kiến</h3>
                                        <div className={styles.complexityGrid}>
                                            {problem.time_complexity && (
                                                <div className={styles.complexityItem}>
                                                    <span className={styles.label}>Thời gian:</span>
                                                    <code>{problem.time_complexity}</code>
                                                </div>
                                            )}
                                            {problem.space_complexity && (
                                                <div className={styles.complexityItem}>
                                                    <span className={styles.label}>Bộ nhớ:</span>
                                                    <code>{problem.space_complexity}</code>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {activeTab === 'submissions' && (
                    <div className={styles.submissionsTab}>
                        {isHistoryLoading ? (
                            <div className={styles.loading}>Đang tải lịch sử...</div>
                        ) : !submissionHistory || submissionHistory.length === 0 ? (
                            <div className={styles.emptyHistory}>
                                <div className={styles.emptyIcon}>📝</div>
                                <h4>Chưa có bài nộp</h4>
                                <p>Lịch sử nộp bài sẽ hiển thị tại đây sau khi bạn nộp bài.</p>
                            </div>
                        ) : (
                            <div className={styles.historyTable}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Trạng thái</th>
                                            <th>Điểm</th>
                                            <th>Thời gian</th>
                                            <th>Bộ nhớ</th>
                                            <th>Ngôn ngữ</th>
                                            <th>Thời điểm nộp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissionHistory.map((sub: any) => (
                                            <tr
                                                key={sub.submission_id}
                                                className={styles[sub.status]}
                                                onClick={() => setSubmissionId(sub.submission_id)}
                                            >
                                                <td>
                                                    <span className={`${styles.statusBadge} ${styles[sub.status]}`}>
                                                        {getStatusLabel(sub.status)}
                                                    </span>
                                                </td>
                                                <td className={styles.score}>{sub.score}/100</td>
                                                <td>{sub.execution_time ? `${sub.execution_time}ms` : '-'}</td>
                                                <td>{sub.memory_used ? `${(sub.memory_used / 1024).toFixed(1)}MB` : '-'}</td>
                                                <td>{sub.language}</td>
                                                <td className={styles.timestamp}>
                                                    {new Date(sub.created_at).toLocaleString('vi-VN')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'discussion' && (
                    <div className={styles.discussionTab}>
                        <p className={styles.placeholder}>Chức năng thảo luận sắp ra mắt...</p>
                    </div>
                )}
            </div>
        </div>
    );

    // Right Panel Content (Code Editor)
    const RightPanelContent = () => (
        <div className={styles.editorPanel}>
            {/* Editor Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    <div className={styles.languageSelect}>
                        <Code2 size={16} />
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            <option value="C">C</option>
                            <option value="C++">C++</option>
                        </select>
                        <ChevronDown size={14} />
                    </div>
                </div>
                <div className={styles.toolbarRight}>
                    <button
                        className={styles.iconBtn}
                        onClick={handleReset}
                        title="Đặt lại code"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button className={styles.iconBtn} title="Cài đặt">
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* Monaco Editor */}
            <div className={styles.editorContainer}>
                <CodeEditor
                    code={code}
                    language={language}
                    onChange={(value) => setCode(value || '')}
                />
            </div>

            {/* Action Buttons */}
            <div className={styles.actionBar}>
                <div className={styles.actionLeft}>
                    {/* Console toggle could go here */}
                </div>
                <div className={styles.actionRight}>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending || isRunning}
                    >
                        {isRunning ? (
                            <>
                                <div className={styles.spinnerSmall} />
                                Đang chấm...
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                Nộp bài
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Result Panel */}
            {submissionId && submissionData && (
                <div className={styles.resultPanel}>
                    <div className={styles.resultHeader}>
                        <div className={`${styles.statusBadge} ${styles[submissionData.status]}`}>
                            {getStatusLabel(submissionData.status)}
                        </div>
                        {submissionData.status !== 'pending' && submissionData.status !== 'judging' && (
                            <div className={styles.resultScore}>
                                Điểm: <strong>{submissionData.score}</strong>/100
                            </div>
                        )}
                    </div>

                    {submissionData.status !== 'pending' && submissionData.status !== 'judging' && (
                        <>
                            {/* Metrics */}
                            <div className={styles.metricsGrid}>
                                <div className={styles.metricCard}>
                                    <div className={styles.metricHeader}>
                                        <Clock size={14} />
                                        <span>Thời gian</span>
                                    </div>
                                    <div className={styles.metricValue}>
                                        {submissionData.execution_time} ms
                                    </div>
                                    <div className={styles.metricBar}>
                                        <div
                                            className={styles.metricFill}
                                            style={{ width: `${metrics?.timePercent || 0}%` }}
                                        />
                                    </div>
                                    <div className={styles.metricLimit}>
                                        Giới hạn: {problem?.time_limit}ms
                                    </div>
                                </div>
                                <div className={styles.metricCard}>
                                    <div className={styles.metricHeader}>
                                        <Database size={14} />
                                        <span>Bộ nhớ</span>
                                    </div>
                                    <div className={styles.metricValue}>
                                        {(submissionData.memory_used / 1024).toFixed(2)} MB
                                    </div>
                                    <div className={styles.metricBar}>
                                        <div
                                            className={`${styles.metricFill} ${styles.memory}`}
                                            style={{ width: `${metrics?.memoryPercent || 0}%` }}
                                        />
                                    </div>
                                    <div className={styles.metricLimit}>
                                        Giới hạn: {problem?.memory_limit}MB
                                    </div>
                                </div>
                            </div>

                            {/* Test Cases */}
                            <div className={styles.testCases}>
                                <div className={styles.testCasesHeader}>
                                    Test: {submissionData.test_cases_passed}/{submissionData.total_test_cases} đạt
                                </div>
                                <div className={styles.testCasesList}>
                                    {submissionData.test_results?.map((result: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className={`${styles.testCaseItem} ${styles[result.status]}`}
                                        >
                                            <div className={styles.testCaseHeader}>
                                                {getStatusIcon(result.status)}
                                                <span>Test {idx + 1}</span>
                                                <span className={styles.testCaseMeta}>
                                                    {result.execution_time}ms | {result.memory_used}KB
                                                </span>
                                            </div>
                                            {result.status !== 'passed' && result.error_message && (
                                                <div className={styles.testCaseError}>
                                                    <pre>{result.error_message}</pre>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <ResizablePanel
            leftPanel={<LeftPanelContent />}
            rightPanel={<RightPanelContent />}
            initialLeftWidth={38}
            minLeftWidth={25}
            maxLeftWidth={55}
        />
    );
}
