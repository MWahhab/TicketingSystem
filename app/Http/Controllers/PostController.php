<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

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
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function store(Request $request): \Symfony\Component\HttpFoundation\Response
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

        Post::create([
            'title'       => $validated['title'],
            'desc'        => $validated['desc'],
            'priority'    => $validated['priority'],
            'column'      => $validated['column'],
            'assignee_id' => $validated['assignee_id'],
            'deadline'    => $validated['deadline'],
            'fid_board'   => $validated['fid_board'],
            'fid_user'    => Auth::id(),
        ]);

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
        //
    }

    /**
     * @param Request $request
     * @param Post $post
     * @return Response
     */
    public function update(Request $request, Post $post)
    {
        $request->validate([
            'column' => 'required|string',
        ]);

        $post->column = $request->input('column');
        $post->save();

        return response()->noContent();
    }



    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Post $post)
    {
        //
    }
}
