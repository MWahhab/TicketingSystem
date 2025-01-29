import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useBoardContext } from '../BoardContext';
import { Filter, X } from 'lucide-react';

export function UltraFancyFilter() {
    const [searchTerm, setSearchTerm] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [authorId, setAuthorId] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const { filterTasks, assignees, tasks, priorities } = useBoardContext();

    const handleSearch = () => {
        filterTasks(searchTerm, assigneeId, authorId);
        updateActiveFilters();
    };

    const updateActiveFilters = () => {
        const filters = [];
        if (searchTerm) filters.push(`Search: ${searchTerm}`);
        if (assigneeId) filters.push(`Assignee: ${assignees.find(a => a.id === assigneeId)?.name}`);
        if (authorId) filters.push(`Author: ${authorId}`);
        if (priorityFilter.length > 0) filters.push(`Priorities: ${priorityFilter.join(', ')}`);
        setActiveFilters(filters);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setAssigneeId('');
        setAuthorId('');
        setPriorityFilter([]);
        filterTasks('', '', '');
        setActiveFilters([]);
    };

    const authors = [...new Set(Object.values(tasks).map(task => task.post_author))];

    useEffect(() => {
        updateActiveFilters();
    }, [searchTerm, assigneeId, authorId, priorityFilter]);

    return (
        <div className="space-y-2">
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
                            <div className="space-y-2">
                                <Label className="text-white">Priority</Label>
                                {priorities.map((priority) => (
                                    <div key={priority} className="flex items-center">
                                        <Checkbox
                                            id={`priority-${priority}`}
                                            checked={priorityFilter.includes(priority)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setPriorityFilter([...priorityFilter, priority]);
                                                } else {
                                                    setPriorityFilter(priorityFilter.filter(p => p !== priority));
                                                }
                                            }}
                                            className="border-zinc-600"
                                        />
                                        <Label
                                            htmlFor={`priority-${priority}`}
                                            className="ml-2 text-white"
                                        >
                                            {priority}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={handleSearch} className="w-full bg-zinc-600 text-white hover:bg-zinc-500">
                                Apply Filters
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter, index) => (
                        <div key={index} className="flex items-center bg-zinc-700 text-white px-2 py-1 rounded">
                            <span>{filter}</span>
                            <X
                                className="ml-2 h-4 w-4 cursor-pointer"
                                onClick={() => {
                                    const [type] = filter.split(':');
                                    if (type === 'Search') setSearchTerm('');
                                    if (type === 'Assignee') setAssigneeId('');
                                    if (type === 'Author') setAuthorId('');
                                    if (type === 'Priorities') setPriorityFilter([]);
                                    handleSearch();
                                }}
                            />
                        </div>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-zinc-400 hover:text-white"
                    >
                        Clear All
                    </Button>
                </div>
            )}
        </div>
    );
}

