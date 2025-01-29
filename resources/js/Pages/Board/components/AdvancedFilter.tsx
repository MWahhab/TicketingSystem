import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useBoardContext } from '../BoardContext';

export function AdvancedFilter() {
    const [searchTerm, setSearchTerm] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [authorId, setAuthorId] = useState('');
    const { filterTasks, assignees, tasks } = useBoardContext();

    const handleSearch = () => {
        filterTasks(searchTerm, assigneeId, authorId);
    };

    const authors = [...new Set(Object.values(tasks).map(task => task.post_author))];

    return (
        <div className="flex space-x-2">
            <Input
                type="search"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
            />
            <Select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-48 bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
            >
                <option value="">All Assignees</option>
                {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                        {assignee.name}
                    </option>
                ))}
            </Select>
            <Select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-48 bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
            >
                <option value="">All Authors</option>
                {authors.map((author) => (
                    <option key={author} value={author}>
                        {author}
                    </option>
                ))}
            </Select>
            <Button onClick={handleSearch} className="bg-zinc-700 text-white hover:bg-zinc-600">
                Filter
            </Button>
        </div>
    );
}

