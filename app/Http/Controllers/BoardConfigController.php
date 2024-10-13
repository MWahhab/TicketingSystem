<?php

namespace App\Http\Controllers;

use App\Enums\PrioritiesEnum;
use App\Models\BoardConfig;
use App\Models\User;
use App\Services\BoardService;
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
    public function index(Request $request, BoardService $boardService): Response
    {
        $boardId    = $request->input('board_id');
        $boardData  = $boardService->getBoardData($boardId);
        $boardLinks = BoardConfig::select('id', 'title')->get();
        $boards     = BoardConfig::all('id', 'title', 'columns');
        $assignees  = User::all('id', 'name');

        return Inertia::render('Board/Index', [
            'columns'       => $boardData['columns'],
            'posts'         => $boardData['posts'],
            'boards'        => $boardLinks,
            'boardsColumns' => $boards,
            'assignees'     => $assignees,
            'priorities'    => PrioritiesEnum::cases(),
            'boardTitle'    => $boardData['boardTitle'],
            'boardId'       => $boardData['id']
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
     * @param  Request          $request
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
    public function update(Request $request, BoardConfig $board): RedirectResponse
    {
        $validatedReq = $request->validate([
            'title'     => 'required|string|min:2|max:255',
            'columns'   => ['required', 'array', 'min:1', function ($attribute, $value, $fail) {
                if (count($value) !== count(array_unique($value))) {
                    $fail('Column names must be unique.');
                }
            }],
            'columns.*' => 'string|min:1|max:255'
        ]);

        $board->update($validatedReq);

        return redirect()->back()->with("Success! ", "Board updated");
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(BoardConfig $board):RedirectResponse
    {
        $tempId = $board->id;

        $board->delete();

        return redirect()->back()->with("Success! ", "Board deleted");
    }
}
