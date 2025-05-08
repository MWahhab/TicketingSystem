<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('pr:process-next')->everyMinute();
Schedule::command('pr:refresh-pr-count')->weeklyOn(0, '00:00');
Schedule::command('backup:clean')->dailyAt('01:00');
Schedule::command('backup:run')->dailyAt('01:30');
