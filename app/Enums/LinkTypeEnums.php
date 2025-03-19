<?php

namespace app\Enums;

enum LinkTypeEnums: string
{
    case RELATES_TO    = 'relates to';
    case CAUSED_BY     = 'caused by';
    case CAUSES        = 'causes';
    case BLOCKED_BY    = 'blocked by';
    case BLOCKS        = 'blocks';
    case DUPLICATED_BY = 'duplicated by';
    case DUPLICATES    = 'duplicates';
}
