/* ==========================================================================
   useResizable Hook - Panel Resizing Logic
   ========================================================================== */

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizableOptions {
    direction: 'horizontal' | 'vertical';
    initialSize: number;
    minSize: number;
    maxSize: number;
    onResize?: (size: number) => void;
}

interface UseResizableReturn {
    size: number;
    isResizing: boolean;
    startResizing: (e: React.MouseEvent) => void;
    resizerProps: {
        onMouseDown: (e: React.MouseEvent) => void;
        style: React.CSSProperties;
        className: string;
    };
}

export function useResizable({
    direction,
    initialSize,
    minSize,
    maxSize,
    onResize,
}: UseResizableOptions): UseResizableReturn {
    const [size, setSize] = useState(initialSize);
    const [isResizing, setIsResizing] = useState(false);
    const startPosRef = useRef(0);
    const startSizeRef = useRef(initialSize);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
        startSizeRef.current = size;
    }, [direction, size]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
        const diff = currentPos - startPosRef.current;

        // For horizontal, positive diff means growing
        // For vertical (terminal), we might want to invert
        const newSize = Math.min(maxSize, Math.max(minSize, startSizeRef.current + diff));

        setSize(newSize);
        onResize?.(newSize);
    }, [isResizing, direction, minSize, maxSize, onResize]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Prevent text selection during resize
            document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, handleMouseMove, handleMouseUp, direction]);

    const resizerProps = {
        onMouseDown: startResizing,
        style: {
            cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
        } as React.CSSProperties,
        className: `resizer resizer--${direction} ${isResizing ? 'resizer--active' : ''}`,
    };

    return {
        size,
        isResizing,
        startResizing,
        resizerProps,
    };
}
