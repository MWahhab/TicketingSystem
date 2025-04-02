"use client"

import type React from "react"

interface HTMLRendererProps {
  html: string
}

const HTMLRenderer: React.FC<HTMLRendererProps> = ({ html }) => {
  // Process the HTML to apply proper styling
  const processedHTML = html
    // Add styling to headings
    .replace(/<h([1-6])(.*?)>(.*?)<\/h\1>/g, '<h$1$2 style="margin-bottom: 0.75rem; font-weight: 600;">$3</h$1>')
    // Add styling to paragraphs
    .replace(/<p(.*?)>(.*?)<\/p>/g, '<p$1 style="margin-bottom: 0.75rem;">$2</p>')
    // Add styling to lists
    .replace(/<ul(.*?)>/g, '<ul$1 style="list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem;">')
    .replace(/<ol(.*?)>/g, '<ol$1 style="list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem;">')
    .replace(/<li(.*?)>(.*?)<\/li>/g, '<li$1 style="margin-bottom: 0.25rem;">$2</li>')
    // Style images
    .replace(/<img(.*?)>/g, '<img$1 style="max-width: 100%; height: auto; margin: 0.5rem 0;">')
    // Style links
    .replace(/<a(.*?)>(.*?)<\/a>/g, '<a$1 style="color: #3b82f6; text-decoration: underline;">$2</a>')

  return <div className="html-content" dangerouslySetInnerHTML={{ __html: processedHTML }} />
}

export default HTMLRenderer

