'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDashboard() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/student/courses');
    }, [router]);

    return (
        <div style={{ padding: '2rem', color: '#9ca3af', textAlign: 'center' }}>
            Đang chuyển hướng...
        </div>
    );
}
