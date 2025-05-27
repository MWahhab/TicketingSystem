<?php

namespace App\Http\Controllers;

use App\Services\JiraImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JiraImportController extends Controller
{
    /**
     * Handles GET /jira/projects/list
     * Fetches and returns a list of Jira projects if the user is connected.
     */
    public function list(Request $request, JiraImportService $jiraImportService): JsonResponse
    {
        $result = $jiraImportService->getProjectsList();

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status']);
        }

        return response()->json($result['data'] ?? [], $result['status']);
    }

    /**
     * Handles POST /jira/import/tickets
     * Initiates the import of tickets from a selected Jira project.
     */
    public function import(Request $request, JiraImportService $jiraImportService): \Illuminate\Http\JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'appBoardId'    => 'required|numeric',
                'jiraProjectId' => 'required|string',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors'  => $e->getMessage(),
            ], 422);
        }

        $result = $jiraImportService->initiateTicketImport(
            $validatedData['appBoardId'],
            $validatedData['jiraProjectId']
        );

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status']);
        }

        return response()->json(['message' => $result['message'] ?? 'Import process initiated.'], $result['status']);
    }
}
