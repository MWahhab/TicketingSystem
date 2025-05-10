"use client"

import React, { useState, useRef, useEffect, memo, useMemo, useCallback } from "react"
import { UserIcon, Pin, PinOff, CalendarIcon, MessageSquare, GitCommit, Link2, History, Edit3, CheckCircle, Paperclip, MoreHorizontal, ChevronDown, Dot, FileText, GitBranch } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useBoardContext, type Task } from "../BoardContext"
import 'highlight.js/styles/atom-one-dark.css'
import hljs from 'highlight.js'

const priorityColors: { [key in Task["priority"]]: { bg: string; ring: string } } = {
    high: { bg: "bg-red-500", ring: "ring-red-500/30" },
    medium: { bg: "bg-yellow-500", ring: "ring-yellow-500/30" },
    low: { bg: "bg-green-500", ring: "ring-green-500/30" },
}

const deadlineBgColors: { [key: string]: string } = {
    gray: "bg-zinc-700",
    yellow: "bg-yellow-600/30",
    red: "bg-red-600/30",
}

function getInitials(name: string) {
    const names = name.split(" ")
    return names.map((n) => n.charAt(0).toUpperCase()).join("")
}

const BranchIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-teal-400"
    >
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
        <path d="M6 9v12" />
    </svg>
);

