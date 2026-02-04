'use client';

import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authService } from '@/services/api';

export default function LecturerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push('/login');
            return;
        }

        const role = authService.getRole();
        if (role !== 'lecturer') {
            if (role === 'admin') router.push('/admin');
            else if (role === 'student') router.push('/student/exams');
            else router.push('/login');
        } else {
            setAuthorized(true);
        }
    }, [router]);

    if (!authorized) {
        return <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Checking permissions...</div>;
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar title="Giảng Viên" role="Lecturer" />
            <div style={{ flex: 1, marginLeft: '16rem', minHeight: '100vh', backgroundColor: '#111827', overflowY: 'auto' }}>
                {children}
            </div>
        </div>
    );
}
