<?php

namespace App\Http\Controllers;

use App\Enums\PrioritiesEnum;
use App\Models\BoardConfig;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BoardConfigController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $boardId = $request->input('board_id');
        $board   = BoardConfig::with('posts.assignee:id,name')
            ->when($boardId, function ($query) use ($boardId) {
                return $query->find($boardId);
            }, function ($query) {
                return $query->first();
            });

        $boardLinks = BoardConfig::select('id', 'title')->get();
        $boards     = BoardConfig::all('id', 'title', 'columns');
        $assignees  = User::all('id', 'name');

        return Inertia::render('Board/Index', [
            'columns'       => $board->columns ?? [],
            'posts'         => $board->posts ?? [],
            'boards'        => $boardLinks,
            'boardsColumns' => $boards,
            'assignees'     => $assignees,
            'priorities'    => PrioritiesEnum::cases(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title'     => 'required|string|min:2|max:255',
            'columns'   => ['required', 'array', 'min:1', function ($attribute, $value, $fail) {
                if (count($value) !== count(array_unique($value))) {
                    $fail('Column names must be unique.');
                }
            }],
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
