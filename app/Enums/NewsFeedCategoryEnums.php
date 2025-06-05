<?php

namespace App\Enums;

enum NewsFeedCategoryEnums: string
{
    case WORKED_ON           = 'worked_on';
    case TAGGED_IN           = 'tagged_in';
    case COMMENTED           = 'commented_on';
    case CREATED             = 'created';
    case GENERATED_BRANCHES  = 'generated_branches';
    case DONE_THIS_WEEK      = 'done_this_week';
    case UPCOMING_DEADLINES  = 'upcoming_deadlines';
    case BLOCKED             = 'blocked_issues';
    case ACTIVITY_ON         = 'activity_on';
}
