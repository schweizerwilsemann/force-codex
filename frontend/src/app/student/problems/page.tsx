'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { codingService } from '@/services/coding';
import styles from './problems.module.scss';
import { useRouter } from 'next/navigation';
import { Search, Code2, CheckCircle2, Circle, MinusCircle, Filter, ChevronUp, ChevronDown } from 'lucide-react';

interface Problem {
    problem_id: string;
    problem_code: string;
    title: string;
    difficulty: string;
    acceptance_rate?: number;
    status?: 'solved' | 'attempted' | 'unsolved';
}

type SortField = 'problem_code' | 'title' | 'difficulty' | 'acceptance_rate';
type SortDirection = 'asc' | 'desc';

export default function ProblemsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('problem_code');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const { data: problems, isLoading, error } = useQuery({
        queryKey: ['problems'],
        queryFn: () => codingService.getProblems()
    });

    const filteredProblems = useMemo(() => {
        if (!problems) return [];

        let filtered = [...problems];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((p: Problem) =>
                p.title.toLowerCase().includes(query) ||
                p.problem_code.toLowerCase().includes(query)
            );
        }

        // Difficulty filter
        if (difficultyFilter) {
            filtered = filtered.filter((p: Problem) =>
                p.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
            );
        }

        // Sorting
        filtered.sort((a: Problem, b: Problem) => {
            let aVal: string | number = a[sortField] || '';
            let bVal: string | number = b[sortField] || '';

            if (sortField === 'difficulty') {
                const order = { easy: 1, medium: 2, hard: 3 };
                aVal = order[(String(aVal)).toLowerCase() as keyof typeof order] || 0;
                bVal = order[(String(bVal)).toLowerCase() as keyof typeof order] || 0;
            }

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [problems, searchQuery, difficultyFilter, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const toggleDifficultyFilter = (difficulty: string) => {
        if (difficultyFilter === difficulty) {
            setDifficultyFilter(null);
        } else {
            setDifficultyFilter(difficulty);
        }
    };

    const stats = useMemo(() => {
        if (!problems) return { total: 0, easy: 0, medium: 0, hard: 0 };
        return {
            total: problems.length,
            easy: problems.filter((p: Problem) => p.difficulty.toLowerCase() === 'easy').length,
            medium: problems.filter((p: Problem) => p.difficulty.toLowerCase() === 'medium').length,
            hard: problems.filter((p: Problem) => p.difficulty.toLowerCase() === 'hard').length,
        };
    }, [problems]);

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'solved':
                return <CheckCircle2 size={18} className={styles.solved} />;
            case 'attempted':
                return <MinusCircle size={18} className={styles.attempted} />;
            default:
                return <Circle size={18} className={styles.unsolved} />;
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <div className={styles.icon}>⚠️</div>
                    <h3>Lỗi tải bài tập</h3>
                    <p>Vui lòng tải lại trang.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h1>
                    <span className={styles.icon}>
                        <Code2 size={20} color="#fff" />
                    </span>
                    Danh Sách Bài Tập
                </h1>
                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <div className={styles.value}>{stats.total}</div>
                        <div className={styles.label}>Tổng</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.value} style={{ color: '#4ade80' }}>{stats.easy}</div>
                        <div className={styles.label}>Dễ</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.value} style={{ color: '#fbbf24' }}>{stats.medium}</div>
                        <div className={styles.label}>Trung Bình</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.value} style={{ color: '#f87171' }}>{stats.hard}</div>
                        <div className={styles.label}>Khó</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm bài tập..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    className={`${styles.filterBtn} ${difficultyFilter === 'easy' ? styles.active : ''}`}
                    onClick={() => toggleDifficultyFilter('easy')}
                >
                    Dễ
                </button>
                <button
                    className={`${styles.filterBtn} ${difficultyFilter === 'medium' ? styles.active : ''}`}
                    onClick={() => toggleDifficultyFilter('medium')}
                >
                    Trung Bình
                </button>
                <button
                    className={`${styles.filterBtn} ${difficultyFilter === 'hard' ? styles.active : ''}`}
                    onClick={() => toggleDifficultyFilter('hard')}
                >
                    Khó
                </button>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Đang tải bài tập...</p>
                    </div>
                ) : filteredProblems.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.icon}>📭</div>
                        <h3>Không tìm thấy bài tập</h3>
                        <p>Thử điều chỉnh tìm kiếm hoặc bộ lọc.</p>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>Trạng thái</th>
                                <th
                                    className={styles.sortable}
                                    onClick={() => handleSort('problem_code')}
                                >
                                    # <SortIcon field="problem_code" />
                                </th>
                                <th
                                    className={styles.sortable}
                                    onClick={() => handleSort('title')}
                                >
                                    Tiêu đề <SortIcon field="title" />
                                </th>
                                <th
                                    className={styles.sortable}
                                    onClick={() => handleSort('difficulty')}
                                >
                                    Độ khó <SortIcon field="difficulty" />
                                </th>
                                <th>Tỉ lệ AC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProblems.map((problem: Problem) => (
                                <tr
                                    key={problem.problem_id}
                                    onClick={() => router.push(`/student/problems/${problem.problem_id}`)}
                                >
                                    <td className={styles.statusCell}>
                                        {getStatusIcon(problem.status)}
                                    </td>
                                    <td style={{ color: 'rgba(255,255,255,0.5)', width: '80px' }}>
                                        {problem.problem_code}
                                    </td>
                                    <td className={styles.titleCell}>
                                        <span className={styles.title}>{problem.title}</span>
                                    </td>
                                    <td>
                                        <span className={`${styles.difficultyBadge} ${styles[problem.difficulty.toLowerCase()]}`}>
                                            {problem.difficulty}
                                        </span>
                                    </td>
                                    <td className={styles.acceptanceRate}>
                                        <span>{problem.acceptance_rate || Math.floor(Math.random() * 40 + 30)}%</span>
                                        <div className={styles.bar}>
                                            <div
                                                className={styles.fill}
                                                style={{ width: `${problem.acceptance_rate || Math.floor(Math.random() * 40 + 30)}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
