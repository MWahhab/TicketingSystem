<?php

namespace App\Http\Controllers\OAuth;

use App\DataTransferObjects\JiraCloudResourceDTO;
use App\DataTransferObjects\JiraOAuthCallbackInputDTO;
use App\DataTransferObjects\JiraTokenResponseDTO;
use App\Http\Controllers\Controller;
use App\Services\JiraImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class JiraOAuthController extends Controller
{
    public function __construct(private readonly JiraImportService $jiraImportService)
    {
    }

    public function handle(Request $request): Response
    {
        try {
            $inputDTO = JiraOAuthCallbackInputDTO::fromRequest($request);
            $code     = $inputDTO->code;
        } catch (ValidationException $e) {
            $errorMessage = 'Invalid request. Please check the details and try again.';
            $firstError   = collect($e->errors())->flatten()->first();

            if ($firstError) {
                $errorMessage = $firstError;
            }

            return response($errorMessage, 400);
        }

        $tokenHttpResponse = Http::asForm()->post('https://auth.atlassian.com/oauth/token', [
            'grant_type'    => 'authorization_code',
            'client_id'     => config('services.jira.client_id'),
            'client_secret' => config('services.jira.client_secret'),
            'code'          => $code,
            'redirect_uri'  => config('services.jira.redirect_uri'),
        ]);

        if (!$tokenHttpResponse->successful()) {
            Log::error('Jira OAuth token request failed.', [
                'status' => $tokenHttpResponse->status(),
                'body'   => $tokenHttpResponse->body(),
            ]);
            return response('Failed to obtain Jira token. Please try again or contact support.', 500);
        }

        $tokenDTO = JiraTokenResponseDTO::fromApiResponse($tokenHttpResponse->json() ?? []);
        if (!$tokenDTO instanceof \App\DataTransferObjects\JiraTokenResponseDTO) {
            return response('Received an invalid token response from Jira. Please try again.', 500);
        }

        $resourcesHttpResponse = Http::withToken($tokenDTO->accessToken)
            ->get('https://api.atlassian.com/oauth/token/accessible-resources');

        if (!$resourcesHttpResponse->successful()) {
            Log::error('Jira accessible resources request failed.', [
                'status'              => $resourcesHttpResponse->status(),
                'body'                => $resourcesHttpResponse->body(),
                'access_token_prefix' => substr($tokenDTO->accessToken, 0, 10),
            ]);
            return response('Failed to fetch necessary Jira resources. Please ensure the integration has permissions.', 500);
        }

        $cloudResourceDTO = JiraCloudResourceDTO::fromApiResponse($resourcesHttpResponse->json() ?? []);
        if (!$cloudResourceDTO instanceof \App\DataTransferObjects\JiraCloudResourceDTO) {
            return response('Could not determine the Jira site from the resources response. Please try again.', 500);
        }

        $this->jiraImportService->storeJiraSession(
            $tokenDTO->accessToken,
            $cloudResourceDTO->cloudId,
            $tokenDTO->refreshToken,
            $tokenDTO->expiresIn
        );

        return Inertia::location('/dashboard?jira=connected');
    }
}
