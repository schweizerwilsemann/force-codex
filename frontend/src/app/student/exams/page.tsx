'use client';

import styles from './exams.module.scss';

export default function StudentExamsPage() {
    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h1>My Exams & Practice</h1>
                    <p>Select a problem to solve.</p>
                </div>

                <div className={styles.grid}>
                    {/* Mock Data */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={styles.card}>
                            <h3>Introduction to Arrays {i}</h3>
                            <span className={styles.badge}>Easy</span>
                            <p>Learn the basics of array manipulation in C++.</p>
                            <button className={styles.button}>Start</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
