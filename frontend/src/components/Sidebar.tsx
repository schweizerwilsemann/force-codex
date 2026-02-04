'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authService, menuService } from '@/services/api';
import styles from './Sidebar.module.scss';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
    const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

    // Check if a menu or any of its children contains the active path
    const containsActivePath = useCallback((item: Menu): boolean => {
        if (pathname === item.path || (item.path !== '#' && pathname.startsWith(item.path + '/'))) {
            return true;
        }
        if (item.children && item.children.length > 0) {
            return item.children.some(child => containsActivePath(child));
        }
        return false;
    }, [pathname]);

    // Auto-expand menus containing active route
    useEffect(() => {
        const expandedIds = new Set<number>();
        const findAndExpand = (items: Menu[]) => {
            items.forEach(item => {
                if (item.children && item.children.length > 0 && containsActivePath(item)) {
                    expandedIds.add(item.menu_id);
                    findAndExpand(item.children);
                }
            });
        };
        findAndExpand(menus);
        setExpandedMenus(expandedIds);
    }, [menus, pathname, containsActivePath]);

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

    const toggleMenu = (menuId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpandedMenus(prev => {
            const newSet = new Set(prev);
            if (newSet.has(menuId)) {
                newSet.delete(menuId);
            } else {
                newSet.add(menuId);
            }
            return newSet;
        });
    };

    const renderMenuItem = (item: Menu) => {
        const isActive = pathname === item.path || (
            item.path !== '#' &&
            pathname.startsWith(item.path + '/') &&
            // Don't highlight root paths like /admin, /lecturer, /student when on subpages
            !['/admin', '/lecturer', '/student'].includes(item.path)
        );
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedMenus.has(item.menu_id);

        return (
            <li key={item.menu_id} className={styles.menuItemWrapper}>
                <div className={styles.menuItemRow}>
                    <Link
                        href={item.path || '#'}
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    >
                        {item.icon && <span className={styles.icon}><DynamicIcon name={item.icon} /></span>}
                        <span className={styles.label}>{item.title}</span>
                    </Link>
                    {hasChildren && (
                        <button
                            className={styles.menuToggle}
                            onClick={(e) => toggleMenu(item.menu_id, e)}
                            aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    )}
                </div>
                {hasChildren && (
                    <div className={`${styles.subMenuWrapper} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                        <ul className={styles.subMenu}>
                            {item.children.map(child => renderMenuItem(child))}
                        </ul>
                    </div>
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
