'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Code2, GraduationCap, LayoutDashboard, LogIn, Sparkles } from 'lucide-react';
import { authService } from '@/services/api';
import styles from './Landing.module.scss';

function dashboardHref(): string {
  const role = authService.getRole();
  if (role === 'student') return '/student/courses';
  if (role === 'lecturer') return '/lecturer';
  return '/admin';
}

export default function Landing() {
  const [hydrated, setHydrated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await authService.tryRestoreSession();
      if (!cancelled) {
        setLoggedIn(authService.isAuthenticated());
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dash = dashboardHref();

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.brand}>
          <Code2 size={22} strokeWidth={2.25} aria-hidden />
          ForceCodeX
        </div>
        <div className={styles.navActions}>
          {hydrated && loggedIn ? (
            <Link href={dash} className={styles.btnPrimary}>
              <LayoutDashboard size={16} aria-hidden />
              Vào nền tảng
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.linkMuted}>
                Đăng nhập
              </Link>
              <Link href="/login" className={styles.btnPrimary}>
                <LogIn size={16} aria-hidden />
                Bắt đầu
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-heading">
          <p className={styles.badge}>
            <Sparkles size={14} aria-hidden />
            Học tập &amp; chấm bài code
          </p>
          <h1 id="hero-heading" className={styles.title}>
            Luyện lập trình trên <span className={styles.gradient}>một nền tảng</span>
          </h1>
          <p className={styles.subtitle}>
            ForceCodeX kết nối sinh viên, giảng viên và quản trị: khóa học, bài tập, nộp bài và chấm
            tự động — gọn gàng trong một hệ thống.
          </p>
          <div className={styles.heroCtas}>
            {hydrated && loggedIn ? (
              <Link href={dash} className={styles.btnPrimary}>
                <LayoutDashboard size={18} aria-hidden />
                Vào bảng điều khiển
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.btnPrimary}>
                  <LogIn size={18} aria-hidden />
                  Đăng nhập
                </Link>
                <Link href="/login" className={styles.btnSecondary}>
                  Tài khoản được cấp từ trường
                </Link>
              </>
            )}
          </div>
        </section>

        <section className={styles.features} aria-labelledby="features-heading">
          <h2 id="features-heading" className={styles.featuresTitle}>
            Tính năng chính
          </h2>
          <div className={styles.grid}>
            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <BookOpen size={20} aria-hidden />
              </div>
              <h3 className={styles.cardTitle}>Khóa học &amp; lớp</h3>
              <p className={styles.cardText}>
                Tổ chức theo môn học và lớp hành chính; sinh viên theo dõi tiến độ và bài được giao.
              </p>
            </article>
            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <Code2 size={20} aria-hidden />
              </div>
              <h3 className={styles.cardTitle}>Bài tập &amp; chấm tự động</h3>
              <p className={styles.cardText}>
                Nộp code, chạy test case và nhận kết quả nhanh — phù hợp luyện thuật toán và thực hành.
              </p>
            </article>
            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <GraduationCap size={20} aria-hidden />
              </div>
              <h3 className={styles.cardTitle}>Đa vai trò</h3>
              <p className={styles.cardText}>
                Giao diện riêng cho sinh viên, giảng viên và quản trị viên theo quyền truy cập.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} ForceCodeX — Nền tảng học tập.</p>
      </footer>
    </div>
  );
}
