"use client"

import type React from "react"

interface HTMLRendererProps {
  html: string
}

const HTMLRenderer: React.FC<HTMLRendererProps> = ({ html }) => {
  const processedHTML = html
    .replace(/<h([1-6])(.*?)>(.*?)<\/h\1>/g, '<h$1$2 style="margin-bottom: 0.75rem; font-weight: 600; color: #E4E4E7;">$3</h$1>') // zinc-200
    .replace(/<p(.*?)>(.*?)<\/p>/g, '<p$1 style="margin-bottom: 0.75rem; color: #A1A1AA;">$2</p>') // zinc-400
    .replace(/<ul(.*?)>/g, '<ul$1 style="list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; color: #A1A1AA;">') // zinc-400
    .replace(/<ol(.*?)>/g, '<ol$1 style="list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; color: #A1A1AA;">') // zinc-400
    .replace(/<li(.*?)>(.*?)<\/li>/g, '<li$1 style="margin-bottom: 0.25rem;">$2</li>') // Inherits color
    .replace(/<img(.*?)>/g, '<img$1 style="max-width: 100%; height: auto; margin: 0.5rem 0; border-radius: 0.375rem;">') // Added rounded corners
    .replace(/<a(.*?)>(.*?)<\/a>/g, '<a$1 style="color: #60A5FA; text-decoration: underline;">$2</a>') // blue-400
    .replace(/<strong(.*?)>(.*?)<\/strong>/g, '<strong$1 style="color: #E4E4E7; font-weight: 600;">$2</strong>') // zinc-200

  return <div className="text-zinc-400" dangerouslySetInnerHTML={{ __html: processedHTML }} />
}

export default HTMLRenderer

