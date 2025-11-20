<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProxyConflictHandler
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->server->get('HTTP_X_FORWARDED_PORT') === '80' && $request->server->has('X_FORWARDED_PORT')) {

            $request->server->set('HTTP_X_FORWARDED_PORT', $request->server->get('X_FORWARDED_PORT'));
        }

        return $next($request);
    }
}
