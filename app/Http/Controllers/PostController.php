<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Services\ImageService;
use App\Utils\PostFormatterUtil;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class PostController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created post in storage.
     *
     */
    public function store(Request $request, ImageService $imageService): Response
    {
        $validated = $this->validatePost($request);

        $validated['desc']      = $imageService->handlePostImages($validated['desc']);
        $validated['fid_user']  = Auth::id();
        $post                   = Post::create($validated);

        $post->notify();
        $post->load('assignee');

        return response()->json([
            'message' => 'New post has been created!',
            'post'    => $post,
        ], 201);
    }


    /**
     * Display the specified resource.
     */
    public function show(Post $post)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Post $post)
    {
    }

    public function move(Post $post, Request $request): Response
    {
        $request->validate([
            'column' => 'required|string',
        ]);

        $original = clone($post);

        $post->column = $request->input('column');
        $post->save();

        $post->setRawAttributes($original->getAttributes(), true);
        $post->notify();

        return response()->noContent();
    }

    public function update(Request $request, Post $post, ImageService $imageService): Response
    {
        $validated = $this->validatePost($request);
        $original  = clone($post);

        $descWithImages = $imageService->handlePostImages($validated['desc'], $original->desc);

        $post->update(array_merge($validated, ['desc' => $descWithImages]));

        $post->setRawAttributes($original->getAttributes(), true);
        $post->notify();
        $post->refresh();

        $post->load('assignee');

        return response()->json([
            'message' => 'Post has been updated!',
            'post'    => array_merge(
                $post->toArray(),
                [
                    'deadline_color' => PostFormatterUtil::getDeadlineColor($post->deadline),
                ]
            ),
        ]);
    }

    /**
     * Search for posts to link
     */
    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->input('query', ''));

        if ($query === '' || $query === '0') {
            return response()->json();
        }

        if (str_starts_with($query, '#')) {
            $query = str_replace('#', '', $query);
        }

        $posts = Post::query()
            ->where('title', 'like', "%{$query}%")
            ->when(is_numeric($query), fn ($q) => $q->orWhere('id', $query))
            ->limit(6)
            ->get(['id', 'title', 'fid_board']);

        return response()->json($posts);
    }


    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Post $post, ImageService $imageService): Response
    {
        $imageService->deleteAllImagesInDesc($post->desc);
        $boardFid = $post->fid_board;
        $postId   = $post->id;

        $post->delete();
        $post->notify();

        return response()->json([
            'message'         => 'Post has been deleted successfully!',
            'deleted_post_id' => $postId,
            'board_id'        => $boardFid,
        ]);
    }

    private function validatePost(Request $request): array
    {
        return $request->validate([
            'title'         => 'required|string|max:255',
            'desc'          => 'required|string',
            'priority'      => 'required|string|max:255',
            'column'        => 'required|string|max:255',
            'assignee_id'   => 'required|exists:users,id',
            'deadline'      => 'nullable|date',
            'fid_board'     => 'required|exists:board_configs,id',
            'migrated_from' => 'nullable|string',
        ]);
    }

    public function pin(Request $request, Post $post): Response
    {
        $request->validate([
            'pinned' => 'required|integer',
        ]);

        $original     = clone($post);
        $post->pinned = (int) $request->input('pinned');

        $post->save();

        $post->setRawAttributes($original->getAttributes(), true);

        return response()->noContent();
    }
}
