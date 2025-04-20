import type React from "react"
import { diffChars, diffLines } from "diff"

// Helper function to strip HTML tags while preserving word boundaries
const stripHtml = (html: string): string => {
  if (!html) return ""
  return html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/?[^>]+(>|$)/g, " ")
      .replace(/\s+/g, " ")
      .trim()
}

interface DiffViewerProps {
  oldText: string
  newText: string
  mode?: "inline" | "side-by-side"
  stripTags?: boolean
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldText, newText, mode = "inline", stripTags = true }) => {
  // Process text based on stripTags option
  const processText = (text: string): string => {
    let processed = text || ""
    if (stripTags) {
      processed = stripHtml(processed)
    }
    return processed
  }

  const processedOldText = processText(oldText)
  const processedNewText = processText(newText)

  // Pre-tokenize the text to ensure word boundaries are preserved
  const tokenizeText = (text: string): string => {
    // Add a special non-printing character after each word boundary
    // This ensures spaces are properly preserved in the diff
    return text.replace(/(\S)(\s+)(\S)/g, '$1$2\u200B$3');
  }

  // Simple text-only diff that focuses on showing only what changed
  const renderSimpleDiff = () => {
    // Use pre-tokenized character-level diff
    const charDiff = diffChars(
        tokenizeText(processedOldText),
        tokenizeText(processedNewText)
    )

    // Post-process to remove the special character
    const processedDiff = charDiff.map(part => ({
      ...part,
      value: part.value.replace(/\u200B/g, '')
    }));

    // If the diff is small enough, show character-level changes
    if (processedDiff.length < 200) {
      return (
          <div className="flex flex-wrap">
            {processedDiff.map((part, index) => {
              // Skip rendering large unchanged parts to focus on changes
              if (!part.added && !part.removed && part.value.length > 100) {
                const start = part.value.substring(0, 40)
                const end = part.value.substring(part.value.length - 40)
                return (
                    <span key={index} className="text-gray-400">
                      {start}
                      <span className="text-gray-500"> [...] </span>
                      {end}
                    </span>
                )
              }

              // Only apply styling to added or removed parts
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

    // For larger diffs, use line-by-line comparison
    const lineDiff = diffLines(processedOldText, processedNewText)

    return (
        <div className="flex flex-col gap-1">
          {lineDiff.map((part, index) => {
            if (!part.added && !part.removed) {
              // For unchanged parts, only show context around changes
              const lines = part.value.split("\n")
              let displayText = part.value

              if (lines.length > 4) {
                // Show only first and last two lines for context
                const firstLines = lines.slice(0, 2).join("\n")
                const lastLines = lines.slice(-2).join("\n")
                displayText = `${firstLines}\n[...]\n${lastLines}`
              }

              return (
                  <span key={index} className="text-gray-400">
                    {displayText}
                  </span>
              )
            }

            const className = part.added
                ? "bg-green-900/30 border-l-2 border-green-500 pl-2"
                : "bg-red-900/30 border-l-2 border-red-500 pl-2"

            return (
                <div key={index} className={className}>
                  {part.value}
                </div>
            )
          })}
        </div>
    )
  }

  // Side by side diff view with improved highlighting
  const renderSideBySideDiff = () => {
    // Use pre-tokenized character-level diff
    const charDiff = diffChars(
        tokenizeText(processedOldText),
        tokenizeText(processedNewText)
    )

    // Post-process to remove the special character
    const processedDiff = charDiff.map(part => ({
      ...part,
      value: part.value.replace(/\u200B/g, '')
    }));

    // Extract the left side (old text) with highlighting
    const oldTextHighlighted = (
        <div className="whitespace-pre-wrap">
          {processedDiff.map((part, index) => {
            if (part.removed) {
              return (
                  <span key={index} className="bg-red-900/30 border-red-500 border-b">
                    {part.value}
                  </span>
              )
            } else if (!part.added) {
              return <span key={index}>{part.value}</span>
            }
            return null
          })}
        </div>
    )

    // Extract the right side (new text) with highlighting
    const newTextHighlighted = (
        <div className="whitespace-pre-wrap">
          {processedDiff.map((part, index) => {
            if (part.added) {
              return (
                  <span key={index} className="bg-green-900/30 border-green-500 border-b">
                    {part.value}
                  </span>
              )
            } else if (!part.removed) {
              return <span key={index}>{part.value}</span>
            }
            return null
          })}
        </div>
    )

    return (
        <div className="grid grid-cols-2 gap-4">
          <div className="border-r pr-4">
            <h4 className="text-xs font-medium text-zinc-400 mb-2">Previous</h4>
            {oldTextHighlighted}
          </div>
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-2">Current</h4>
            {newTextHighlighted}
          </div>
        </div>
    )
  }

  return (
      <div className="text-sm">
        {mode === "side-by-side" ? renderSideBySideDiff() : renderSimpleDiff()}
      </div>
  )
}

export default DiffViewer