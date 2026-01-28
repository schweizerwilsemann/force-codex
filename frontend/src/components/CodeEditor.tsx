'use client';

import dynamic from 'next/dynamic';
import styles from './CodeEditor.module.scss';

// Lazy load Monaco Editor to prevent Strict Mode issues
const Editor = dynamic(
    () => import('@monaco-editor/react'),
    {
        ssr: false,
        loading: () => (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <span>Đang tải trình soạn thảo...</span>
            </div>
        )
    }
);

interface CodeEditorProps {
    code: string;
    language: string;
    onChange: (value: string | undefined) => void;
}

export default function CodeEditor({ code, language, onChange }: CodeEditorProps) {
    return (
        <Editor
            height="100%"
            defaultLanguage="c"
            language={language === 'C++' ? 'cpp' : 'c'}
            theme="vs-dark"
            value={code}
            onChange={onChange}
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                padding: { top: 16 }
            }}
        />
    );
}
