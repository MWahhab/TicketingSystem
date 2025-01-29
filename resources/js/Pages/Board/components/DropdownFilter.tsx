import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBoardContext } from '../BoardContext';

export function DropdownFilter() {
    const [searchTerm, setSearchTerm] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const { filterTasks, assignees } = useBoardContext();

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = e.target.value;
        setSearchTerm(newSearchTerm);
        filterTasks(newSearchTerm, assigneeId, '');
    };

    const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newAssigneeId = e.target.value;
        setAssigneeId(newAssigneeId);
        filterTasks(searchTerm, newAssigneeId, '');
    };

    return (
        <div className="flex space-x-2">
            <Input
                type="search"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-64 bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
            />
            <Select
                value={assigneeId}
                onChange={handleAssigneeChange}
                className="w-48 bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
            >
                <option value="">All Assignees</option>
                {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                        {assignee.name}
                    </option>
                ))}
            </Select>
        </div>
    );
}

