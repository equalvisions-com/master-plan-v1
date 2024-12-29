'use client'

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import SearchBar from "./SearchBar"

export function SearchDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-9 px-0"
          aria-label="Search posts"
        >
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogTitle className="sr-only">
          Search Posts
        </DialogTitle>
        <SearchBar onSelect={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
} 