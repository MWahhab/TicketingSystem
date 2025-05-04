import type React from "react"
import { diffChars, diffLines, type Change } from "diff"

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
  const processText = (text: string): string => {
    let processed = text || ""
    if (stripTags) {
      processed = stripHtml(processed)
    }
    return processed
  }

  const processedOldText = processText(oldText)
  const processedNewText = processText(newText)

  const tokenizeText = (text: string): string => {
    return text.replace(/(\S)(\s+)(\S)/g, '$1$2\u200B$3');
  }

  const renderSimpleDiff = () => {
    const charDiff = diffChars(
        tokenizeText(processedOldText),
        tokenizeText(processedNewText)
    )

    const processedDiff = charDiff.map((part: Change) => ({
      ...part,
      value: part.value.replace(/\u200B/g, '')
    }));

    if (processedDiff.length < 200) {
      return (
          <div className="flex flex-wrap">
            {processedDiff.map((part: Change, index: number) => {
              if (!part.added && !part.removed && part.value.length > 100) {
                const start = part.value.substring(0, 40)
                const end = part.value.substring(part.value.length - 40)
                return (
                    <span key={index} className="text-zinc-500">
                      {start}
                      <span className="text-zinc-600"> [...] </span>
                      {end}
                    </span>
                )
              }

              const className = part.added
                  ? "bg-green-800/20 text-green-300 rounded px-1"
                  : part.removed
                      ? "bg-red-800/20 text-red-300 rounded px-1 line-through"
                      : "text-zinc-400"

              return (
                  <span key={index} className={className}>
                    {part.value}
                  </span>
              )
            })}
          </div>
      )
    }

    const lineDiff = diffLines(processedOldText, processedNewText)

    return (
        <div className="flex flex-col gap-1">
          {lineDiff.map((part: Change, index: number) => {
            if (!part.added && !part.removed) {
              const lines = part.value.split("\n")
              let displayText = part.value

              if (lines.length > 4) {
                const firstLines = lines.slice(0, 2).join("\n")
                const lastLines = lines.slice(-2).join("\n")
                displayText = `${firstLines}\n[...]\n${lastLines}`
              }

              return (
                  <span key={index} className="text-zinc-500">
                    {displayText}
                  </span>
              )
            }

            const className = part.added
                ? "bg-green-800/20 text-green-300 border-l-2 border-green-600 pl-2 rounded-r"
                : "bg-red-800/20 text-red-300 border-l-2 border-red-600 pl-2 rounded-r"

            return (
                <div key={index} className={className}>
                  {part.value}
                </div>
            )
          })}
        </div>
    )
  }

  const renderSideBySideDiff = () => {
    const charDiff = diffChars(
        tokenizeText(processedOldText),
        tokenizeText(processedNewText)
    )

    const processedDiff = charDiff.map((part: Change) => ({
      ...part,
      value: part.value.replace(/\u200B/g, '')
    }));

    const oldTextHighlighted = (
        <div className="whitespace-pre-wrap">
          {processedDiff.map((part: Change, index: number) => {
            if (part.removed) {
              return (
                  <span key={index} className="bg-red-800/20 text-red-300 rounded px-1 line-through">
                    {part.value}
                  </span>
              )
            } else if (!part.added) {
              return <span key={index} className="text-zinc-400">{part.value}</span>
            }
            return null
          })}
        </div>
    )

    const newTextHighlighted = (
        <div className="whitespace-pre-wrap">
          {processedDiff.map((part: Change, index: number) => {
            if (part.added) {
              return (
                  <span key={index} className="bg-green-800/20 text-green-300 rounded px-1">
                    {part.value}
                  </span>
              )
            } else if (!part.removed) {
              return <span key={index} className="text-zinc-400">{part.value}</span>
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
      <div className="text-sm text-zinc-400">
        {mode === "side-by-side" ? renderSideBySideDiff() : renderSimpleDiff()}
      </div>
  )
}

export default DiffViewer