<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('pr:process-next')->everyMinute();
Schedule::command('pr:refresh-pr-count')->weeklyOn(0, '00:00');