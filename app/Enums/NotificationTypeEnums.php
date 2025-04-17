<?php

namespace app\Enums;

enum NotificationTypeEnums: string
{
    case COMMENT      = 'comment';
    case POST         = 'post';
    case BOARD        = 'board';
    case LINKED_ISSUE = 'linked_issue';
    case BRANCH       = 'branch';
}
