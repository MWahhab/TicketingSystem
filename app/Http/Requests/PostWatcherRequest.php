<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PostWatcherRequest extends FormRequest
{
    /**
     * @return bool
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array[]
     */
    public function rules(): array
    {
        return [
            'post_fid' => ['required', 'integer', 'exists:posts,id'],
            'user_fid' => ['required', 'integer', 'exists:users,id'],
        ];
    }
}
