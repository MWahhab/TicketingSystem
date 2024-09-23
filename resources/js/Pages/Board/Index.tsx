// resources/js/Pages/Board/Index.tsx

import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BoardLayout } from "@/Pages/Board/BoardLayout";
import {TipTapTextArea} from "@/Pages/Board/components/TipTapTextArea";


const Index = () => {
    return (
        <AuthenticatedLayout>
            <BoardLayout />
        </AuthenticatedLayout>
    );
};

export default Index;
