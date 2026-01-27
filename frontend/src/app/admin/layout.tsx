'use client';

import Sidebar from '@/components/Sidebar';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex' }}>
            <Sidebar title="Administration" role="Admin" />
            <div style={{ flex: 1, marginLeft: '16rem', minHeight: '100vh', backgroundColor: '#111827' }}>
                {children}
            </div>
        </div>
    );
}
