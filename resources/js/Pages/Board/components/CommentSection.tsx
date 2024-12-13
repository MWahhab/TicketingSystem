'use client';

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { TipTapTextArea } from '@/Pages/Board/components/TipTapTextArea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { MessageSquareIcon, SendIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon, MoreVerticalIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import axios from 'axios';

<style jsx>{`
  .hide-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`}</style>

interface Comment {
    id: string;
    content: string;
    author: string;
    authorId: string;
    createdAt: string;
}

interface CommentsSectionProps {
    taskId: string;
    currentUserId: string;
    assignees: []
}

const commentSchema = z.object({
    content: z.string().min(3, 'Comment is required and must be longer than 3 characters.'),
});

const CommentsSection: React.FC<CommentsSectionProps> = ({ taskId, currentUserId, assignees }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [visibleComments, setVisibleComments] = useState<Comment[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [showAllComments, setShowAllComments] = useState(false);
    const commentsPerPage = 4;

    useEffect(() => {
        setComments([]);
        setVisibleComments([]);
        setPage(1);
        setHasMore(false);
        setShowAllComments(false);
        loadComments();
    }, [taskId, page, commentsPerPage]);

    const loadComments = () => {
        axios
            .get(`/comments?fid_post=${taskId}`)
            .then((response) => {
                const fetchedComments = response.data.map((comment: any) => ({
                    id: comment.id.toString(),
                    content: comment.content.toString(),
                    author: comment.creator.name.toString(),
                    authorId: comment.creator.id.toString(),
                    createdAt: comment.created_at.toString(),
                }));
                setComments(fetchedComments);
                setVisibleComments(fetchedComments.slice(0, commentsPerPage));
                setHasMore(fetchedComments.length > commentsPerPage);
            })
            .catch((error) => {
                console.error(error);
            });
    };

    const commentForm = useForm({
        resolver: zodResolver(commentSchema),
        defaultValues: {
            content: '',
        },
    });

    const addComment = (values: { content: string }) => {
        const { content } = values;
        if (content.trim()) {
            const data = {
                content: content,
                fid_post: taskId,
            };

            axios
                .post('/comments', data)
                .then((response) => {
                    const newComment = response.data;

                    if (newComment.content) {
                        const formattedNewComment = {
                            id: newComment.id.toString(),
                            content: newComment.content.toString(),
                            author: newComment.creator.name.toString(),
                            authorId: newComment.creator.id.toString(),
                            createdAt: newComment.created_at.toString(),
                        };
                        setComments(prevComments => [formattedNewComment, ...prevComments]);
                        setVisibleComments(prevVisible =>
                            showAllComments
                                ? [formattedNewComment, ...prevVisible]
                                : [formattedNewComment, ...prevVisible.slice(0, commentsPerPage - 1)]
                        );
                    }
                    commentForm.reset();
                    setIsExpanded(false);
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    };

    const deleteComment = (commentId: string) => {
        axios
            .delete(`/comments/${commentId}`)
            .then(() => {
                setComments((prevComments) => prevComments.filter((comment) => comment.id !== commentId));
                setVisibleComments((prevVisible) => prevVisible.filter((comment) => comment.id !== commentId));
            })
            .catch((error) => {
                if (error.response && error.response.status === 403) {
                    alert('You are not authorized to delete this comment.');
                } else {
                    console.error(error);
                }
            });
    };

    const editComment = (commentId: string) => {
        setEditingCommentId(commentId);
        const commentToEdit = comments.find(comment => comment.id === commentId);
        if (commentToEdit) {
            commentForm.setValue('content', commentToEdit.content);
        }
    };

    const updateComment = (values: { content: string }) => {
        if (editingCommentId) {
            const { content } = values;
            if (content.trim()) {
                axios.put(`/comments/${editingCommentId}`, { content })
                    .then((response) => {
                        const updatedComment = response.data;
                        const updateCommentList = (comments: Comment[]) =>
                            comments.map(comment =>
                                comment.id === editingCommentId
                                    ? { ...comment, content: updatedComment.content }
                                    : comment
                            );
                        setComments(updateCommentList);
                        setVisibleComments(updateCommentList);
                        setEditingCommentId(null);
                        commentForm.reset();
                    })
                    .catch((error) => {
                        console.error(error);
                        if (error.response && error.response.status === 403) {
                            alert('You are not authorized to edit this comment.');
                        }
                    });
            }
        }
    };

    const handleLoadMore = () => {
        setPage(prevPage => prevPage + 1);
        loadComments();
    };

    const handleShowAllComments = () => {
        setVisibleComments(comments);
        setShowAllComments(true);
        setHasMore(false);
    };

    return (
        <Card className="mt-8 bg-zinc-700 border-zinc-600">
            <CardHeader
                className="pb-3 cursor-pointer select-none"
                onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
            >
                <div className="flex items-center justify-between text-zinc-100">
                    <div className="flex items-center gap-2 font-semibold">
                        <MessageSquareIcon className="h-5 w-5" />
                        <span>Comments</span>
                        <div className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                            {comments.length}
                        </div>
                    </div>
                    {isCommentsExpanded ? (
                        <ChevronUpIcon className="h-5 w-5" />
                    ) : (
                        <ChevronDownIcon className="h-5 w-5" />
                    )}
                </div>
            </CardHeader>
            {isCommentsExpanded && (
                <CardContent className="space-y-3">
                    <Form {...commentForm}>
                        <form onSubmit={commentForm.handleSubmit(editingCommentId ? updateComment : addComment)}>
                            <FormField
                                control={commentForm.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="space-y-2">
                                            <FormControl>
                                                {isExpanded ? (
                                                    <TipTapTextArea
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        assignees={assignees}
                                                        className="min-h-[100px] bg-zinc-800 text-zinc-300 border-zinc-700 resize-none focus:border-zinc-600 focus:ring-zinc-600"
                                                        placeholder="Write your comment..."
                                                    />
                                                ) : (
                                                    <div
                                                        className="flex items-center bg-zinc-800 border border-zinc-700 rounded-md p-2 cursor-text hover:bg-zinc-800/80 hover:border-zinc-600 transition-colors"
                                                        onClick={() => setIsExpanded(true)}
                                                    >
                                                        <PlusIcon className="h-5 w-5 text-zinc-500 mr-2" />
                                                        <span className="text-zinc-500">Add a comment...</span>
                                                    </div>
                                                )}
                                            </FormControl>
                                            {isExpanded && (
                                                <div className="flex justify-between items-center">
                                                    <FormMessage className="text-red-400" />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                setIsExpanded(false);
                                                                commentForm.reset();
                                                            }}
                                                            className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            size="sm"
                                                            className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                                                            disabled={commentForm.formState.isSubmitting}
                                                        >
                                                            <SendIcon className="h-4 w-4 mr-2" />
                                                            {commentForm.formState.isSubmitting ? 'Sending...' : 'Send'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>

                    <Separator className="bg-zinc-700" />

                    <ScrollArea className="pr-4 -mr-4 max-h-[440px] overflow-y-auto hide-scrollbar">
                        <div className="space-y-4">
                            {visibleComments.map((comment) => (
                                <div key={comment.id} className="flex items-start space-x-3">
                                    <Avatar className="h-8 w-8 bg-zinc-800 text-zinc-800">
                                        <AvatarFallback>
                                            {comment.author.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col space-y-1 flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-bold text-zinc-100">{comment.author}</span>
                                                <span className="text-xs text-zinc-500">
                                                    {new Date(comment.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            {comment.authorId == currentUserId && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVerticalIcon className="h-4 w-4 text-zinc-300" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="bg-zinc-800 text-zinc-300 border-zinc-700"
                                                    >
                                                        <DropdownMenuItem onClick={() => editComment(comment.id)}>
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => deleteComment(comment.id)}>
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                        {editingCommentId === comment.id ? (
                                            <Form {...commentForm}>
                                                <form onSubmit={commentForm.handleSubmit(updateComment)}>
                                                    <FormField
                                                        control={commentForm.control}
                                                        name="content"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <TipTapTextArea
                                                                        value={field.value}
                                                                        onChange={field.onChange}
                                                                        assignees={assignees}
                                                                        className="min-h-[100px] bg-zinc-800 text-zinc-300 border-zinc-700 resize-none focus:border-zinc-600 focus:ring-zinc-600"
                                                                    />
                                                                </FormControl>
                                                                <div className="flex justify-between items-center mt-2">
                                                                    <FormMessage className="text-red-400" />
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="secondary"
                                                                            onClick={() => {
                                                                                setEditingCommentId(null);
                                                                                commentForm.reset();
                                                                            }}
                                                                            className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            type="submit"
                                                                            size="sm"
                                                                            className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                                                                            disabled={commentForm.formState.isSubmitting}
                                                                        >
                                                                            {commentForm.formState.isSubmitting ? 'Updating...' : 'Update'}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </form>
                                            </Form>
                                        ) : (
                                            <div className="rounded-lg bg-zinc-800 p-3 text-sm text-zinc-300">
                                                <div
                                                    className="prose prose-sm prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: comment.content }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {!showAllComments && hasMore && (
                                <div className="mt-4 text-center">
                                    <Button
                                        onClick={handleShowAllComments}
                                        variant="secondary"
                                        size="sm"
                                        className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                                    >
                                        Show All Comments
                                    </Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            )}
        </Card>
    );
};

export default CommentsSection;

