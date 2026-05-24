"use client";

import { useCallback, useMemo, useState } from "react";

export function useAttachmentUpload() {
    const [isOpen, setOpen] = useState(false);
    const [stagedUrl, setStagedUrl] = useState<null | string>(null);
    const [isUploading, setUploading] = useState(false);

    const onUploaded = useCallback((url: string) => {
        setStagedUrl(url);
        setUploading(false);
        setOpen(false);
    }, []);

    const clear = useCallback(() => {
        setStagedUrl(null);
        setUploading(false);
    }, [])

    return useMemo(() => ({
        isOpen,
        setOpen,
        onUploaded,
        stagedUrl,
        isUploading,
        clear,
    }),[isOpen, setOpen, onUploaded, stagedUrl, isUploading, clear])
}

export type useAttachmentUploadType = ReturnType<typeof useAttachmentUpload>;