<?php

namespace App\Http\Controllers;

use App\Http\Requests\PostWatcherRequest;
use App\Models\PostWatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostWatcherController extends Controller
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
     * Store a newly created resource in storage.
     */
    public function store(PostWatcherRequest $request): JsonResponse
    {
        PostWatcher::create($request->validated());

        return response()->json(['message' => 'Watcher added.']);
    }

    /**
     * Display the specified resource.
     */
    public function show(PostWatcher $postWatcher)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(PostWatcher $postWatcher)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PostWatcher $postWatcher)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(PostWatcherRequest $request): JsonResponse
    {
        $validated = $request->validated();

        PostWatcher::where('post_fid', $validated['post_fid'])
            ->where('user_fid', $validated['user_fid'])
            ->delete();

        return response()->json(['message' => 'Watcher removed.']);
    }
}
