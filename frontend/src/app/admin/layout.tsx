'use client';

import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authService } from '@/services/api';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await authService.tryRestoreSession();
            if (cancelled) return;

            if (!authService.isAuthenticated()) {
                router.push('/login');
                return;
            }

            const role = authService.getRole();
            if (role !== 'admin') {
                if (role === 'lecturer') router.push('/lecturer');
                else if (role === 'student') router.push('/student/exams');
                else router.push('/login');
            } else {
                setAuthorized(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [router]);

    if (!authorized) {
        return <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Checking permissions...</div>;
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar title="Quản Trị Viên" role="Admin" />
            <div style={{ flex: 1, marginLeft: '16rem', minHeight: '100vh', backgroundColor: '#111827', overflowY: 'auto' }}>
                {children}
            </div>
        </div>
    );
}
