<?php

namespace app\Enums;

enum NotificationTypeEnums: string
{
    case COMMENT = 'comment';
    case POST    = 'post';
    case BOARD   = 'board';
}
