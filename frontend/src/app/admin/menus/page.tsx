'use client';

import { useEffect, useState } from 'react';
import { menuService } from '@/services/api';
import styles from './menus.module.scss';
import { Pencil, Trash2, Plus, X, RotateCcw } from 'lucide-react';

interface Menu {
    menu_id: number;
    title: string;
    path: string | null;
    icon: string | null;
    role_name: string;
    parent_id: number | null;
    order_index: number;
    is_deleted: boolean;
    children: Menu[];
}

export default function MenusPage() {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        path: '',
        icon: '',
        role_name: 'admin',
        parent_id: null as number | null,
        order_index: 0
    });

    useEffect(() => {
        fetchMenus();
    }, [roleFilter, includeDeleted]);

    const fetchMenus = async () => {
        try {
            setLoading(true);
            const data = await menuService.getAllMenus(roleFilter || undefined, includeDeleted);
            setMenus(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingMenu(null);
        setFormData({
            title: '',
            path: '',
            icon: '',
            role_name: 'admin',
            parent_id: null,
            order_index: 0
        });
        setShowModal(true);
    };

    const openEditModal = (menu: Menu) => {
        setEditingMenu(menu);
        setFormData({
            title: menu.title,
            path: menu.path || '',
            icon: menu.icon || '',
            role_name: menu.role_name,
            parent_id: menu.parent_id,
            order_index: menu.order_index
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const submitData = {
                ...formData,
                path: formData.path || undefined,
                icon: formData.icon || undefined,
                parent_id: formData.parent_id || undefined
            };

            if (editingMenu) {
                await menuService.updateMenu(editingMenu.menu_id, submitData);
            } else {
                await menuService.createMenu(submitData);
            }
            setShowModal(false);
            fetchMenus();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (menuId: number) => {
        try {
            await menuService.deleteMenu(menuId);
            setDeleteConfirm(null);
            fetchMenus();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRestore = async (menuId: number) => {
        try {
            await menuService.restoreMenu(menuId);
            fetchMenus();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const getParentOptions = () => {
        // Get all possible parent menus (excluding current menu if editing)
        return menus.filter(m =>
            m.parent_id === null &&
            !m.is_deleted &&
            (!editingMenu || m.menu_id !== editingMenu.menu_id)
        );
    };

    const getParentTitle = (parentId: number | null) => {
        if (!parentId) return '-';
        const parent = menus.find(m => m.menu_id === parentId);
        return parent?.title || '-';
    };

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'admin': return styles.admin;
            case 'lecturer': return styles.lecturer;
            case 'student': return styles.student;
            default: return '';
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h1>Quản Lý Menu</h1>
                    <button onClick={openCreateModal} className={styles.addButton}>
                        <Plus size={18} />
                        Thêm Menu
                    </button>
                </div>

                <div className={styles.filterBar}>
                    <div className={styles.filters}>
                        <div className={styles.filterGroup}>
                            <label>Lọc theo vai trò:</label>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                <option value="admin">Admin</option>
                                <option value="lecturer">Giảng viên</option>
                                <option value="student">Sinh viên</option>
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label className={styles.checkboxGroup}>
                                <input
                                    type="checkbox"
                                    checked={includeDeleted}
                                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                                />
                                <span>Hiện mục đã xóa</span>
                            </label>
                        </div>
                    </div>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {loading ? (
                    <div className={styles.loading}>Đang tải...</div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tiêu đề</th>
                                    <th>Đường dẫn</th>
                                    <th>Icon</th>
                                    <th>Vai trò</th>
                                    <th>Trạng thái</th>
                                    <th>Menu cha</th>
                                    <th>Thứ tự</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {menus.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className={styles.emptyRow}>
                                            Không có menu nào
                                        </td>
                                    </tr>
                                ) : (
                                    menus.map((menu) => (
                                        <tr key={menu.menu_id} className={menu.is_deleted ? styles.deletedRow : ''}>
                                            <td>{menu.menu_id}</td>
                                            <td className={styles.titleCell}>
                                                {menu.parent_id && <span className={styles.childIndicator}>↳</span>}
                                                {menu.title}
                                            </td>
                                            <td className={styles.pathCell}>{menu.path || '-'}</td>
                                            <td>{menu.icon || '-'}</td>
                                            <td>
                                                <span className={`${styles.roleBadge} ${getRoleBadgeClass(menu.role_name)}`}>
                                                    {menu.role_name}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${menu.is_deleted ? styles.deleted : styles.active}`}>
                                                    {menu.is_deleted ? 'Đã xóa' : 'Hoạt động'}
                                                </span>
                                            </td>
                                            <td>{getParentTitle(menu.parent_id)}</td>
                                            <td>{menu.order_index}</td>
                                            <td className={styles.actionsCell}>
                                                {!menu.is_deleted ? (
                                                    <>
                                                        <button
                                                            onClick={() => openEditModal(menu)}
                                                            className={styles.editBtn}
                                                            title="Sửa"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(menu.menu_id)}
                                                            className={styles.deleteBtn}
                                                            title="Xóa"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRestore(menu.menu_id)}
                                                        className={styles.restoreBtn}
                                                        title="Khôi phục"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Create/Edit Modal */}
                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <h2>{editingMenu ? 'Sửa Menu' : 'Thêm Menu Mới'}</h2>
                                <button onClick={() => setShowModal(false)} className={styles.closeBtn}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className={styles.formGroup}>
                                    <label>Tiêu đề *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="VD: Dashboard"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Đường dẫn</label>
                                    <input
                                        type="text"
                                        value={formData.path}
                                        onChange={e => setFormData({ ...formData, path: e.target.value })}
                                        placeholder="VD: /admin/dashboard"
                                    />
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Icon (Lucide)</label>
                                        <input
                                            type="text"
                                            value={formData.icon}
                                            onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                            placeholder="VD: Home, Users, Settings"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Thứ tự hiển thị</label>
                                        <input
                                            type="number"
                                            value={formData.order_index}
                                            onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Vai trò *</label>
                                        <select
                                            value={formData.role_name}
                                            onChange={e => setFormData({ ...formData, role_name: e.target.value })}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="lecturer">Giảng viên</option>
                                            <option value="student">Sinh viên</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Menu cha</label>
                                        <select
                                            value={formData.parent_id ?? ''}
                                            onChange={e => setFormData({
                                                ...formData,
                                                parent_id: e.target.value ? parseInt(e.target.value) : null
                                            })}
                                        >
                                            <option value="">Không có (Root)</option>
                                            {getParentOptions().map(m => (
                                                <option key={m.menu_id} value={m.menu_id}>
                                                    {m.title} ({m.role_name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className={styles.cancelBtn}
                                    >
                                        Hủy
                                    </button>
                                    <button type="submit" className={styles.submitBtn}>
                                        {editingMenu ? 'Cập nhật' : 'Tạo mới'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.confirmModal}>
                            <h3>Xác nhận xóa</h3>
                            <p>Bạn có chắc chắn muốn xóa menu này? Hành động này sẽ ẩn menu khỏi người dùng.</p>
                            <div className={styles.confirmActions}>
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className={styles.cancelBtn}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className={styles.dangerBtn}
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
