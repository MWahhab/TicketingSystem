"use client"

import type React from "react"
import HTMLRenderer from "./html-renderer"
import DiffViewer from "./diff-viewer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PremiumOverlay from "./premium-overlay"

interface DescriptionChangePopupProps {
  oldContent: string
  newContent: string
  subscriptionTier?: string
}

const DescriptionChangePopup: React.FC<DescriptionChangePopupProps> = ({
                                                                         oldContent,
                                                                         newContent,
                                                                         subscriptionTier = "standard",
                                                                       }) => {
  const isNotStandard = subscriptionTier !== "standard"

  const dummyOldContent = `<h2>Sample Previous Content</h2>
<p>This is a placeholder for premium content. Upgrade to access the full feature.</p>
<ul>
  <li>Premium users can see actual content changes</li>
  <li>Premium users can compare side by side</li>
  <li>Premium users can view detailed diffs</li>
</ul>`

  const dummyNewContent = `<h2>Sample Current Content</h2>
<p>This is a placeholder for premium content. Upgrade to access the full feature.</p>
<ul>
  <li>See what was removed and added</li>
  <li>Track all changes in your content</li>
  <li>Make better decisions with complete information</li>
</ul>`

  const displayOldContent = isNotStandard ? oldContent : dummyOldContent
  const displayNewContent = isNotStandard ? newContent : dummyNewContent

  return (
      <div className="p-4 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 rounded-lg w-full shadow-md">
        <h3 className="text-sm font-medium text-zinc-100 mb-3">Description Change</h3>

        <Tabs defaultValue="changes" className="w-full">
          <TabsList className="mb-3 bg-zinc-800 border border-zinc-700 p-1 h-auto rounded-md">
            <TabsTrigger value="changes" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 rounded-sm px-3 py-1 text-sm">Changes</TabsTrigger>
            <TabsTrigger value="side-by-side" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 rounded-sm px-3 py-1 text-sm">Side by Side</TabsTrigger>
          </TabsList>

          <div className="min-h-[300px] relative">
            <TabsContent value="changes" className="mt-0">
              <div className="p-4 bg-zinc-800 rounded border border-zinc-700 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                <DiffViewer oldText={displayOldContent} newText={displayNewContent} />
              </div>
            </TabsContent>

            <TabsContent value="side-by-side" className="mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-2">Previous</h4>
                  <div className="p-4 bg-zinc-800 rounded border border-zinc-700 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                    <HTMLRenderer html={displayOldContent} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-2">Current</h4>
                  <div className="p-4 bg-zinc-800 rounded border border-zinc-700 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                    <HTMLRenderer html={displayNewContent} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <PremiumOverlay show={!isNotStandard} />
          </div>
        </Tabs>
      </div>
  )
}

export default DescriptionChangePopup