export const TaskCard = memo(function TaskCard({ task }: { task: Task }) {
    const { openDialog, pinTask, setFocusedTaskId, focusedTaskId } = useBoardContext()
    const [showPopup, setShowPopup] = useState(false)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const popupTimerRef = useRef<NodeJS.Timeout | null>(null)
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const loadingStartTimerRef = useRef<NodeJS.Timeout | null>(null)
    const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const moreFiltersButtonRef = useRef<HTMLButtonElement>(null);

    const [selectedActivityFilter, setSelectedActivityFilter] = useState<string | null>(null);
    const [isMoreFiltersDropdownOpen, setIsMoreFiltersDropdownOpen] = useState(false);

    const MAX_VISIBLE_TABS = 3;

    const activityTypes = useMemo(() => {
        const typeSet = new Set<string>();
        const internalCommentFilterKey = "ActualComments";
        let hasActualComments = task.comments && task.comments.length > 0;

        if (hasActualComments) {
            typeSet.add(internalCommentFilterKey);
        }

        if (task.history) {
            Object.keys(task.history).forEach(type => {
                const typeLower = type.toLowerCase();
                if (type === 'linked_issue' && task.linked_issues && task.linked_issues.length > 0) {
                } else if (hasActualComments && typeLower === "comment") {
                } else {
                    typeSet.add(type);
                }
            });
        }
        
        const sortedTypes = Array.from(typeSet).sort((a, b) => {
            if (a === internalCommentFilterKey && b !== internalCommentFilterKey) return -1;
            if (b === internalCommentFilterKey && a !== internalCommentFilterKey) return 1;
            if (a === "BRANCH" && b !== "BRANCH") return -1;
            if (b === "BRANCH" && a !== "BRANCH") return 1;
            return a.localeCompare(b);
        });

        if (sortedTypes.length > 0) {
            return ["All", ...sortedTypes]; 
        }
        return []; 
    }, [task.history, task.comments, task.linked_issues]);

    const primaryTabs = useMemo(() => activityTypes.slice(0, MAX_VISIBLE_TABS), [activityTypes]);
    const overflowTabs = useMemo(() => activityTypes.slice(MAX_VISIBLE_TABS), [activityTypes]);

    useEffect(() => {
        if (activityTypes.includes("All")) {
            setSelectedActivityFilter("All");
        } else if (activityTypes.length > 0) {
            setSelectedActivityFilter(activityTypes[0]);
        } else {
            setSelectedActivityFilter(null);
        }
    }, [activityTypes]);

    const filteredActivity = useMemo(() => {
        if (!selectedActivityFilter) return [];
        let activities: Array<any> = [];
        const internalCommentFilterKey = "ActualComments";

        if (selectedActivityFilter === internalCommentFilterKey) {
            if (task.comments && task.comments.length > 0) {
                activities = task.comments.map(c => ({ 
                    ...c, 
                    type: "Comments", 
                    originalType: "Comments", 
                    createdAt: c.createdAt, 
                    id: `comment-${c.id}` 
                }));
            }
        } else if (selectedActivityFilter === "All") {
            if (task.comments && task.comments.length > 0) {
                activities = activities.concat(
                    task.comments.map(c => ({ 
                        ...c, 
                        type: "Comments", 
                        originalType: "Comments",
                        createdAt: c.createdAt, 
                        id: `comment-${c.id}` 
                    }))
                );
            }
            if (task.history) {
                Object.entries(task.history).forEach(([type, entries]) => {
                    const typeLower = type.toLowerCase();
                    if (type === 'linked_issue' && task.linked_issues && task.linked_issues.length > 0) {
                        return; 
                    } else if (task.comments && task.comments.length > 0 && typeLower === "comment") {
                        return;
                    }
                    activities = activities.concat(entries.map(e => ({...e, originalType: type })));
                });
            }
        } else if (task.history && task.history[selectedActivityFilter]) {
             Object.entries(task.history).forEach(([type, entries]) => {
                if (type === selectedActivityFilter) {
                     if (type === 'linked_issue' && task.linked_issues && task.linked_issues.length > 0) {
                        return; 
                    }
                    activities = activities.concat(entries.map(e => ({...e, originalType: type })));
                }
            });
        }
        
        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return activities.slice(0, 7); 

    }, [task.comments, task.history, selectedActivityFilter, task.linked_issues]);

    const clearTimersAndIntervals = () => {
        if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
        if (loadingStartTimerRef.current) clearTimeout(loadingStartTimerRef.current)
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
        popupTimerRef.current = null
        progressIntervalRef.current = null
        loadingStartTimerRef.current = null
        leaveTimeoutRef.current = null
    }

    const resetFocusState = useCallback(() => {
        clearTimersAndIntervals()
        setShowPopup(false)
        setLoadingProgress(0)
        if (focusedTaskId === task.id) {
             setFocusedTaskId(null)
        }
        setIsMoreFiltersDropdownOpen(false)
    }, [focusedTaskId, task.id, setFocusedTaskId])

    const startLoading = () => {
        clearTimersAndIntervals()
        setLoadingProgress(0)

        loadingStartTimerRef.current = setTimeout(() => {
            const intervalDuration = 20
            const remainingDuration = 1500
            const steps = remainingDuration / intervalDuration
            let currentStep = 0

            progressIntervalRef.current = setInterval(() => {
                currentStep++;
                const progress = Math.min(100, (currentStep / steps) * 100);
                setLoadingProgress(progress)

                if (progress >= 100) {
                    if (progressIntervalRef.current) {
                        clearInterval(progressIntervalRef.current)
                        progressIntervalRef.current = null
                    }
                }
            }, intervalDuration);
        }, 500);

        popupTimerRef.current = setTimeout(() => {
            if (loadingStartTimerRef.current) clearTimeout(loadingStartTimerRef.current)
            if (progressIntervalRef.current) {
                 clearInterval(progressIntervalRef.current)
                 progressIntervalRef.current = null
            }
            setLoadingProgress(100)

            setShowPopup(true)
            setFocusedTaskId(task.id)
        }, 2000)
    }

    const handleMouseEnterCard = () => {
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
        if (!showPopup && focusedTaskId !== task.id) {
           startLoading()
        }
    }

    const handleMouseLeaveCard = () => {
        if (isMoreFiltersDropdownOpen) return;
        if (!showPopup && loadingStartTimerRef.current) {
             resetFocusState()
             return;
         }
        if (!showPopup && progressIntervalRef.current) {
            resetFocusState()
            return;
        }
        
        leaveTimeoutRef.current = setTimeout(() => {
            if (!isMoreFiltersDropdownOpen) {
                resetFocusState()
            }
        }, 150)
    }

    const handleMouseEnterPopoverContent = () => {
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
        
        setTimeout(() => {
            document.querySelectorAll('.popover-content pre code').forEach((block) => {
                hljs.highlightElement(block as HTMLElement);
            });
        }, 0);
    };

    const handleMouseLeavePopoverContent = () => {
        if (isMoreFiltersDropdownOpen) return;

         leaveTimeoutRef.current = setTimeout(() => {
            if (!isMoreFiltersDropdownOpen) {
                resetFocusState()
            }
        }, 200)
    };

    useEffect(() => {
        return () => clearTimersAndIntervals()
    }, [])

    const handleStarClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        pinTask(task.id, task.pinned !== 1)
        resetFocusState()
    }
    
    const renderActivityFilterButton = (type: string, isDropdownItem: boolean = false) => {
        const internalCommentFilterKey = "ActualComments";
        const isActive = selectedActivityFilter === type;
        const baseClasses = "px-2.5 py-1 rounded-md text-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-800 outline-none";
        const activeClasses = "bg-blue-500/20 text-blue-300 font-medium";
        const inactiveClasses = "bg-zinc-700/60 hover:bg-zinc-600/80 text-zinc-300 hover:text-zinc-100";

        let displayType = type;
        if (type === internalCommentFilterKey) {
            displayType = "Comment";
        }

        let displayText = displayType.replace('_', ' ');
        displayText = displayText.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        const content = (
            <>
                {isActive && !isDropdownItem && <CheckCircle size={12} className="inline mr-1.5 mb-px flex-shrink-0" />}
                {displayText}
            </>
        );

        if (isDropdownItem) {
            return (
                <DropdownMenuItem 
                    key={type} 
                    onClick={() => {
                        setSelectedActivityFilter(type);
                    }}
                    className={`${isActive ? "bg-blue-500/10 text-blue-300" : "text-zinc-300 hover:!bg-zinc-700 hover:!text-zinc-100"} focus:!bg-zinc-700 focus:!text-zinc-100 cursor-pointer`}
                >
                    {content}
                </DropdownMenuItem>
            );
        }

        return (
            <button
                key={type}
                onClick={() => setSelectedActivityFilter(type)}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} flex items-center shrink-0`}
            >
                {content}
            </button>
        );
    };

    const MoreButtonContent = () => {
        const isActiveFilterInOverflow = selectedActivityFilter && overflowTabs.includes(selectedActivityFilter);
        return (
            <>
                {isActiveFilterInOverflow && <Dot size={20} className="absolute -top-1 -right-1 text-blue-400 animate-pulse" />}
                <MoreHorizontal size={14} className="mr-1 flex-shrink-0" /> 
                <span className="flex-shrink-0">More</span>
                <ChevronDown size={12} className="ml-0.5 flex-shrink-0" />
            </>
        );
    };

    return (
        <Popover open={showPopup} onOpenChange={(open) => {
            if (!open && showPopup && !isMoreFiltersDropdownOpen) {
                resetFocusState();
            }
        }}>
            <PopoverTrigger asChild>
                <Card
                    onClick={() => !showPopup && openDialog(task.id)}
                    onMouseEnter={handleMouseEnterCard}
                    onMouseLeave={handleMouseLeaveCard}
                    data-post-id={task.id}
                    className={`
                        relative
                        mb-4 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out
                        bg-zinc-800 hover:bg-zinc-700/50 border border-white/10 cursor-pointer rounded-lg overflow-hidden
                        ${task.pinned === 1 ? "border-l-blue-400 border-l-2 bg-zinc-800/50" : ""}
                        ${focusedTaskId === task.id ? "shadow-2xl z-10" : "z-0"}
                    `}
                >
                    <div 
                        className="absolute top-0 left-0 h-0.5 bg-blue-400 transition-transform duration-50 ease-linear" 
                        style={{
                            width: '100%',
                            transform: `scaleX(${loadingProgress / 100})`,
                            transformOrigin: 'left',
                            opacity: loadingProgress > 0 && loadingProgress < 100 ? 1 : 0,
                            willChange: 'transform'
                        }}
                    ></div>
                    
                    <CardHeader className="p-3 overflow-hidden pt-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <div
                                    className={`w-2.5 h-2.5 rounded-full ${priorityColors[task.priority].bg} ring-2 ring-offset-2 ring-offset-zinc-800 ${priorityColors[task.priority].ring}`}
                                />
                                <span className="text-xs font-medium text-zinc-400 uppercase ml-2">{task.priority} Priority</span>
                                {task.deadline && (
                                    <TooltipProvider delayDuration={100}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span
                                                    className={`flex items-center text-xs rounded-sm px-1.5 py-0.5 ${deadlineBgColors[task.deadline_color ?? 'gray']} ml-2 cursor-default`}
                                                >
                                                    <span className="text-zinc-200">
                                                        {new Date(task.deadline).toLocaleDateString()}
                                                    </span>
                                                </span>
                                            </TooltipTrigger>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <button
                                onClick={handleStarClick}
                                className={`group p-1 rounded-full transition-colors duration-200 hover:bg-white/10`}
                                aria-label={task.pinned === 1 ? "Unstar task" : "Star task"}
                            >
                                {task.pinned === 1 ? (
                                    <Pin
                                        className="w-4 h-4 stroke-blue-400 fill-blue-400 transition-colors duration-200"
                                    />
                                ) : (
                                    <PinOff className="w-4 h-4 stroke-zinc-500 group-hover:stroke-zinc-300 transition-colors duration-200" />
                                )}
                            </button>
                        </div>
                        <CardTitle className="text-base font-medium mt-2 text-zinc-100 truncate">
                            {task.id}. {task.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center text-zinc-300">
                                <UserIcon className="w-4 h-4 mr-2 text-zinc-400" />
                                <span>{task.assignee.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                {task.had_branch === 1 && (
                                    <div className="flex items-center" title="Branch created for this task">
                                        <BranchIcon />
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </PopoverTrigger>
            <PopoverContent
                side="right"
                align="start"
                sideOffset={10} 
                className="w-96 p-0 bg-zinc-850 border-zinc-700/90 text-zinc-200 shadow-2xl rounded-lg overflow-hidden transition-all duration-150 ease-out flex flex-col popover-content"
                onMouseEnter={handleMouseEnterPopoverContent}
                onMouseLeave={handleMouseLeavePopoverContent}
                onEscapeKeyDown={resetFocusState}
                onInteractOutside={(event) => {
                    const target = event.target as Node;
                    if (isMoreFiltersDropdownOpen || (moreFiltersButtonRef.current && moreFiltersButtonRef.current.contains(target))) {
                        event.preventDefault();
                        return;
                    }
                }}
            >
                <div className="p-3.5 overflow-y-auto scrollbar-hide flex-grow space-y-3.5">
                    <h4 className="font-semibold text-base leading-tight text-zinc-100 mb-1.5">{task.title}</h4>

                    {task.desc && (
                        <div className="pb-3 border-b border-zinc-700/60">
                            <div className="overflow-y-auto max-h-[9rem]">
                                <div 
                                    className="text-sm text-zinc-300 break-words prose prose-sm prose-invert \
                                               prose-headings:mt-1 prose-headings:mb-1 prose-headings:py-0 \
                                               prose-p:mt-0 prose-p:mb-1 prose-p:py-0 \
                                               prose-ul:mt-1 prose-ul:mb-1 prose-ul:py-0 prose-ul:pl-5 \
                                               prose-ol:mt-1 prose-ol:mb-1 prose-ol:py-0 prose-ol:pl-5 \
                                               prose-li:mt-0 prose-li:mb-1 prose-li:py-0 \
                                               prose-blockquote:my-1 prose-blockquote:py-0 \
                                               prose-figure:my-1 prose-figure:py-0 \
                                               pr-2"
                                    dangerouslySetInnerHTML={{ __html: task.desc }}
                                />
                            </div>
                        </div>
                    )}

                    {task.linked_issues && task.linked_issues.length > 0 && (
                        <div className="pb-3 border-b border-zinc-700/60">
                            <h5 className="text-xs font-medium text-zinc-400 uppercase flex items-center mb-1.5">
                                <Paperclip size={13} className="mr-1.5 text-zinc-500" /> Linked Issues
                            </h5>
                            <div className="space-y-1.5">
                                {task.linked_issues.map(link => {
                                    const boardId = task.fid_board;
                                    const href = `/boards?board_id=${boardId}&post_id=${link.related_post.id}`;
                                    return (
                                        <div key={link.id} className="text-xs flex items-center p-1.5 bg-zinc-800/70 rounded-md">
                                            <Link2 size={12} className="mr-2 text-blue-400 flex-shrink-0" />
                                            <span className="text-zinc-400 mr-1.5 capitalize flex-shrink-0 whitespace-nowrap">{link.type.replace('_',' ')}:</span>
                                            <div className="min-w-0 flex-1">
                                                <a 
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-zinc-200 truncate hover:underline cursor-pointer block"
                                                >
                                                    #{link.related_post.id} {link.related_post.title}
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {(activityTypes.length > 0) && (
                        <div className="space-y-2">
                             <div className="flex items-center justify-between mb-1.5">
                                <h5 className="text-xs font-medium text-zinc-400 uppercase flex items-center shrink-0">
                                    <History size={13} className="mr-1.5 text-zinc-500" /> Activity
                                </h5>
                                <div className="flex items-center space-x-1.5 ml-2">
                                    {primaryTabs.map(type => renderActivityFilterButton(type))}
                                    {overflowTabs.length === 1 && overflowTabs[0] === 'post' ? (
                                        renderActivityFilterButton('post')
                                    ) : overflowTabs.length > 0 ? (
                                        <DropdownMenu onOpenChange={setIsMoreFiltersDropdownOpen}>
                                            <DropdownMenuTrigger asChild>
                                                <button 
                                                    ref={moreFiltersButtonRef} 
                                                    className={`relative px-2 py-1 rounded-md text-xs flex items-center focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-800 outline-none transition-colors duration-150 ${selectedActivityFilter && overflowTabs.includes(selectedActivityFilter) ? "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25" : "bg-zinc-700/60 hover:bg-zinc-600/80 text-zinc-300 hover:text-zinc-100"}`}>
                                                    <MoreButtonContent />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent 
                                                align="end" 
                                                className="bg-zinc-800 border-zinc-700 text-zinc-200"
                                                onCloseAutoFocus={(e) => e.preventDefault()}
                                            >
                                                {overflowTabs.map(type => renderActivityFilterButton(type, true))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : null}
                                </div>
                            </div>

                            {filteredActivity.length > 0 ? (
                                <div className="overflow-y-auto max-h-[12rem]">
                                    <div className="space-y-1.5 pr-1">
                                        {filteredActivity.map(entry => {
                                            const activityType = entry.type === "Comments" ? "Comments" : entry.originalType;
                                            const contentLowerCase = typeof entry.content === 'string' ? entry.content.toLowerCase() : '';
                                            const isDescChange = activityType.toUpperCase() === 'POST' && 
                                                                 (contentLowerCase.startsWith("desc changed from") || 
                                                                  contentLowerCase.includes("description changed") || 
                                                                  contentLowerCase.includes("desc changed"));
                                            let baseContent = entry.content || activityType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l:string) => l.toUpperCase());
                                            if (typeof baseContent === 'string') {
                                                let markerIndex = baseContent.lastIndexOf(" on post #"); 
                                                if (markerIndex !== -1) {
                                                    baseContent = baseContent.substring(0, markerIndex).trim();
                                                } else {
                                                    markerIndex = baseContent.lastIndexOf(" on #"); 
                                                    if (markerIndex !== -1) {
                                                        baseContent = baseContent.substring(0, markerIndex).trim();
                                                    } else {
                                                        markerIndex = baseContent.lastIndexOf(" on this post"); 
                                                        if (markerIndex !== -1) {
                                                            baseContent = baseContent.substring(0, markerIndex).trim();
                                                        }
                                                    }
                                                }
                                            }
                                            if (baseContent === "" && !isDescChange) {
                                                baseContent = activityType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l:string) => l.toUpperCase());
                                            }
                                            if (typeof baseContent === 'string') {
                                                baseContent = baseContent.replace(/\s00:00:00/g, '').trim();
                                            }
                                            const displayContent = isDescChange ? "Description updated" : baseContent;
                                            const renderAsHTML = (activityType === "Comments") || (typeof displayContent === 'string' && displayContent.match(/<([A-Za-z][A-Za-z0-9]*)\b[^>]*>(.*?)<\/\1>/));
                                            return (
                                                <div key={entry.id} className="text-xs flex items-start p-1.5 bg-zinc-800/70 rounded-md">
                                                    {activityType === "Comments" && <MessageSquare size={12} className="mr-2 mt-0.5 text-sky-400 flex-shrink-0" />}
                                                    {activityType.toUpperCase() === 'BRANCH' && <GitBranch size={12} className="mr-2 mt-0.5 text-teal-400 flex-shrink-0" />}
                                                    {activityType.toUpperCase() === 'LINKED_ISSUE' && !(task.linked_issues && task.linked_issues.length > 0) && <Link2 size={12} className="mr-2 mt-0.5 text-blue-400 flex-shrink-0" />}
                                                    {activityType.toUpperCase() === 'POST' && !isDescChange && <FileText size={12} className="mr-2 mt-0.5 text-purple-400 flex-shrink-0" />}
                                                    {isDescChange && <Edit3 size={12} className="mr-2 mt-0.5 text-orange-400 flex-shrink-0" />}
                                                    <div className="flex-grow min-w-0">
                                                        {renderAsHTML ? (
                                                            <div 
                                                                className="text-zinc-300 break-words"
                                                                dangerouslySetInnerHTML={{ __html: displayContent as string }}
                                                            />
                                                        ) : (
                                                            <p className="text-zinc-300 break-words">{displayContent}</p>
                                                        )}
                                                        {entry.author && entry.type === "Comments" && <p className="text-zinc-500 mt-0.5 text-[10px]">{entry.author} - {new Date(entry.createdAt).toLocaleDateString()}</p>}
                                                        {entry.type !== "Comments" && entry.createdAt && (
                                                            <p className="text-zinc-500 mt-0.5 text-[10px]">
                                                                {entry.createdByName ? `${entry.createdByName} - ` : ''}
                                                                {new Date(entry.createdAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-500 italic pl-1.5">No activity for this filter.</p>
                            )}
                        </div>
                    )}

                    {!(task.linked_issues && task.linked_issues.length > 0) && !(activityTypes.length > 0) && !task.desc && (
                         <p className="text-sm text-zinc-500 italic p-4">No description, links, or activity for this task.</p>
                    )}
                </div>
                <div className="bg-zinc-900/80 px-3.5 py-2 border-t border-zinc-700/60 mt-auto shrink-0 backdrop-blur-sm">
                </div>
                <style jsx global>{`
                    .popover-content pre {
                        background-color: #282c34;
                        color: #abb2bf;
                        font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
                        padding: 0.75rem 1rem;
                        margin: 0.5rem 0;
                        border-radius: 0.3rem;
                        overflow-x: auto;
                    }
                    
                    .popover-content pre code {
                        color: inherit;
                        padding: 0;
                        background: none;
                        font-size: 0.85rem;
                    }
                `}</style>
            </PopoverContent>
        </Popover>
    )
});
