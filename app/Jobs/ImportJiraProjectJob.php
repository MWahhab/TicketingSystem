<?php

namespace App\Jobs;

use App\Enums\LinkTypeEnums;
use App\Models\BoardConfig;
use App\Models\Comment;
use App\Models\LinkedIssue;
use App\Models\Post;
use App\Models\User;
use App\Services\LinkedIssuesService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
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

    public int $timeout = 1200;
    public int $tries   = 1;

    public function __construct(public string $jiraProjectId, public array $jiraAuthData, public int $initiatingUserId)
    {
    }

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

            $jiraStatuses = $this->fetchJiraProjectStatuses($cloudId, $accessToken, $this->jiraProjectId);
            $appColumns   = $this->mapJiraStatusesToAppColumns($jiraStatuses);

            $boardConfig = BoardConfig::create([
                'title'    => $jiraProjectName,
                'columns'  => json_encode($appColumns), // Storing unique names directly
                'fid_user' => $this->initiatingUserId,
            ]);
            Log::info("Created BoardConfig ID: {$boardConfig->id} for Jira project: {$jiraProjectName}");

            $jiraIssues = $this->fetchJiraIssuesForProjectWithDetails($cloudId, $accessToken, $this->jiraProjectId);

            $allPostsData = [];
            foreach ($jiraIssues as $jiraIssue) {
                $postData = $this->transformJiraIssueToPostData($jiraIssue, $boardConfig->id, $this->initiatingUserId, $appColumns);
                if ($postData) {
                    $allPostsData[] = $postData;
                }
            }

            $createdPostIdsMap = [];
            if ($allPostsData !== []) {
                Post::insert($allPostsData);
                Log::info('Bulk inserted ' . count($allPostsData) . " posts for BoardConfig ID: {$boardConfig->id}");

                $migratedJiraIds = array_column($allPostsData, 'migrated_from');
                $createdPosts    = Post::whereIn('migrated_from', $migratedJiraIds)
                    ->where('fid_board', $boardConfig->id)
                    ->get(['id', 'migrated_from']);
                $createdPostIdsMap = $createdPosts->pluck('id', 'migrated_from')->mapKeys(fn($appPostId, $migratedFromKey) => Str::after($migratedFromKey, 'jira:'))->toArray();
            }

            $allCommentsData = [];
            foreach ($jiraIssues as $jiraIssue) {
                $appPostId = $createdPostIdsMap[$jiraIssue['id']] ?? null;
                if (!$appPostId) {
                    continue;
                }

                $jiraComments = $jiraIssue['fields']['comment']['comments'] ?? [];
                foreach ($jiraComments as $jiraComment) {
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
                $originPostId = $createdPostIdsMap[$jiraIssue['id']] ?? null;
                if (!$originPostId) {
                    continue;
                }

                $jiraIssueLinks = $jiraIssue['fields']['issuelinks'] ?? [];
                foreach ($jiraIssueLinks as $jiraLink) {
                    $linkedIssueData = $this->transformJiraLinkToLinkedIssueData(
                        $jiraLink,
                        $originPostId,
                        $createdPostIdsMap,
                        $this->initiatingUserId,
                        $linkedIssuesService
                    );
                    if ($linkedIssueData) {
                        LinkedIssue::firstOrCreate(
                            [
                                'fid_origin_post'  => $linkedIssueData['fid_origin_post'],
                                'fid_related_post' => $linkedIssueData['fid_related_post'],
                                'link_type'        => $linkedIssueData['link_type'],
                            ],
                            array_merge($linkedIssueData, ['created_at' => Carbon::now(), 'updated_at' => Carbon::now()])
                        );
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

    private function makeJiraApiRequest(string $cloudId, string $accessToken, string $endpoint, array $queryParams = []): ?array
    {
        $baseUrl  = "https://api.atlassian.com/ex/jira/{$cloudId}/rest/api/3/";
        $url      = $baseUrl . ltrim($endpoint, '/');
        $response = Http::withToken($accessToken)->acceptJson()->timeout(60)->get($url, $queryParams);

        if (!$response->successful()) {
            Log::warning("Jira API request failed for endpoint: {$endpoint}", [
                'status' => $response->status(), 'body' => $response->json(null, JSON_PRETTY_PRINT) ?: $response->body(), 'params' => $queryParams,
            ]);
            return null;
        }
        return $response->json();
    }

    private function fetchJiraProjectDetails(string $cloudId, string $accessToken, string $jiraProjectId): ?array
    {
        return $this->makeJiraApiRequest($cloudId, $accessToken, "project/{$jiraProjectId}");
    }

    private function fetchJiraProjectStatuses(string $cloudId, string $accessToken, string $jiraProjectId): array
    {
        $statusesResponse   = $this->makeJiraApiRequest($cloudId, $accessToken, "project/{$jiraProjectId}/statuses");
        $projectStatusNames = [];

        if ($statusesResponse) {
            foreach ($statusesResponse as $statusTypeArray) {
                if (!isset($statusTypeArray['statuses'])) {
                    continue;
                }
                if (!is_array($statusTypeArray['statuses'])) {
                    continue;
                }
                foreach ($statusTypeArray['statuses'] as $status) {
                    if (isset($status['name']) && is_string($status['name'])) {
                        $projectStatusNames[] = $status['name'];
                    }
                }
            }
        }

        if ($projectStatusNames === []) {
            $allStatusesResponse = $this->makeJiraApiRequest($cloudId, $accessToken, 'status');
            if ($allStatusesResponse) {
                foreach ($allStatusesResponse as $status) {
                    if (isset($status['name']) && is_string($status['name'])) {
                        $projectStatusNames[] = $status['name'];
                    }
                }
            }
        }
        return $projectStatusNames === [] ? ['To Do', 'In Progress', 'Done'] : array_values(array_unique($projectStatusNames));
    }

    private function mapJiraStatusesToAppColumns(array $jiraStatusNames): array
    {
        $appColumns = [];
        $takenNames = [];
        foreach ($jiraStatusNames as $statusName) {
            $baseName    = (string) $statusName;
            $currentName = $baseName;
            $counter     = 1;
            while (in_array($currentName, $takenNames)) {
                $currentName = $baseName . ' (' . $counter++ . ')';
            }
            $appColumns[] = $currentName;
            $takenNames[] = $currentName;
        }
        return $appColumns === [] ? ['To Do', 'In Progress', 'Done'] : $appColumns;
    }

    private function fetchJiraIssuesForProjectWithDetails(string $cloudId, string $accessToken, string $jiraProjectId): array
    {
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

            $issuesOnPage = $response['issues'];
            $allIssues    = array_merge($allIssues, $issuesOnPage);

            $totalIssues = $response['total'] ?? 0;
            if ($issuesOnPage === [] || ($startAt + count($issuesOnPage)) >= $totalIssues) {
                break;
            }
            $startAt += count($issuesOnPage);

        } while (true);

        return $allIssues;
    }

    private function transformJiraIssueToPostData(array $jiraIssue, int $appBoardConfigId, int $appUserId, array $appColumnNames): ?array
    {
        $fields = $jiraIssue['fields'] ?? [];
        if (empty($fields) || !isset($jiraIssue['id']) || !is_string($jiraIssue['id'])) {
            Log::warning('Jira issue data missing fields or valid id.', ['jira_issue_key' => $jiraIssue['key'] ?? 'N/A']);
            return null;
        }

        $assigneeId     = $appUserId;
        $jiraStatusName = $fields['status']['name'] ?? null;
        $appColumnName  = $appColumnNames[0]        ?? 'To Do';

        if ($jiraStatusName && $appColumnNames !== []) {
            $foundColumn = false;
            foreach ($appColumnNames as $colName) {
                if (strtolower((string)$colName) === strtolower((string)$jiraStatusName) || stripos((string)$colName, (string)$jiraStatusName) !== false) {
                    $appColumnName = $colName;
                    $foundColumn   = true;
                    break;
                }
            }
            if (!$foundColumn) {
                Log::info("Jira status '{$jiraStatusName}' not directly mapped to an app column for issue {$jiraIssue['key']}. Using default '{$appColumnName}'.");
            }
        }

        $jiraPriorityName = strtolower($fields['priority']['name'] ?? 'low');
        $appPriority      = 'low';
        if (in_array($jiraPriorityName, ['highest', 'high'])) {
            $appPriority = 'high';
        } elseif ($jiraPriorityName === 'medium') {
            $appPriority = 'medium';
        }

        $createdAt = isset($fields['created']) ? Carbon::parse($fields['created']) : Carbon::now();
        $updatedAt = isset($fields['updated']) ? Carbon::parse($fields['updated']) : Carbon::now();
        $deadline  = isset($fields['duedate']) && is_string($fields['duedate']) ? Carbon::parse($fields['duedate'])->toDateString() : null;

        return [
            'title'         => $fields['summary'] ?? ('Untitled Jira Issue - ' . ($jiraIssue['key'] ?? Str::random(4))),
            'desc'          => isset($fields['description']) ? $this->convertJiraDescriptionToHtml($fields['description']) : '',
            'priority'      => $appPriority,
            'pinned'        => ($fields['priority']['name'] ?? '') === 'Highest',
            'column'        => $appColumnName,
            'assignee_id'   => $assigneeId,
            'deadline'      => $deadline,
            'had_branch'    => null,
            'fid_board'     => $appBoardConfigId,
            'fid_user'      => $appUserId,
            'migrated_from' => 'jira:' . $jiraIssue['id'],
            'created_at'    => $createdAt->toDateTimeString(),
            'updated_at'    => $updatedAt->toDateTimeString(),
        ];
    }

    private function convertJiraDescriptionToHtml(mixed $description): string
    {
        if (is_string($description)) {
            return nl2br(htmlspecialchars($description));
        }

        if (!is_array($description) || !isset($description['type']) || $description['type'] !== 'doc' || !isset($description['content'])) {
            return '';
        }

        $text        = '';
        $extractText = function ($nodes) use (&$extractText, &$text): void {
            foreach ($nodes as $node) {
                if (!is_array($node)) {
                    continue;
                }

                if (($node['type'] ?? null) === 'text' && isset($node['text']) && is_string($node['text'])) {
                    $text .= $node['text'];
                }

                if (isset($node['content']) && is_array($node['content'])) {
                    $extractText($node['content']);
                }

            }
        };
        $extractText($description['content']);
        return nl2br(htmlspecialchars($text));
    }

    private function transformJiraCommentToCommentData(array $jiraComment, int $appPostId, int $appUserId): array
    {
        $authorName          = $jiraComment['author']['displayName'] ?? 'Unknown Jira User';
        $originalCommentBody = $jiraComment['body']                  ?? '';
        $commentText         = '';

        if (is_array($originalCommentBody) && ($originalCommentBody['type'] ?? null) === 'doc') {
            $commentText = $this->convertJiraDescriptionToHtml($originalCommentBody);
        } elseif (is_string($originalCommentBody)) {
            $commentText = nl2br(htmlspecialchars($originalCommentBody));
        }

        $appCommentContent = "Imported from Jira. Original comment by: {$authorName}\n\n" . $commentText;
        $createdAt         = isset($jiraComment['created']) ? Carbon::parse($jiraComment['created']) : Carbon::now();
        $updatedAt         = isset($jiraComment['updated']) ? Carbon::parse($jiraComment['updated']) : Carbon::now();

        return [
            'content'    => $appCommentContent,
            'fid_post'   => $appPostId,
            'fid_user'   => $appUserId,
            'created_at' => $createdAt->toDateTimeString(),
            'updated_at' => $updatedAt->toDateTimeString(),
        ];
    }

    private function transformJiraLinkToLinkedIssueData(
        array $jiraLink,
        int $currentAppPostId,
        array $createdPostIdsMap,
        int $appUserId,
        LinkedIssuesService $linkedIssuesService
    ): ?array {

        if (isset($jiraLink['outwardIssue']['id']) && is_string($jiraLink['outwardIssue']['id'])) {
            $linkDirectionTypeField   = 'outwardIssue';
            $jiraLinkDescriptionField = 'outward';
            $relatedJiraIssueId       = $jiraLink['outwardIssue']['id'];
        } elseif (isset($jiraLink['inwardIssue']['id']) && is_string($jiraLink['inwardIssue']['id'])) {

            $linkDirectionTypeField   = 'inwardIssue';
            $jiraLinkDescriptionField = 'inward';
            $relatedJiraIssueId       = $jiraLink['inwardIssue']['id'];

        } else {
            Log::debug('Jira link structure not recognized or missing target issue.', ['jira_link' => $jiraLink]);
            return null;
        }

        $appLinkTypeString = $this->mapJiraLinkTypeToAppLinkType(
            (string) ($jiraLink['type'][$jiraLinkDescriptionField] ?? '')
        );

        $relatedAppPostId = $createdPostIdsMap[$relatedJiraIssueId] ?? null;

        if (!$relatedAppPostId) {
            Log::debug('Could not find related app post.', [
                'related_jira_id'    => $relatedJiraIssueId,
                'mapped_app_post_id' => $relatedAppPostId,
            ]);
            return null;
        }

        $fidOriginPost    = ($linkDirectionTypeField === 'outwardIssue') ? $currentAppPostId : $relatedAppPostId;
        $fidRelatedPost   = ($linkDirectionTypeField === 'outwardIssue') ? $relatedAppPostId : $currentAppPostId;
        $finalAppLinkType = ($linkDirectionTypeField === 'outwardIssue') ? $appLinkTypeString : $linkedIssuesService->getReverseStatus($appLinkTypeString);

        return [
            'link_type'         => $finalAppLinkType,
            'fid_origin_post'   => $fidOriginPost,
            'fid_related_post'  => $fidRelatedPost,
            'fid_user'          => $appUserId,
        ];
    }

    private function mapJiraLinkTypeToAppLinkType(string $jiraLinkDescription): string
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
            'relates to'       => LinkTypeEnums::RELATES_TO->value,
        ];

        if (array_key_exists($jiraLinkDescription, $map)) {
            return $map[$jiraLinkDescription];
        }

        Log::warning("Unmapped Jira link type description: {$jiraLinkDescription}. Defaulting to 'relates to'.");
        return LinkTypeEnums::RELATES_TO->value;
    }
}
