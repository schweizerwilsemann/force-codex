'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/api';

const PUBLIC_ROUTES = ['/', '/login'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const isPublic = PUBLIC_ROUTES.includes(pathname);

    const [authorized, setAuthorized] = useState(isPublic);
    const [checking, setChecking] = useState(!isPublic);

    useEffect(() => {
        let cancelled = false;

        if (isPublic) {
            startTransition(() => {
                setAuthorized(true);
                setChecking(false);
            });
            return () => {
                cancelled = true;
            };
        }

        (async () => {
            await authService.tryRestoreSession();
            if (cancelled) return;

            if (authService.isAuthenticated()) {
                const role = authService.getRole();

                if (role === 'student' && pathname.startsWith('/admin')) {
                    router.push('/student/exams');
                    setAuthorized(false);
                    setChecking(false);
                    return;
                }

                setAuthorized(true);
            } else {
                setAuthorized(false);
                router.push('/login');
            }
            setChecking(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [isPublic, pathname, router]);

    if (checking && !isPublic) {
        return null;
    }

    if (!authorized && !isPublic) {
        return null;
    }

    return <>{children}</>;
}
