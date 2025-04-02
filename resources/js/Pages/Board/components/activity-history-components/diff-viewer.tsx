import type React from "react"
import { diffWords } from "diff"

interface DiffViewerProps {
  oldText: string
  newText: string
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldText, newText }) => {
  // Parse HTML to extract structured content
  const parseHTML = (html: string) => {
    try {
      // Create a temporary DOM element
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, "text/html")

      // Extract elements
      const elements: { type: string; content: string }[] = []

      // Process heading elements
      const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6")
      headings.forEach((heading) => {
        elements.push({
          type: heading.tagName.toLowerCase(),
          content: heading.textContent || "",
        })
      })

      // Process paragraphs and list items
      const paragraphs = doc.querySelectorAll("p, li")
      paragraphs.forEach((p) => {
        elements.push({
          type: p.tagName.toLowerCase(),
          content: p.textContent || "",
        })
      })

      return elements
    } catch (error) {
      console.error("Error parsing HTML:", error)
      return [{ type: "text", content: html }]
    }
  }

  // Extract structured content from both HTML strings
  const oldElements = parseHTML(oldText)
  const newElements = parseHTML(newText)

  // Compare elements by type and find differences
  const renderDiff = () => {
    const results: JSX.Element[] = []

    // First, compare headings (they're usually what changes)
    const oldHeadings = oldElements.filter((el) => el.type.startsWith("h"))
    const newHeadings = newElements.filter((el) => el.type.startsWith("h"))

    if (oldHeadings.length > 0 || newHeadings.length > 0) {
      results.push(
          <div key="headings" className="mb-4">
            <h4 className="text-xs font-medium text-zinc-400 mb-2">Headings</h4>
            {oldHeadings.length > 0 && newHeadings.length > 0 ? (
                // Compare heading content
                renderTextDiff(oldHeadings[0].content, newHeadings[0].content)
            ) : (
                // One side has a heading, the other doesn't
                <div className="flex flex-col gap-2">
                  {oldHeadings.length > 0 && (
                      <div className="bg-red-900/30 border-l-2 border-red-500 py-1 px-2">{oldHeadings[0].content}</div>
                  )}
                  {newHeadings.length > 0 && (
                      <div className="bg-green-900/30 border-l-2 border-green-500 py-1 px-2">{newHeadings[0].content}</div>
                  )}
                </div>
            )}
          </div>,
      )
    }

    // Compare paragraphs and list items
    const oldContent = oldElements.filter((el) => !el.type.startsWith("h"))
    const newContent = newElements.filter((el) => !el.type.startsWith("h"))

    // Only show content diff if there are actual differences
    let contentDiffers = false

    if (oldContent.length !== newContent.length) {
      contentDiffers = true
    } else {
      for (let i = 0; i < oldContent.length; i++) {
        if (oldContent[i].content !== newContent[i].content) {
          contentDiffers = true
          break
        }
      }
    }

    if (contentDiffers) {
      results.push(
          <div key="content" className="mt-4">
            <h4 className="text-xs font-medium text-zinc-400 mb-2">Content</h4>
            <div className="flex flex-col gap-2">
              {oldContent.map((el, i) => {
                const newEl = newContent[i]
                if (!newEl || el.content !== newEl.content) {
                  return (
                      <div key={`old-${i}`} className="bg-red-900/30 border-l-2 border-red-500 py-1 px-2">
                        {el.content}
                      </div>
                  )
                }
                return null
              })}

              {newContent.map((el, i) => {
                const oldEl = oldContent[i]
                if (!oldEl || el.content !== oldEl.content) {
                  return (
                      <div key={`new-${i}`} className="bg-green-900/30 border-l-2 border-green-500 py-1 px-2">
                        {el.content}
                      </div>
                  )
                }
                return null
              })}
            </div>
          </div>,
      )
    }

    return results
  }

  // Render word-by-word diff for text
  const renderTextDiff = (oldText: string, newText: string) => {
    const diff = diffWords(oldText, newText)

    return (
        <div className="flex flex-wrap">
          {diff.map((part, index) => {
            const className = part.added
                ? "bg-green-900/30 border-green-500 border-b"
                : part.removed
                    ? "bg-red-900/30 border-red-500 border-b"
                    : ""

            return (
                <span key={index} className={className}>
              {part.value}
            </span>
            )
          })}
        </div>
    )
  }

  return <div className="text-sm">{renderDiff()}</div>
}

export default DiffViewer

