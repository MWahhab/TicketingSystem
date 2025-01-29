import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useBoardContext } from '../BoardContext';
import { Filter } from 'lucide-react';

export function FancyFilter() {
    const [searchTerm, setSearchTerm] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [authorId, setAuthorId] = useState('');
    const { filterTasks, assignees, tasks } = useBoardContext();

    const handleSearch = () => {
        filterTasks(searchTerm, assigneeId, authorId);
    };

    const authors = [...new Set(Object.values(tasks).map(task => task.post_author))];

    return (
        <div className="flex items-center space-x-2">
            <Input
                type="search"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
            />
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="bg-zinc-700 text-white hover:bg-zinc-600">
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-zinc-800 border-zinc-700">
                    <div className="space-y-4">
                        <Select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
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
                            className="w-full bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
                        >
                            <option value="">All Authors</option>
                            {authors.map((author) => (
                                <option key={author} value={author}>
                                    {author}
                                </option>
                            ))}
                        </Select>
                        <Button onClick={handleSearch} className="w-full bg-zinc-600 text-white hover:bg-zinc-500">
                            Apply Filters
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

