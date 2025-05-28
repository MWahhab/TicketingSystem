<?php

namespace App\Http\Controllers;

use App\DataTransferObjects\BoardFilterDataTransferObject;
use App\Enums\PrioritiesEnum;
use App\Models\BoardConfig;
use App\Models\LinkedIssues;
use App\Models\Post;
use App\Models\User;
use App\Services\BoardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class BoardConfigController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, BoardService $boardService): Response
    {
        try {
            [$dateFrom, $dateTo] = $this->parseDates($request);
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return $this->emptyResponse();
        }

        $filterDTO  = $this->makeBoardFilterDTO($request, $dateFrom, $dateTo);

        $boardData  = $boardService->getBoardData($filterDTO);
        $boards     = BoardConfig::select('id', 'title', 'columns')->get();
        $boardLinks = $boards->map(fn ($b) => ['id' => $b->id, 'title' => $b->title]);
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
            'dateFrom'      => $dateFrom?->format('Y-m-d'),
            'dateTo'        => $dateTo?->format('Y-m-d'),
            'dateField'     => $filterDTO->getFilterColumn(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    public function store(Request $request): \Symfony\Component\HttpFoundation\Response
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
            'fid_user' => Auth::id(),
        ]);

        return Inertia::location('/boards/?board_id=' . $board->id);
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
    public function edit(BoardConfig $board): JsonResponse
    {
        return response()->json([
            'id'      => $board->id,
            'title'   => $board->title,
            'columns' => $board->columns,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, BoardConfig $board): \Symfony\Component\HttpFoundation\Response
    {
        $data = $request->validate([
            'title'                => ['required','string','max:255'],
            'columns'              => ['required','array','min:1'],
            'columns.*'            => ['string'],
            'reassignments'        => ['sometimes','array'],
            'reassignments.*.from' => ['required_with:reassignments','string'],
            'reassignments.*.to'   => ['required_with:reassignments','string'],
            'renames'              => ['sometimes','array'],
            'renames.*.from'       => ['required_with:renames','string'],
            'renames.*.to'         => ['required_with:renames','string'],
        ]);

        foreach ($data['reassignments'] ?? [] as $r) {
            Post::where('fid_board', $board->id)
                ->where('column', $r['from'])
                ->update(['column' => $r['to']]);
        }

        foreach ($data['renames'] ?? [] as $r) {
            Post::where('fid_board', $board->id)
                ->where('column', $r['from'])
                ->update(['column' => $r['to']]);
        }

        $board->update([
            'title'   => $data['title'],
            'columns' => $data['columns'],
        ]);

        return Inertia::location('/boards?board_id=' . $board->id);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(BoardConfig $board): RedirectResponse
    {
        $board->load('posts');

        $postIds = $board->posts->pluck('id');

        LinkedIssues::whereIn('fid_origin_post', $postIds)
            ->orWhereIn('fid_related_post', $postIds)
            ->delete();

        $board->delete();

        return redirect()->route('boards.index', ['board_id' => null])->with('Success! ', 'Board deleted');
    }

    private function emptyResponse(): Response
    {
        return Inertia::render('Board/Index', [
            'columns'       => [],
            'posts'         => [],
            'boards'        => [],
            'boardsColumns' => [],
            'assignees'     => [],
            'priorities'    => PrioritiesEnum::cases(),
            'boardTitle'    => 'Invalid Date Format',
            'boardId'       => null,
            'dateField'     => 'created_at',
            'authUserId'    => Auth::id(),
            'openPostId'    => null,
            'error'         => 'Invalid date format provided. Please use a valid date format (e.g., YYYY-MM-DD).',
        ]);
    }

    public function parseDates(Request $request): array
    {
        $dateFrom = null;
        $dateTo   = null;

        if ($request->has('date_from') && !empty($request->input('date_from'))) {
            $dateFrom = Carbon::parse($request->input('date_from'))->startOfDay();
        }

        if ($request->has('date_to') && !empty($request->input('date_to'))) {
            $dateTo = Carbon::parse($request->input('date_to'))->endOfDay();
        } elseif ($dateFrom !== null) {
            $dateTo = $dateFrom->copy()->endOfDay();
        }

        return [$dateFrom, $dateTo];
    }

    private function makeBoardFilterDTO(Request $request, ?Carbon $dateFrom, ?Carbon $dateTo): BoardFilterDataTransferObject
    {
        $validDateFields = ['created_at', 'updated_at', 'deadline'];
        $dateField       = $request->input('date_field', 'created_at');

        $dateField = in_array($dateField, $validDateFields, true) ? $dateField : 'created_at';

        return new BoardFilterDataTransferObject([
            'boardId'      => (int) $request->input('board_id'),
            'filterColumn' => $dateField,
            'dateFrom'     => $dateFrom,
            'dateTo'       => $dateTo,
        ]);
    }

}
