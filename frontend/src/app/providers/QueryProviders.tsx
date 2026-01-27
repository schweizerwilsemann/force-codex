"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    // Tạo client mới cho mỗi phiên (tránh leak data trên server)
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // Dữ liệu "tươi" trong 1 phút
                retry: 1, // Thử lại 1 lần nếu lỗi
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}