"use client"

import { motion, type PanInfo } from "framer-motion"
import { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type React from "react" // Added import for React

interface TabHeaderProps {
  onTabChange?: (value: string) => void
}

interface TabContentProps {
  children: React.ReactNode
  active: boolean
  direction: number
}

function TabContent({ children, active, direction }: TabContentProps) {
  return (
    <motion.div
      initial={{ x: direction > 0 ? "100%" : "-100%", opacity: 0 }}
      animate={{ x: active ? 0 : direction > 0 ? "-100%" : "100%", opacity: active ? 1 : 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="absolute top-0 left-0 w-full h-full"
    >
      {children}
    </motion.div>
  )
}

export function TabHeader({ onTabChange }: TabHeaderProps) {
  const [activeTab, setActiveTab] = useState("for-you")
  const [[page, direction], setPage] = useState([0, 0])
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    const swipeThreshold = 50
    if (Math.abs(info.offset.x) > swipeThreshold) {
      const newDirection = info.offset.x > 0 ? -1 : 1
      const newPage = page + newDirection
      if (newPage >= -1 && newPage <= 0) {
        setPage([newPage, newDirection])
        setActiveTab(newPage === 0 ? "for-you" : "following")
      }
    }
  }

  useEffect(() => {
    onTabChange?.(activeTab)
  }, [activeTab, onTabChange])

  const handleTabChange = (value: string) => {
    const newPage = value === "for-you" ? 0 : -1
    const newDirection = newPage > page ? -1 : 1
    setPage([newPage, newDirection])
    setActiveTab(value)
  }

  return (
    <div className="w-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full h-14 bg-background p-0">
          <TabsTrigger
            value="for-you"
            className="relative w-full h-full data-[state=active]:bg-background data-[state=active]:shadow-none"
          >
            <span className="text-lg font-semibold">For you</span>
            {activeTab === "for-you" && (
              <motion.div
                layoutId="indicator"
                className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="following"
            className="relative w-full h-full data-[state=active]:bg-background data-[state=active]:shadow-none"
          >
            <span className="text-lg font-semibold">Following</span>
            {activeTab === "following" && (
              <motion.div
                layoutId="indicator"
                className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        className="relative w-full h-full touch-pan-x"
      >
        <div className="relative w-full h-[calc(100vh-3.5rem)]">
          <TabContent active={activeTab === "for-you"} direction={direction}>
            <div className="p-4">
              <div className="space-y-4">
                <div className="h-24 rounded-lg bg-muted animate-pulse" />
                <div className="h-24 rounded-lg bg-muted animate-pulse" />
                <div className="h-24 rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
          </TabContent>
          <TabContent active={activeTab === "following"} direction={direction}>
            <div className="p-4">
              <div className="space-y-4">
                <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
                <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
                <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
              </div>
            </div>
          </TabContent>
        </div>
      </motion.div>
    </div>
  )
}

