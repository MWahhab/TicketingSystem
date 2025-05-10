// resources/js/Pages/Board/Index.tsx

import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BoardLayout } from "@/Pages/Board/BoardLayout";

const Index = () => {
    return (
        <AuthenticatedLayout>
            <BoardLayout />
        </AuthenticatedLayout>
    );
};

export default Index;
