"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  motion,
  MotionValue,
  useMotionValue,
} from "framer-motion";
import React from "react";
import { cn } from "@/lib/utils";

interface DockIconProps {
  className?: string;
  mouseX?: MotionValue<number>;
  size?: number;
  magnification?: number;
  distance?: number;
  children?: React.ReactNode;
}

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string;
  iconSize?: number;
  iconMagnification?: number;
  iconDistance?: number;
  direction?: "top" | "middle" | "bottom";
  children: React.ReactNode;
}

const DEFAULT_SIZE = 40;
const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;

const dockVariants = cva(
  "supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 flex h-[58px] w-full items-center justify-center gap-2 rounded-t-2xl border-t p-2 backdrop-blur-md",
);

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      iconSize = DEFAULT_SIZE,
      iconMagnification = DEFAULT_MAGNIFICATION,
      iconDistance = DEFAULT_DISTANCE,
      direction = "middle",
      ...props
    },
    ref,
  ) => {
    const mouseX = useMotionValue(Infinity);

    const renderChildren = () => {
      return React.Children.map(children, (child) => {
        if (React.isValidElement<DockIconProps>(child) && child.type === DockIcon) {
          return React.cloneElement(child, {
            ...child.props,
            mouseX: mouseX,
            size: iconSize,
            magnification: iconMagnification,
            distance: iconDistance,
          });
        }
        return child;
      });
    };

    return (
      <motion.div
        ref={ref}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        {...props}
        className={cn(dockVariants({ className }), {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        })}
      >
        {renderChildren()}
      </motion.div>
    );
  },
);

Dock.displayName = "Dock";

const DockIcon = React.forwardRef<HTMLDivElement, DockIconProps>(
  ({ children, className, mouseX, size = DEFAULT_SIZE, magnification = DEFAULT_MAGNIFICATION, distance = DEFAULT_DISTANCE }, ref) => {
    const padding = Math.max(6, size * 0.2);
    
    return (
      <motion.div
        ref={ref}
        style={{ 
          width: size,
          height: size,
          padding
        }}
        className={cn(
          "flex aspect-square cursor-pointer items-center justify-center rounded-full",
          className
        )}
      >
        {children}
      </motion.div>
    );
  }
);

DockIcon.displayName = "DockIcon";

export { Dock, DockIcon };
