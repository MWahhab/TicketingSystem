<?php

namespace App\Http\Requests;

use App\Enums\LinkTypeEnums;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LinkedIssueRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'fid_origin_post'  => 'required|exists:posts,id',
            'fid_related_post' => 'required|exists:posts,id',
            'link_type'        => ['required', Rule::in(array_column(LinkTypeEnums::cases(), 'value'))],
        ];
    }
}
