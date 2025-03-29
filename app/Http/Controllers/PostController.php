<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Services\ImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
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
     * @param Request $request
     * @param ImageService $imageService
     * @return Response
     */
    public function store(Request $request, ImageService $imageService): Response
    {
        $validated = $request->validate([
            'title'         => 'required|string|max:255',
            'desc'          => 'required|string',
            'priority'      => 'required|string|max:255',
            'column'        => 'required|string|max:255',
            'assignee_id'   => 'required|exists:users,id',
            'deadline'      => 'nullable|date',
            'fid_board'     => 'required|exists:board_configs,id',
            'migrated_from' => 'nullable|string'
        ]);

        $descWithImages = $imageService->handlePostImages($validated['desc']);

        $post = Post::create([
            'title'         => $validated['title'],
            'desc'          => $descWithImages,
            'priority'      => $validated['priority'],
            'column'        => $validated['column'],
            'assignee_id'   => $validated['assignee_id'],
            'deadline'      => $validated['deadline'],
            'fid_board'     => $validated['fid_board'],
            'fid_user'      => Auth::id(),
            'migrated_from' => $validated['migrated_from'] ?? null
        ]);

        $post->notify();

        request()->session()->flash('success', 'New post has been created!');

        return Inertia::location('/boards/?board_id=' . $validated['fid_board']);
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

    /**
     * @param Post    $post
     * @param Request $request
     *
     * @return Response
     */
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

    /**
     * @param Request      $request
     * @param Post         $post
     * @param ImageService $imageService
     * @return Response
     */
    public function update(Request $request, Post $post, ImageService $imageService): Response
    {
        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'desc'         => 'required|string',
            'priority'     => 'required|string|max:255',
            'column'       => 'required|string|max:255',
            'assignee_id'  => 'required|exists:users,id',
            'deadline'     => 'nullable|date',
            'fid_board'    => 'required|exists:board_configs,id'
        ]);

        $original = clone($post);

        $descWithImages = $imageService->handlePostImages($validated['desc'], $original->desc);

        $post->update(array_merge($validated, ['desc' => $descWithImages]));

        $post->setRawAttributes($original->getAttributes(), true);
        $post->notify();

        return Inertia::location('/boards/?board_id=' . $validated['fid_board']);
    }

    /**
     * Search for posts to link
     */
    public function search(Request $request): JsonResponse
    {
        $query = trim($request->input('query', ''));

        if (!$query) {
            return response()->json();
        }

        if (str_starts_with($query, '#')) {
            $query = str_replace('#', '', $query);
        }

        $posts = Post::query()
            ->where('title', 'like', "%{$query}%")
            ->when(is_numeric($query), fn($q) => $q->orWhere('id', $query))
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
        $post->delete();

        return Inertia::location('/boards/?board_id=' . $boardFid);
    }
}
