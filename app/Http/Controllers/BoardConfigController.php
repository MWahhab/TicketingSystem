<?php

namespace App\Http\Controllers;

use App\Models\BoardConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BoardConfigController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $boards = BoardConfig::with('posts.assignee')->first();

        return Inertia::render(
            'Board/Index',
            [
                'columns' => $boards?->columns ?? [],
                'posts'   => $boards?->posts   ?? [],
            ]
        );
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
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'     => 'required|string|min:2|max:255',
            'columns'   => 'required|array|min:1',
            'columns.*' => 'string|min:1|max:255',
        ]);

        BoardConfig::create([
            'title'    => $validated['title'],
            'columns'  => $validated['columns'],
            'fid_user' => Auth::id()
        ]);

        return redirect()->back()->with('success', 'Board created successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(BoardConfig $boardConfig)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(BoardConfig $boardConfig)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, BoardConfig $boardConfig)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(BoardConfig $boardConfig)
    {
        //
    }
}
