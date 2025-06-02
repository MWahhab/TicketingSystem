<?php

namespace App\Services;

use App\DataTransferObjects\BoardFilterDataTransferObject;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DateFilterService
{
    /**
     * Parse date_from and date_to from the request.
     *
     * @return array [Carbon|null $dateFrom, Carbon|null $dateTo]
     */
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

    /**
     * Create a BoardFilterDataTransferObject from request and dates.
     *
     */
    public function makeBoardFilterDTO(Request $request, ?Carbon $dateFrom, ?Carbon $dateTo, string $field = 'created_at'): BoardFilterDataTransferObject
    {
        $validDateFields = ['created_at', 'updated_at', 'deadline'];
        $dateField       = $request->input('date_field', $field);

        $dateField = in_array($dateField, $validDateFields, true) ? $dateField : $field;

        return new BoardFilterDataTransferObject([
            'boardId'      => (int) $request->input('board_id'),
            'filterColumn' => $dateField,
            'dateFrom'     => $dateFrom,
            'dateTo'       => $dateTo,
        ]);
    }
}
