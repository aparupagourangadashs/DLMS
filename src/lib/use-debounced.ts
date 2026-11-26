"use client";

import { useEffect, useState } from "react";

/** The value once it has stopped changing for `ms`, so typing does not fire a request for every key. */
export function useDebounced<T>(value: T, ms: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(timer);
    }, [value, ms]);
    return debounced;
}
