import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { useBoardContext } from '../BoardContext';

export function SimpleFilter() {
    const [searchTerm, setSearchTerm] = useState('');
    const { filterTasks } = useBoardContext();

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = e.target.value;
        setSearchTerm(newSearchTerm);
        filterTasks(newSearchTerm, '', '');
    };

    return (
        <Input
            type="search"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-64 bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
        />
    );
}

