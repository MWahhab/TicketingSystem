<?php

namespace App\DataTransferObjects;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator as ValidatorFacade;
use Illuminate\Validation\ValidationException;

readonly class JiraOAuthCallbackInputDTO
{
    private function __construct(public readonly string $code, public readonly int $boardId)
    {
    }

    public static function fromRequest(Request $request): self
    {
        $queryData        = $request->query();
        $boardIdFromState = self::extractBoardIdFromState($queryData['state'] ?? null);

        $validator = ValidatorFacade::make([
            'code'                => $queryData['code'] ?? null,
            'board_id_from_state' => $boardIdFromState,
        ], [
            'code'                => ['required', 'string', 'min:1'],
            'board_id_from_state' => ['required', 'integer', 'min:1'],
        ], [
            'code.required'                => 'The authorization code is required.',
            'code.string'                  => 'The authorization code must be a string.',
            'code.min'                     => 'The authorization code cannot be empty.',
            'board_id_from_state.required' => 'A valid board ID is required in the state parameter.',
            'board_id_from_state.integer'  => 'The board ID in the state parameter must be an integer.',
            'board_id_from_state.min'      => 'The board ID in the state parameter must be a positive integer.',
        ]);

        if ($validator->fails()) {
            Log::warning('JiraOAuthCallbackInputDTO validation failed.', [
                'errors' => $validator->errors()->toArray(),
                'query'  => $queryData,
            ]);
            throw new ValidationException($validator);
        }

        $validated = $validator->validated();
        return new self($validated['code'], $validated['board_id_from_state']);
    }

    private static function extractBoardIdFromState(mixed $rawStateQueryParam): ?int
    {
        if (!is_string($rawStateQueryParam) || $rawStateQueryParam === '') {
            return null;
        }

        $decodedState = base64_decode($rawStateQueryParam, true);
        if ($decodedState === false) {
            return null;
        }

        $stateArray = json_decode($decodedState, true);
        if (!is_array($stateArray) || !isset($stateArray['boardId'])) {
            return null;
        }

        $boardIdValue = $stateArray['boardId'];
        if (!is_string($boardIdValue) && !is_int($boardIdValue)) {
            return null;
        }

        if (!ctype_digit((string)$boardIdValue)) {
            return null;
        }

        $parsedBoardId = (int)$boardIdValue;
        if ($parsedBoardId <= 0) {
            return null;
        }

        return $parsedBoardId;
    }
}
