'use client';

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { TipTapTextArea } from '@/Pages/Board/components/TipTapTextArea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { MessageSquareIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import axios from 'axios';

interface Comment {
    id: string;
    content: string;
    author: string;
    createdAt: string;
}

interface CommentsSectionProps {
    taskId: string;
    initialComments: Comment[];
}

const commentSchema = z.object({
    content: z.string().min(3, 'Comment is required and must be longer than 3 characters.'),
});

const CommentsSection: React.FC<CommentsSectionProps> = ({ taskId, initialComments }) => {
    const [comments, setComments] = useState<Comment[]>(initialComments || []);
    const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);

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
                    console.log('Response data:', response.data);

                    const newComment = response.data.comment || response.data;

                    if (newComment.content) {
                        setComments((prevComments) => [
                            ...prevComments,
                            {
                                id: newComment.id.toString(),
                                content: newComment.content.toString(),
                                author: newComment.creator.name.toString(),
                                createdAt: newComment.created_at.toString(),
                            },
                        ]);
                    }
                    commentForm.reset();
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    };

    return (
        <div className="mt-8">
            {/* Comments Toggle Button */}
            <Button
                onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
                variant="outline"
                className="w-full justify-between bg-zinc-700 text-white hover:bg-zinc-600"
            >
                <span>Comments ({comments.length})</span>
                {isCommentsExpanded ? (
                    <ChevronUpIcon className="h-4 w-4" />
                ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                )}
            </Button>
            {isCommentsExpanded && (
                <>
                    {/* Comments List */}
                    <div className="mt-4 space-y-4 max-h-60 overflow-y-auto">
                        {comments.map((comment) => (
                            <div key={comment.id} className="bg-zinc-700 p-3 rounded-md">
                                <div
                                    className="text-sm text-zinc-300"
                                    dangerouslySetInnerHTML={{ __html: comment.content }}
                                />
                                <div className="mt-2 text-xs text-zinc-400">
                                    {comment.author} - {new Date(comment.createdAt).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Comment Form */}
                    <Form {...commentForm}>
                        <form onSubmit={commentForm.handleSubmit(addComment)} className="space-y-4 mt-4">
                            <FormField
                                control={commentForm.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Add a comment</FormLabel>
                                        <FormMessage className="text-red-400" />
                                        <FormControl>
                                            <TipTapTextArea
                                                value={field.value}
                                                onChange={field.onChange}
                                                className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white min-h-[60px]"
                                                placeholder="Write your comment..."
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                className="bg-zinc-600 text-white hover:bg-zinc-500"
                                disabled={commentForm.formState.isSubmitting}
                            >
                                <MessageSquareIcon className="w-4 h-4 mr-2" />
                                {commentForm.formState.isSubmitting ? 'Adding...' : 'Add Comment'}
                            </Button>
                        </form>
                    </Form>
                </>
            )}
        </div>
    );
};

export default CommentsSection;
