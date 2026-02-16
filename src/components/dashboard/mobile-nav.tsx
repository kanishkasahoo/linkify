"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: Route;
  icon?: React.ReactNode;
};

type MobileNavProps = {
  items: NavItem[];
  className?: string;
};

export function MobileNav({ items, className }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("md:hidden", className)}
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-0 left-0 h-[100dvh] w-[85vw] max-w-[320px] translate-x-0 translate-y-0 rounded-none border-r bg-card p-5 pr-10 data-[state=open]:slide-in-from-left-6 data-[state=closed]:slide-out-to-left-6 sm:w-[320px] sm:rounded-none">
        <DialogHeader>
          <DialogTitle>Navigation</DialogTitle>
        </DialogHeader>
        <nav className="mt-6 flex flex-col gap-2">
          {items.map((item) => (
            <DialogClose asChild key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                {item.icon}
                {item.label}
              </Link>
            </DialogClose>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
