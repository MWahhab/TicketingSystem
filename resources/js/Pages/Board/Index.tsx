import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {BoardLayout} from "@/Pages/Board/BoardLayout";

export default function Dashboard() {
    return (
        <AuthenticatedLayout
        >
            <Head title="Dashboard" />
            <BoardLayout></BoardLayout>
        </AuthenticatedLayout>

    );
}
