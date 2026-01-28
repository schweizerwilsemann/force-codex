'use client';

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import styles from './ResizablePanel.module.scss';

interface ResizablePanelProps {
    leftPanel: ReactNode;
    rightPanel: ReactNode;
    initialLeftWidth?: number; // percentage
    minLeftWidth?: number; // percentage
    maxLeftWidth?: number; // percentage
}

export default function ResizablePanel({
    leftPanel,
    rightPanel,
    initialLeftWidth = 40,
    minLeftWidth = 25,
    maxLeftWidth = 60
}: ResizablePanelProps) {
    const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

        if (newWidth >= minLeftWidth && newWidth <= maxLeftWidth) {
            setLeftWidth(newWidth);
        }
    }, [isDragging, minLeftWidth, maxLeftWidth]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div className={styles.container} ref={containerRef}>
            <div
                className={styles.leftPanel}
                style={{ width: `${leftWidth}%` }}
            >
                {leftPanel}
            </div>
            <div
                className={`${styles.resizer} ${isDragging ? styles.dragging : ''}`}
                onMouseDown={handleMouseDown}
            >
                <div className={styles.resizerLine} />
            </div>
            <div
                className={styles.rightPanel}
                style={{ width: `${100 - leftWidth}%` }}
            >
                {rightPanel}
            </div>
        </div>
    );
}
