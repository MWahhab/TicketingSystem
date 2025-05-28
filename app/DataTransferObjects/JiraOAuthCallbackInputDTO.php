<?php

namespace App\DataTransferObjects;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator as ValidatorFacade;
use Illuminate\Validation\ValidationException;

readonly class JiraOAuthCallbackInputDTO
{
    private function __construct(public readonly string $code)
    {
    }

    public static function fromRequest(Request $request): self
    {
        $queryData        = $request->query();

        $validator = ValidatorFacade::make([
            'code'                => $queryData['code'] ?? null,
        ], [
            'code'                => ['required', 'string', 'min:1'],
        ], [
            'code.required'                => 'The authorization code is required.',
            'code.string'                  => 'The authorization code must be a string.',
            'code.min'                     => 'The authorization code cannot be empty.',
        ]);

        if ($validator->fails()) {
            Log::warning('JiraOAuthCallbackInputDTO validation failed.', [
                'errors' => $validator->errors()->toArray(),
                'query'  => $queryData,
            ]);
            throw new ValidationException($validator);
        }

        $validated = $validator->validated();
        return new self($validated['code']);
    }
}
