<?php

namespace App\Http\Controllers;

use App\Enums\PrioritiesEnum;
use App\Models\BoardConfig;
use App\Models\User;
use App\Services\BoardService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BoardConfigController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, BoardService $boardService): Response
    {
        $boardData  = $boardService->getBoardData((int)$request->input('board_id'));
        $boards     = BoardConfig::select('id', 'title', 'columns')->get();
        $boardLinks = $boards->map(fn($b) => ['id' => $b->id,'title' => $b->title]);
        $assignees  = User::select('id', 'name')->get();

        $openPostId = null;
        $postId     = $request->query->get('post_id');
        $boardId    = $request->query->get('board_id');

        if (is_numeric($boardId) && is_numeric($postId)) {
            $openPostId = $postId;
        }

        return Inertia::render('Board/Index', [
            'columns'       => $boardData['columns'],
            'posts'         => $boardData['posts'],
            'boards'        => $boardLinks,
            'boardsColumns' => $boards,
            'assignees'     => $assignees,
            'priorities'    => PrioritiesEnum::cases(),
            'boardTitle'    => $boardData['boardTitle'],
            'boardId'       => $boardData['id'],
            'authUserId'    => Auth::id(),
            'openPostId'    => $openPostId,
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
            'title'   => 'required|string|min:2|max:255',
            'columns' => ['required', 'array', 'min:1', function ($attribute, $value, $fail) {
                if (count($value) !== count(array_unique($value))) {
                    $fail('Column names must be unique.');
                }
            }],
            'columns.*' => 'string|min:1|max:255',
        ]);

        $board = BoardConfig::create([
            'title'    => $validated['title'],
            'columns'  => $validated['columns'],
            'fid_user' => Auth::id()
        ]);

        $boardId = $board->id;

        return redirect()->route("boards.index", ["board_id" => $boardId])->with('success', 'Board created successfully!');
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
    public function update(Request $request, BoardConfig $board)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(BoardConfig $board):RedirectResponse
    {
        $board->delete();

        return redirect()->route("boards.index", ["board_id" => null])->with("Success! ", "Board deleted");
    }
}
