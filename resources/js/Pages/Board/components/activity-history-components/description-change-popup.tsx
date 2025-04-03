"use client"

import type React from "react"
import HTMLRenderer from "./html-renderer"
import DiffViewer from "./diff-viewer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LockIcon } from "lucide-react"

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
      <div className="p-4 bg-zinc-800 rounded-md w-full">
        <h3 className="text-sm font-medium text-zinc-100 mb-3">Description Change</h3>

        <Tabs defaultValue="changes" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
          </TabsList>

          <div className="min-h-[300px] relative">
            <TabsContent value="changes" className="mt-0">
              <div className="p-4 bg-zinc-700 rounded border border-zinc-600 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                <DiffViewer oldText={displayOldContent} newText={displayNewContent} />
              </div>
            </TabsContent>

            <TabsContent value="side-by-side" className="mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-2">Previous</h4>
                  <div className="p-4 bg-zinc-700 rounded border border-zinc-600 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                    <HTMLRenderer html={displayOldContent} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-2">Current</h4>
                  <div className="p-4 bg-zinc-700 rounded border border-zinc-600 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                    <HTMLRenderer html={displayNewContent} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {!isNotStandard && (
                <div className="absolute inset-0 backdrop-blur-md bg-zinc-900/50 flex flex-col items-center justify-center z-10 rounded">
                  <LockIcon className="h-10 w-10 text-zinc-400 mb-3" />
                  <p className="text-zinc-200 font-medium text-center px-6">
                    This feature is available only for premium users
                  </p>
                </div>
            )}
          </div>
        </Tabs>
      </div>
  )
}

export default DescriptionChangePopup

