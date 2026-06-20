import { Button } from "@/components/ui/button";
import { ChevronDown, MessageSquare, X } from "lucide-react";
import Image from "next/image";
import { ThreadReply } from "./ThreadReply";
import { ThreadReplyForm } from "./ThreadReplyForm";
import { useThread } from "@/providers/ThreadProvider";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { SafeContent } from "@/components/rich-text-editor/SafeContent";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs";
import { ThreadSidebarSkeleton } from "./ThreadSidebarSkeleton";
import { useEffect, useRef, useState } from "react";

interface ThreadSidebarProps {
    user: KindeUser<Record<string, unknown>>
}

export function ThreadSidebar({user}: ThreadSidebarProps){
    const {selectedThreadId, closeThread} = useThread()
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const [isAtBottom, setIsAtBottom] =  useState(false);
    const lastMessageCountRef = useRef(0)
    const { data, isLoading } = useQuery(
        orpc.message.thread.list.queryOptions({
            input: {
                messageId: selectedThreadId!,
            },
            enabled: Boolean(selectedThreadId),
        })
    )

    const messageCount = data?.messages.length ?? 0

    const isNearBottom = (el: HTMLDivElement) => el.scrollHeight - el.scrollTop - el.clientHeight <= 80

    const handleScroll = () => {
        const el = scrollRef.current;
        if(!el) return;
        
        setIsAtBottom(isNearBottom(el));
    }

    useEffect(() => {
        if(messageCount === 0) return;
        const prevMessageCount = lastMessageCountRef.current;
        const el = scrollRef.current;

        if(prevMessageCount > 0 && messageCount !== prevMessageCount) {
            if(el && isNearBottom(el)) {
                requestAnimationFrame(() => {
                    bottomRef.current?.scrollIntoView({
                        block: "end",
                        behavior: "smooth",
                    })
                })
                setIsAtBottom(true);
            }
        }

        lastMessageCountRef.current = messageCount;
    }, [messageCount])

    //Keep view pinned to the bottom on late content growth (eg. images )
    useEffect(() => {
        const el = scrollRef.current;
        if(!el) return;

        const scrollToBottomIfNedded = () => {
            if(isAtBottom){
                requestAnimationFrame(() => {
                    bottomRef.current?.scrollIntoView({block: "end"});
                });
            }
        };
    
        const onImageLoad = (e: Event) => {
            if (e.target instanceof HTMLImageElement) {
                scrollToBottomIfNedded();
            }
        };
    
        el.addEventListener("load", onImageLoad, true);
    
        //ResizeObserver watches for size changes in the container
        const resizeObserver = new ResizeObserver(() => {
            scrollToBottomIfNedded();
        });
    
        resizeObserver.observe(el);
    
        //This watches for the DOM changes like images loading, content updates, etc.
        const mutationObserver = new MutationObserver(() => {
            scrollToBottomIfNedded();
        });
    
        mutationObserver.observe(el, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
    
        return () => {
            resizeObserver.disconnect();
            el.removeEventListener("load", onImageLoad, true);
            mutationObserver.disconnect();
        }
    }, [ isAtBottom]);

    const scrollToBottom = () => {
        const el = scrollRef.current;
        if(!el) return;
        // el.scrollTop = el.scrollHeight;
        bottomRef.current?.scrollIntoView({block: "end", behavior: "smooth"});
        // setNewMessages(false);
        setIsAtBottom(true);
    }

    if(isLoading) {
        return <ThreadSidebarSkeleton />
    }

    return (
        <div className="w-[30rem] border-l flex flex-col h-full">
            {/* Header */}
            <div className="border-b h-14 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="size-4" />
                    <span>Thread</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={closeThread} variant="outline" size="icon">
                        <X className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto relative">
                <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto">
                    {data && (
                        <>
                            <div className="p-4 border-b bg-muted/20">
                                <div className="flex space-x-3">
                                    <Image src={data.parent.authorAvatar} alt="author Image" width={32} height={32} className="size-8 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium text-sm">{data.parent.authorName}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Intl.DateTimeFormat('en-IN', {
                                                    hour: 'numeric',
                                                    minute: 'numeric',
                                                    hour12: true,
                                                    month: 'short',
                                                    day: 'numeric',
                                                }).format(data.parent.createdAt)}
                                            </span>
                                        </div>
                                        <SafeContent className="text-sm break-words prose dark:prose-invert" content={JSON.parse(data.parent.content)} />
                                    </div>
                                </div>
                            </div>

                            {/* Thread Replies */}
                            <div className="p-2">
                                <p className="text-xs text-muted-foreground mb-3 px-2">{data.messages.length} replies</p>

                                <div className="space-y-1">
                                    {data.messages.map((reply) => (
                                        <ThreadReply key={reply.id} message={reply} />
                                    ))}
                                </div>
                            </div>

                            <div ref={bottomRef}></div>
                        </>
                    )}
                </div>

                {/* Scroll to bottom button */}
                {!isAtBottom && (
                    <Button type="button" size="sm" onClick={scrollToBottom} className="absolute bottom-4 right-5 z-20 size-10 rounded-full hover:shadow-xl transition-all duration-200">
                        <ChevronDown className="size-4" />
                    </Button>
                )}
            </div>

            {/* Thread reply form */}
            <div className="border-t p-4">
                <ThreadReplyForm user={user} threadId={selectedThreadId!} />
            </div>
        </div>
    )
}