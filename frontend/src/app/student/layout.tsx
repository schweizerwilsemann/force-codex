'use client';

import Sidebar from '@/components/Sidebar';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex' }}>
            <Sidebar title="Student Area" role="Student" />
            <div style={{ flex: 1, marginLeft: '16rem', minHeight: '100vh', backgroundColor: '#111827' }}>
                {children}
            </div>
        </div>
    );
}
