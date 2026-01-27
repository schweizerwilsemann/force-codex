"use client";

import QueryProvider from "./QueryProviders";


export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        // Sau này có thêm AuthProvider, ThemeProvider thì cứ bọc tiếp vào đây
        <QueryProvider>
            {children}
        </QueryProvider>
    );
}