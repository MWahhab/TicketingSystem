<?php

namespace App\Enums;

enum AIAgentEnums: string
{
    case CHAT_GPT      = 'chat_gpt';
    case CLAUDE        = 'claude';
    case GEMINI_FREE   = 'gemini_free';
    case GEMINI_PRO    = 'gemini_pro';
    case DEEPSEEK_R1   = 'deepseek_r1';
    case FREE_CHAT_GPT = 'free_chat_gpt'; // forced for free users - teams under 5
    case CUSTOM        = 'custom'; // we offer to implement clients AI, we charge for this service
}
