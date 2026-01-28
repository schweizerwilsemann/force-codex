'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authService, menuService } from '@/services/api';
import styles from './Sidebar.module.scss';
import * as LucideIcons from 'lucide-react';

interface Menu {
    menu_id: number;
    title: string;
    path: string;
    icon: string | null;
    children: Menu[];
}

interface SidebarProps {
    title: string;
    role: string;
}

const DynamicIcon = ({ name }: { name: string | null }) => {
    if (!name) return null;
    // Cast to any because dynamically accessing keys
    const Icon = (LucideIcons as any)[name];
    if (!Icon) return null;
    return <Icon size={18} />;
};

export default function Sidebar({ title, role }: SidebarProps) {
    const pathname = usePathname();
    const [menus, setMenus] = useState<Menu[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMenus = async () => {
            try {
                const data = await menuService.getMyMenu();
                setMenus(data);
            } catch (err) {
                console.error("Failed to load menus", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMenus();
    }, []);

    const handleLogout = () => {
        authService.logout();
    };

    const renderMenuItem = (item: Menu) => {
        const isActive = pathname === item.path || (
            item.path !== '#' &&
            pathname.startsWith(item.path + '/') &&
            // Don't highlight root paths like /admin, /lecturer, /student when on subpages
            !['/admin', '/lecturer', '/student'].includes(item.path)
        );
        const hasChildren = item.children && item.children.length > 0;

        return (
            <li key={item.menu_id} className={styles.menuItemWrapper}>
                <Link
                    href={item.path || '#'}
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                    {item.icon && <span className={styles.icon}><DynamicIcon name={item.icon} /></span>}
                    <span className={styles.label}>{item.title}</span>
                </Link>
                {hasChildren && (
                    <ul className={styles.subMenu}>
                        {item.children.map(child => renderMenuItem(child))}
                    </ul>
                )}
            </li>
        );
    };

    if (loading) return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>Loading...</div>
        </aside>
    );

    // Get role class for styling
    const getRoleClass = () => {
        switch (role.toLowerCase()) {
            case 'admin': return styles.adminRole;
            case 'lecturer': return styles.lecturerRole;
            case 'student': return styles.studentRole;
            default: return '';
        }
    };

    return (
        <aside className={`${styles.sidebar} ${getRoleClass()}`}>
            <div className={styles.header}>
                <div className={styles.logo}>ForceCodeX</div>
                <div className={styles.roleBadge}>{role === 'Admin' ? 'Quản Trị' : role === 'Lecturer' ? 'Giảng Viên' : 'Sinh Viên'}</div>
            </div>

            <nav className={styles.nav}>
                <div className={styles.sectionTitle}>{title}</div>
                <ul className={styles.navList}>
                    {menus.map(renderMenuItem)}
                </ul>
            </nav>

            <div className={styles.footer}>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
}
