<?php

namespace App\Jobs;

use App\Enums\LinkTypeEnums;
use App\Models\BoardConfig;
use App\Models\Comment;
use App\Models\LinkedIssues;
use App\Models\Post;
use App\Models\User;
use App\Services\LinkedIssuesService;
use App\Traits\ADF2HTML;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ImportJiraProjectJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;
    use ADF2HTML;

    public int $timeout = 1200;
    public int $tries   = 1;

    /**
     * @param array{access_token: string, cloud_id: string} $jiraAuthData
     */
    public function __construct(public string $jiraProjectId, public array $jiraAuthData, public int $initiatingUserId)
    {
    }

    /**
     * @throws \Throwable
     */
    public function handle(LinkedIssuesService $linkedIssuesService): void
    {
        Log::info("Starting Jira import job for Jira Project ID: {$this->jiraProjectId} by User ID: {$this->initiatingUserId}");

        $accessToken    = $this->jiraAuthData['access_token'];
        $cloudId        = $this->jiraAuthData['cloud_id'];
        $initiatingUser = User::find($this->initiatingUserId);

        if (!$initiatingUser) {
            Log::error("Initiating user ID {$this->initiatingUserId} not found. Aborting Jira import for project {$this->jiraProjectId}.");
            return;
        }

        DB::beginTransaction();
        try {
            $projectDetails = $this->fetchJiraProjectDetails($cloudId, $accessToken, $this->jiraProjectId);
            if (!$projectDetails) {
                throw new \Exception("Failed to fetch Jira project details for project ID: {$this->jiraProjectId}");
            }
            $jiraProjectName = $projectDetails['name'] ?? 'Jira Imported Project ' . Str::random(4);

            $jiraStatusesWithCategories = $this->fetchJiraProjectStatusesWithCategories($cloudId, $accessToken, $this->jiraProjectId);

            [
                $appColumnsForBoard,
                $jiraToAppStatusMap,
                $theActualAppDoneColumnName
            ] = $this->prepareBoardColumnsAndMappings($jiraStatusesWithCategories);

            $boardConfig = BoardConfig::create([
                'title'    => $jiraProjectName,
                'columns'  => $appColumnsForBoard,
                'fid_user' => $this->initiatingUserId,
            ]);
            Log::info("Created BoardConfig ID: {$boardConfig->id} for Jira project: {$jiraProjectName}. App 'Done' column is '{$theActualAppDoneColumnName}'.");

            $jiraIssues = $this->fetchJiraIssuesForProjectWithDetails($cloudId, $accessToken, $this->jiraProjectId);

            $allPostsData = [];

            $defaultAppColumn = $appColumnsForBoard[0] ?? 'To Do';
            if ($defaultAppColumn === $theActualAppDoneColumnName && count($appColumnsForBoard) > 1) {
                foreach ($appColumnsForBoard as $colName) {
                    if ($colName !== $theActualAppDoneColumnName) {
                        $defaultAppColumn = $colName;
                        break;
                    }
                }
            }

            foreach ($jiraIssues as $jiraIssue) {
                $postData = $this->transformJiraIssueToPostData(
                    $jiraIssue,
                    $boardConfig->id,
                    $this->initiatingUserId,
                    $jiraToAppStatusMap,
                    $theActualAppDoneColumnName,
                    $defaultAppColumn
                );
                if ($postData) {
                    $allPostsData[] = $postData;
                }
            }

            $createdPostIdsMap = [];
            if ($allPostsData !== []) {
                Post::insert($allPostsData);
                Log::info('Bulk inserted ' . count($allPostsData) . " posts for BoardConfig ID: {$boardConfig->id}");

                $migratedJiraIds    = array_column($allPostsData, 'migrated_from');
                $createdPostsModels = Post::whereIn('migrated_from', $migratedJiraIds)
                    ->where('fid_board', $boardConfig->id)
                    ->get(['id', 'migrated_from']);

                $createdPostIdsMap = $createdPostsModels->mapWithKeys(function ($postModel) {
                    /** @var Post $postModel */
                    $jiraId = Str::after((string)$postModel->migrated_from, 'jira:');

                    if ($jiraId !== '') {
                        return [$jiraId => $postModel->id];
                    }

                    return [];
                })->all();
            }

            $allCommentsData = [];
            foreach ($jiraIssues as $jiraIssue) {
                $jiraIssueId = $jiraIssue['id'] ?? null;
                if (!is_string($jiraIssueId)) {
                    continue;
                }

                $appPostId = $createdPostIdsMap[$jiraIssueId] ?? null;
                if (!$appPostId) {
                    continue;
                }

                $jiraComments = $jiraIssue['fields']['comment']['comments'] ?? [];
                if (!is_array($jiraComments)) {
                    continue;
                }

                foreach ($jiraComments as $jiraComment) {
                    if (!is_array($jiraComment)) {
                        continue;
                    }
                    $commentData = $this->transformJiraCommentToCommentData($jiraComment, $appPostId, $this->initiatingUserId);
                    if ($commentData !== []) {
                        $allCommentsData[] = $commentData;
                    }
                }
            }

            if ($allCommentsData !== []) {
                foreach (array_chunk($allCommentsData, 500) as $chunk) {
                    Comment::insert($chunk);
                }
                Log::info('Bulk inserted ' . count($allCommentsData) . " comments for BoardConfig ID: {$boardConfig->id}");
            }

            foreach ($jiraIssues as $jiraIssue) {
                $jiraIssueId = $jiraIssue['id'] ?? null;
                if (!is_string($jiraIssueId)) {
                    continue;
                }

                $currentAppOriginPostId = $createdPostIdsMap[$jiraIssueId] ?? null;
                if (!$currentAppOriginPostId) {
                    continue;
                }

                $jiraIssueLinks = $jiraIssue['fields']['issuelinks'] ?? [];
                if (!is_array($jiraIssueLinks)) {
                    continue;
                }

                foreach ($jiraIssueLinks as $jiraLink) {
                    if (!is_array($jiraLink)) {
                        continue;
                    }

                    $directLinkDetails = $this->transformJiraLinkToDirectLinkData(
                        $jiraLink,
                        $currentAppOriginPostId,
                        $createdPostIdsMap,
                        $this->initiatingUserId
                    );

                    if ($directLinkDetails) {
                        $forwardAttrs = [
                            'fid_origin_post'  => $directLinkDetails['fid_origin_post'],
                            'fid_related_post' => $directLinkDetails['fid_related_post'],
                            'link_type'        => $directLinkDetails['link_type'],
                        ];
                        $forwardValues = [
                            'fid_user'   => $directLinkDetails['fid_user'],
                            'created_at' => Carbon::now(),
                            'updated_at' => Carbon::now(),
                        ];

                        Log::debug('ImportJiraProjectJob: creating direct link', [
                            'attrs'  => $forwardAttrs,
                            'values' => $forwardValues,
                        ]);
                        LinkedIssues::firstOrCreate($forwardAttrs, $forwardValues);

                        $reverseLinkType = $linkedIssuesService->getReverseStatus($directLinkDetails['link_type']);

                        $reverseAttrs = [
                            'fid_origin_post'  => $directLinkDetails['fid_related_post'],
                            'fid_related_post' => $directLinkDetails['fid_origin_post'],
                        ];
                        $reverseValues = [
                            'link_type' => $reverseLinkType,
                            'fid_user'  => $directLinkDetails['fid_user'],
                        ];

                        Log::debug('ImportJiraProjectJob: creating/updating reverse link', [
                            'attrs'  => $reverseAttrs,
                            'values' => $reverseValues,
                        ]);
                        LinkedIssues::firstOrCreate($forwardAttrs, $forwardValues);
                    }
                }
            }

            DB::commit();
            Log::info("Successfully imported Jira Project ID: {$this->jiraProjectId} into BoardConfig ID: {$boardConfig->id}");

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Failed Jira import job for Jira Project ID: {$this->jiraProjectId}. Error: {$e->getMessage()}", [
                'file'          => $e->getFile(),
                'line'          => $e->getLine(),
                'trace_summary' => Str::substr($e->getTraceAsString(), 0, 2000),
            ]);
            throw $e;
        }
    }

    /**
     * @param array<string, scalar|array<scalar>> $queryParams
     * @throws ConnectionException
     * @return array<string, mixed>|null
     */
    private function makeJiraApiRequest(string $cloudId, string $accessToken, string $endpoint, array $queryParams = []): ?array
    {
        $baseUrl  = "https://api.atlassian.com/ex/jira/{$cloudId}/rest/api/3/";
        $url      = $baseUrl . ltrim($endpoint, '/');
        $response = Http::withToken($accessToken)->acceptJson()->timeout(60)->get($url, $queryParams);

        if (!$response->successful()) {
            Log::warning("Jira API request failed for endpoint: {$endpoint}", [
                'status' => $response->status(), 'body' => $response->json() ?: $response->body(), 'params' => $queryParams,
            ]);
            return null;
        }
        /** @var array<string, mixed>|null */
        return $response->json();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fetchJiraProjectDetails(string $cloudId, string $accessToken, string $jiraProjectId): ?array
    {
        return $this->makeJiraApiRequest($cloudId, $accessToken, "project/{$jiraProjectId}");
    }

    /**
     * @return array<array{name: string, categoryKey: string}>
     */
    private function fetchJiraProjectStatusesWithCategories(string $cloudId, string $accessToken, string $jiraProjectId): array
    {
        /** @var array<string, array{name: string, categoryKey: string}> $uniqueStatuses */
        $uniqueStatuses = [];

        $projectStatusesResponse = $this->makeJiraApiRequest($cloudId, $accessToken, "project/{$jiraProjectId}/statuses");

        if (is_array($projectStatusesResponse)) {
            foreach ($projectStatusesResponse as $issueTypeStatuses) {
                if (!is_array($issueTypeStatuses)) {
                    continue;
                }
                if (!isset($issueTypeStatuses['statuses'])) {
                    continue;
                }
                if (!is_array($issueTypeStatuses['statuses'])) {
                    continue;
                }
                foreach ($issueTypeStatuses['statuses'] as $status) {
                    if (is_array($status)          && isset($status['name'], $status['statusCategory']['key']) &&
                        is_string($status['name']) && is_string($status['statusCategory']['key'])) {
                        $statusName = trim($status['name']);
                        if ($statusName !== '' && !isset($uniqueStatuses[$statusName])) {
                            $uniqueStatuses[$statusName] = [
                                'name'        => $statusName,
                                'categoryKey' => $status['statusCategory']['key'],
                            ];
                        }
                    }
                }
            }
        }

        if (empty($uniqueStatuses)) {
            $allStatusesResponse = $this->makeJiraApiRequest($cloudId, $accessToken, 'status');
            if (is_array($allStatusesResponse)) {
                foreach ($allStatusesResponse as $status) {
                    if (is_array($status)          && isset($status['name'], $status['statusCategory']['key']) &&
                        is_string($status['name']) && is_string($status['statusCategory']['key'])) {
                        $statusName = trim($status['name']);
                        if ($statusName !== '' && !isset($uniqueStatuses[$statusName])) {
                            $uniqueStatuses[$statusName] = [
                                'name'        => $statusName,
                                'categoryKey' => $status['statusCategory']['key'],
                            ];
                        }
                    }
                }
            }
        }

        $statusesWithCategories = array_values($uniqueStatuses);

        if ($statusesWithCategories === []) {
            Log::warning("No statuses found for Jira Project ID: {$jiraProjectId}. Using default statuses.");
            return [
                ['name' => 'To Do', 'categoryKey' => 'new'],
                ['name' => 'In Progress', 'categoryKey' => 'indeterminate'],
                ['name' => 'Done', 'categoryKey' => 'done'],
            ];
        }

        return $statusesWithCategories;
    }

    /**
     * @param array<array{name: string, categoryKey: string}> $jiraStatusesWithCategories
     * @return array{0: list<string>, 1: array<string, string>, 2: string}
     */
    private function prepareBoardColumnsAndMappings(array $jiraStatusesWithCategories): array
    {
        /** @var array<string, string> $jiraToAppStatusMap */
        $jiraToAppStatusMap = [];
        /** @var array<string, true> $takenNames */
        $takenNames             = [];
        $finalAppDoneColumnName = 'Done';

        $isLiteralDoneNameUsedByNonFinalJiraStatus = false;
        /** @var array<string, true> $allJiraOriginalNamesLower */
        $allJiraOriginalNamesLower = [];
        foreach ($jiraStatusesWithCategories as $status) {
            $lcName                             = strtolower($status['name']);
            $allJiraOriginalNamesLower[$lcName] = true;
            if ($lcName === 'done' && $status['categoryKey'] !== 'done') {
                $isLiteralDoneNameUsedByNonFinalJiraStatus = true;
            }
        }

        if ($isLiteralDoneNameUsedByNonFinalJiraStatus) {
            $counter                = 1;
            $finalAppDoneColumnName = 'Done (Final)';
            while (isset($allJiraOriginalNamesLower[strtolower($finalAppDoneColumnName)])) {
                $finalAppDoneColumnName = 'Done (Final ' . $counter++ . ')';
            }
        }
        $takenNames[$finalAppDoneColumnName] = true;

        /** @var list<string> $appColumnNamesList */
        $appColumnNamesList = [];

        foreach ($jiraStatusesWithCategories as $status) {
            $originalJiraName = $status['name'];
            if ($status['categoryKey'] === 'done') {
                $jiraToAppStatusMap[$originalJiraName] = $finalAppDoneColumnName;
                if (!in_array($finalAppDoneColumnName, $appColumnNamesList, true)) {
                    $appColumnNamesList[] = $finalAppDoneColumnName;
                }
            } else {
                $baseNameForAppCol = $originalJiraName;
                $currentAppColName = $baseNameForAppCol;
                $counter           = 1;
                while (isset($takenNames[$currentAppColName]) || $currentAppColName === $finalAppDoneColumnName) {
                    $currentAppColName = $baseNameForAppCol . ' (' . $counter++ . ')';
                }
                $jiraToAppStatusMap[$originalJiraName] = $currentAppColName;
                $appColumnNamesList[]                  = $currentAppColName;
                $takenNames[$currentAppColName]        = true;
            }
        }

        if (empty($appColumnNamesList)) {
            $appColumnNamesList = ['To Do', 'In Progress', $finalAppDoneColumnName];
        } elseif (!in_array($finalAppDoneColumnName, $appColumnNamesList, true)) {
            $appColumnNamesList[] = $finalAppDoneColumnName;
        }

        return [$appColumnNamesList, $jiraToAppStatusMap, $finalAppDoneColumnName];
    }


    /**
     * @return list<array<string, mixed>>
     */
    private function fetchJiraIssuesForProjectWithDetails(string $cloudId, string $accessToken, string $jiraProjectId): array
    {
        /** @var list<array<string, mixed>> $allIssues */
        $allIssues  = [];
        $startAt    = 0;
        $maxResults = 50;

        do {
            $params = [
                'jql'        => "project = {$jiraProjectId} ORDER BY created DESC",
                'expand'     => 'comment,issuelinks',
                'fields'     => '*all',
                'startAt'    => $startAt,
                'maxResults' => $maxResults,
            ];
            $response = $this->makeJiraApiRequest($cloudId, $accessToken, 'search', $params);

            if (!$response || !isset($response['issues']) || !is_array($response['issues'])) {
                Log::warning("No issues found or error fetching issues (with details) for project {$jiraProjectId} at offset {$startAt}");
                break;
            }

            /** @var list<array<string, mixed>> $issuesOnPage */
            $issuesOnPage = $response['issues'];
            $allIssues    = array_merge($allIssues, $issuesOnPage);

            $totalIssues = isset($response['total']) && is_numeric($response['total']) ? (int)$response['total'] : 0;
            if ($issuesOnPage === [] || ($startAt + count($issuesOnPage)) >= $totalIssues) {
                break;
            }
            $startAt += count($issuesOnPage);

        } while (true);

        return $allIssues;
    }

    /**
     * @param array<string, mixed> $jiraIssue
     * @param array<string, string> $jiraToAppStatusMap
     * @return ?array<string, mixed>
     */
    private function transformJiraIssueToPostData(
        array $jiraIssue,
        int $appBoardConfigId,
        int $appUserId,
        array $jiraToAppStatusMap,
        string $theAppDoneColumnName,
        string $defaultAppColumnName
    ): ?array {
        $fields      = $jiraIssue['fields'] ?? [];
        $jiraIssueId = $jiraIssue['id']     ?? null;

        if (!is_array($fields) || !is_string($jiraIssueId) || $jiraIssueId === '') {
            Log::warning('Jira issue data missing fields or valid top-level id.', ['jira_issue_key' => $jiraIssue['key'] ?? 'N/A']);
            return null;
        }

        $assigneeId            = $appUserId;
        $jiraStatus            = $fields['status'] ?? null;
        $jiraStatusName        = is_array($jiraStatus) && isset($jiraStatus['name']) && is_string($jiraStatus['name']) ? trim($jiraStatus['name']) : null;
        $jiraStatusCategory    = $jiraStatus['statusCategory'] ?? null;
        $jiraStatusCategoryKey = is_array($jiraStatusCategory) && isset($jiraStatusCategory['key']) && is_string($jiraStatusCategory['key']) ? $jiraStatusCategory['key'] : null;

        $appColumnName = $defaultAppColumnName;

        if ($jiraStatusCategoryKey === 'done') {
            $appColumnName = $theAppDoneColumnName;
        } elseif ($jiraStatusName !== null && isset($jiraToAppStatusMap[$jiraStatusName])) {
            $appColumnName = $jiraToAppStatusMap[$jiraStatusName];
        }

        $jiraPriority     = $fields['priority'] ?? null;
        $jiraPriorityName = is_array($jiraPriority) && isset($jiraPriority['name']) && is_string($jiraPriority['name'])
            ? strtolower($jiraPriority['name'])
            : 'low';

        $appPriority      = 'low';
        if (in_array($jiraPriorityName, ['highest', 'high'])) {
            $appPriority = 'high';
        } elseif ($jiraPriorityName === 'medium') {
            $appPriority = 'medium';
        }

        $createdAt = isset($fields['created']) && is_string($fields['created']) ? Carbon::parse($fields['created']) : Carbon::now();
        $updatedAt = isset($fields['updated']) && is_string($fields['updated']) ? Carbon::parse($fields['updated']) : Carbon::now();
        $deadline  = isset($fields['duedate']) && is_string($fields['duedate']) ? Carbon::parse($fields['duedate'])->toDateString() : null;

        $descriptionHtml = '';
        if (isset($fields['description'])) {
            $descriptionHtml = $this->adfToHtml($fields['description']);
        }

        $summary = isset($fields['summary']) && is_string($fields['summary'])
            ? $fields['summary']
            : ('Untitled Jira Issue - ' . ($jiraIssue['key'] ?? Str::random(4)));

        return [
            'title'         => $summary,
            'desc'          => $descriptionHtml,
            'priority'      => $appPriority,
            'pinned'        => $jiraPriorityName === 'highest',
            'column'        => $appColumnName,
            'assignee_id'   => $assigneeId,
            'deadline'      => $deadline,
            'had_branch'    => null,
            'fid_board'     => $appBoardConfigId,
            'fid_user'      => $appUserId,
            'migrated_from' => 'jira:' . $jiraIssueId,
            'created_at'    => $createdAt->toDateTimeString(),
            'updated_at'    => $updatedAt->toDateTimeString(),
        ];
    }

    /**
     * @param array<string, mixed> $jiraComment
     * @return array<string, mixed>
     */
    private function transformJiraCommentToCommentData(array $jiraComment, int $appPostId, int $appUserId): array
    {
        $author     = $jiraComment['author'] ?? null;
        $authorName = is_array($author) && isset($author['displayName']) && is_string($author['displayName'])
            ? $author['displayName']
            : 'Unknown Jira User';
        $originalCommentBody = $jiraComment['body'] ?? '';
        $commentTextHtml     = '';

        if (is_string($originalCommentBody) && $originalCommentBody !== '') {
            if (Str::startsWith($originalCommentBody, '{') && Str::endsWith($originalCommentBody, '}')) {
                $decoded = json_decode($originalCommentBody, true);
                if (is_array($decoded) && ($decoded['type'] ?? null) === 'doc') {
                    $commentTextHtml = $this->adfToHtml($decoded);
                } else {
                    $commentTextHtml = nl2br(htmlspecialchars($originalCommentBody));
                }
            } else {
                $commentTextHtml = nl2br(htmlspecialchars($originalCommentBody));
            }
        } elseif (is_array($originalCommentBody) && ($originalCommentBody['type'] ?? null) === 'doc') {
            $commentTextHtml = $this->adfToHtml($originalCommentBody);
        }

        $headerHtml        = '<p><em>Imported from Jira. Original comment by: ' . htmlspecialchars($authorName) . '</em></p>';
        $appCommentContent = $headerHtml . $commentTextHtml;

        if (trim(strip_tags($commentTextHtml)) === '') {
            $appCommentContent = $headerHtml . '<p><em>(Original Jira comment was empty or contained no text content)</em></p><br>';
        }

        $createdAt = isset($jiraComment['created']) && is_string($jiraComment['created']) ? Carbon::parse($jiraComment['created']) : Carbon::now();
        $updatedAt = isset($jiraComment['updated']) && is_string($jiraComment['updated']) ? Carbon::parse($jiraComment['updated']) : Carbon::now();

        return [
            'content'    => $appCommentContent,
            'fid_post'   => $appPostId,
            'fid_user'   => $appUserId,
            'created_at' => $createdAt->toDateTimeString(),
            'updated_at' => $updatedAt->toDateTimeString(),
        ];
    }

    /**
     * @param array<string, mixed> $jiraLink
     * @param array<string, int> $createdPostIdsMap
     * @return ?array{fid_origin_post: int, fid_related_post: int, link_type: string, fid_user: int}
     */
    private function transformJiraLinkToDirectLinkData(
        array $jiraLink,
        int $currentAppPostId,
        array $createdPostIdsMap,
        int $appUserId
    ): ?array {
        $outwardIssue = $jiraLink['outwardIssue'] ?? null;
        $inwardIssue  = $jiraLink['inwardIssue']  ?? null;
        $type         = $jiraLink['type']         ?? null;

        $rawJiraLinkDescription = null;
        $relatedJiraIssueId     = null;

        if (is_array($outwardIssue) && isset($outwardIssue['id']) && is_string($outwardIssue['id']) && is_array($type) && isset($type['outward']) && is_string($type['outward'])) {
            $rawJiraLinkDescription = $type['outward'];
            $relatedJiraIssueId     = $outwardIssue['id'];
        } elseif (is_array($inwardIssue) && isset($inwardIssue['id']) && is_string($inwardIssue['id']) && is_array($type) && isset($type['inward']) && is_string($type['inward'])) {
            $rawJiraLinkDescription = $type['inward'];
            $relatedJiraIssueId     = $inwardIssue['id'];
        } else {
            return null;
        }

        $appLinkType = $this->mapJiraDescriptionToAppLinkType($rawJiraLinkDescription);

        $relatedAppPostId = $createdPostIdsMap[$relatedJiraIssueId] ?? null;
        if (!$relatedAppPostId) {
            return null;
        }

        return [
            'fid_origin_post'  => $currentAppPostId,
            'fid_related_post' => $relatedAppPostId,
            'link_type'        => $appLinkType,
            'fid_user'         => $appUserId,
        ];
    }


    private function mapJiraDescriptionToAppLinkType(string $jiraLinkDescription): string
    {
        $jiraLinkDescription = strtolower(trim($jiraLinkDescription));
        if ($jiraLinkDescription === '') {
            return LinkTypeEnums::RELATES_TO->value;
        }

        foreach (LinkTypeEnums::cases() as $case) {
            if (strtolower($case->value) === $jiraLinkDescription) {
                return $case->value;
            }
        }

        $map = [
            'blocks'           => LinkTypeEnums::BLOCKS->value,
            'is blocked by'    => LinkTypeEnums::BLOCKED_BY->value,
            'clones'           => LinkTypeEnums::DUPLICATES->value,
            'is cloned by'     => LinkTypeEnums::DUPLICATED_BY->value,
            'duplicates'       => LinkTypeEnums::DUPLICATES->value,
            'is duplicated by' => LinkTypeEnums::DUPLICATED_BY->value,
            'causes'           => LinkTypeEnums::CAUSES->value,
            'is caused by'     => LinkTypeEnums::CAUSED_BY->value,
        ];

        if (array_key_exists($jiraLinkDescription, $map)) {
            return $map[$jiraLinkDescription];
        }
        return LinkTypeEnums::RELATES_TO->value;
    }
}
