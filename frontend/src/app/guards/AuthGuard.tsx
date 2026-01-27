'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/api';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // Public routes that don't need auth
        const publicRoutes = ['/login'];

        // Check if current path is public
        const isPublic = publicRoutes.includes(pathname);

        if (isPublic) {
            setAuthorized(true);
            return;
        }

        // Check authentication
        if (authService.isAuthenticated()) {
            const role = authService.getRole();

            // RBAC: Prevent students from accessing admin routes
            if (role === 'student' && pathname.startsWith('/admin')) {
                router.push('/student/exams');
                setAuthorized(false);
                return;
            }

            setAuthorized(true);
        } else {
            setAuthorized(false);
            router.push('/login');
        }
    }, [pathname, router]);

    // Show nothing while checking (or a loading spinner)
    // to prevent flash of protected content
    if (!authorized && !['/login'].includes(pathname)) {
        return null;
    }

    return <>{children}</>;
}
