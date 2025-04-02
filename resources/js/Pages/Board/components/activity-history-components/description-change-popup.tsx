"use client"

import type React from "react"
import HTMLRenderer from "./html-renderer"
import DiffViewer from "./diff-viewer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DescriptionChangePopupProps {
  oldContent: string
  newContent: string
}

const DescriptionChangePopup: React.FC<DescriptionChangePopupProps> = ({ oldContent, newContent }) => {
  return (
      <div className="p-4 bg-zinc-800 rounded-md w-full">
        <h3 className="text-sm font-medium text-zinc-100 mb-3">Description Change</h3>

        <Tabs defaultValue="changes" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
          </TabsList>

          {/* Fixed height container to prevent shifting */}
          <div className="min-h-[300px]">
            <TabsContent value="changes" className="mt-0">
              <div className="p-4 bg-zinc-700 rounded border border-zinc-600 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                <DiffViewer oldText={oldContent} newText={newContent} />
              </div>
            </TabsContent>

            <TabsContent value="side-by-side" className="mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-2">Previous</h4>
                  <div className="p-4 bg-zinc-700 rounded border border-zinc-600 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                    <HTMLRenderer html={oldContent} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-2">Current</h4>
                  <div className="p-4 bg-zinc-700 rounded border border-zinc-600 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                    <HTMLRenderer html={newContent} />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
  )
}

export default DescriptionChangePopup

