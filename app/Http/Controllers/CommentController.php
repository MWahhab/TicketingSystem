<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\User;
use App\Services\ImageService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $taskId   = $request->input('fid_post');
        $comments = Comment::where('fid_post', $taskId)
            ->with('creator')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($comments);
    }


    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, ImageService $imageService): JsonResponse
    {
        $validatedData = $request->validate([
            'content'  => 'required|string',
            'fid_post' => 'required|exists:posts,id',
        ]);
        $validatedData['fid_user'] = Auth::id();

        $validatedData['content'] = $imageService->handlePostImages($validatedData['content']);

        /**
         * @var Comment $comment
         */
        $comment = Comment::create($validatedData);

        $comment->load('creator');
        $comment->notify();

        return response()->json($comment);
    }

    /**
     * Display the specified resource.
     */
    public function show(Comment $comment)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Comment $comment)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Comment $comment, ImageService $imageService): JsonResponse
    {
        $validatedData = $request->validate([
            'content'  => 'required|string',
        ]);

        $validatedData['content'] = $imageService->handlePostImages($validatedData['content'], $comment->content);

        $comment->update($validatedData);
        $comment->notify();

        return response()->json($comment);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Comment $comment, ImageService $imageService): JsonResponse
    {
        if ($comment->fid_user !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $imageService->deleteAllImagesInDesc($comment->content);

        $comment->delete();

        return response()->json(['message' => 'Comment deleted successfully']);
    }
}
