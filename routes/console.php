<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('pr:process-next')->everyMinute();