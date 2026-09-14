import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva,type VariantProps} from "class-variance-authority";
import {clsx} from "clsx";
import {twMerge} from "tailwind-merge";
const variants=cva("inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 disabled:pointer-events-none disabled:opacity-50",{variants:{variant:{default:"bg-zinc-950 text-white hover:bg-zinc-800",outline:"border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"},size:{default:"h-11 px-5",sm:"h-9 px-3"}},defaultVariants:{variant:"default",size:"default"}});
export function Button({className,variant,size,asChild=false,...props}:React.ComponentProps<"button">&VariantProps<typeof variants>&{asChild?:boolean}){const Comp=asChild?Slot:"button";return <Comp className={twMerge(clsx(variants({variant,size}),className))} {...props}/>;}
