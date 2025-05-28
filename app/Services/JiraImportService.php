<?php

namespace App\Services;

use App\DataTransferObjects\JiraSessionDataDTO;
use App\Jobs\ImportJiraProjectJob;
use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;

class JiraImportService
{
    private const string JIRA_SESSION_KEY = 'jira';

    private function getJiraAuth(): ?JiraSessionDataDTO
    {
        $rawSessionData = Session::get(self::JIRA_SESSION_KEY);
        $sessionDTO     = JiraSessionDataDTO::fromSessionData($rawSessionData);

        if (!$sessionDTO instanceof \App\DataTransferObjects\JiraSessionDataDTO) {
            if ($rawSessionData !== null) {
                Session::forget(self::JIRA_SESSION_KEY);
                Log::warning('Malformed Jira session data found and cleared during DTO creation.');
            }
            return null;
        }

        if ($sessionDTO->isExpired()) {
            Session::forget(self::JIRA_SESSION_KEY);
            Log::info('Jira session expired and cleared by service.');
            return null;
        }

        return $sessionDTO;
    }

    public function getProjectsList(): array
    {
        $authDTO = $this->getJiraAuth();
        if (!$authDTO instanceof \App\DataTransferObjects\JiraSessionDataDTO) {
            return ['error' => 'Jira not connected or session expired.', 'status' => 401];
        }

        try {
            $apiUrl   = "https://api.atlassian.com/ex/jira/{$authDTO->cloudId}/rest/api/3/project";
            $response = Http::withToken($authDTO->accessToken)->acceptJson()->get($apiUrl);

            if (!$response->successful()) {
                Log::error('Service: Failed to fetch Jira projects', [
                    'status'   => $response->status(), 'body' => $response->json(null, JSON_PRETTY_PRINT) ?: $response->body(),
                    'cloud_id' => $authDTO->cloudId,
                ]);
                if (in_array($response->status(), [401, 403])) {
                    Session::forget(self::JIRA_SESSION_KEY);
                    return ['error' => 'Jira connection error or token invalid. Please log in with Jira again.', 'status' => 401];
                }
                return ['error' => 'Failed to fetch projects from Jira.', 'status' => $response->status()];
            }

            /**
             * @phpstan-ignore-next-line
             */
            $projects = collect($response->json())->map(fn ($project) => [
                'id'   => $project['id']   ?? null,
                'key'  => $project['key']  ?? null,
                'name' => $project['name'] ?? null,
            ])->filter(fn ($project) => $project['id'] && $project['name'])->values()->all();

            return ['data' => $projects, 'status' => 200];

        } catch (Exception $e) {
            Log::error('Service: Exception while fetching Jira projects', [
                'message'  => $e->getMessage(),
                'cloud_id' => $authDTO->cloudId,
            ]);
            return ['error' => 'An internal error occurred while fetching projects from Jira.', 'status' => 500];
        }
    }

    public function initiateTicketImport(string $jiraProjectId): array
    {
        $authDTO = $this->getJiraAuth();
        if (!$authDTO instanceof \App\DataTransferObjects\JiraSessionDataDTO) {
            return ['error' => 'Jira not connected or session expired. Please log in with Jira first.', 'status' => 401];
        }

        $initiatingUserId = Auth::id();
        if (!$initiatingUserId) {
            Log::error('Jira import initiation failed: User not authenticated when dispatching job.');
            return ['error' => 'User not authenticated. Please log in to initiate an import.', 'status' => 401];
        }

        ImportJiraProjectJob::dispatch(
            $jiraProjectId,
            [
                'access_token' => $authDTO->accessToken,
                'cloud_id'     => $authDTO->cloudId,
            ],
            $initiatingUserId
        )->onQueue('jira-imports');

        Log::info('Jira import job DISPATCHED by service', [
            'jiraProjectIdToImport'       => $jiraProjectId,
            'initiatingUserId'            => $initiatingUserId,
            'jira_cloud_id'               => $authDTO->cloudId,
        ]);

        return [
            'message' => '
            Jira import has been queued and will be processed in the background. 
            Please refresh the page in approximately 5 minutes to see the new board.',

            'status' => 202];
    }

    public function storeJiraSession(
        string $accessToken,
        string $cloudId,
        ?string $refreshToken,
        int $expiresInSeconds
    ): void {
        Session::put(self::JIRA_SESSION_KEY, [
            'access_token'  => $accessToken,
            'cloud_id'      => $cloudId,
            'refresh_token' => $refreshToken,
            'expires_at'    => now()->addSeconds($expiresInSeconds),
        ]);
        Log::info('Jira session data stored successfully.');
    }
}
