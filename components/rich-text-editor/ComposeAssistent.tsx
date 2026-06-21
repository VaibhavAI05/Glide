import { Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { eventIteratorToStream } from "@orpc/server";
import { client } from "@/lib/orpc";
import { Skeleton } from "../ui/skeleton";
import ReactMarkdown from "react-markdown";


interface ComposeAssistentProps {
    content: string;
    onAccept?: (markdown: string) => void;
}

export function ComposeAssistent({content, onAccept} : ComposeAssistentProps) {
    const [open, setOpen] = useState(false)
    const contentRef = useRef(content)

    useEffect(() => {
        contentRef.current = content
    }, [content])

    const {messages, status, error, sendMessage, setMessages, stop, clearError} = useChat({
        id: `compose-assistent`,
        transport: {
            async sendMessages(options) {
                return eventIteratorToStream(
                    await client.ai.compose.generate(
                        {content: contentRef.current},
                        {signal: options.abortSignal}
                    )
                )
            },
            reconnectToStream() {
                throw new Error("Unsupported")
            }
        }
    })

    const lastAssistent = messages.findLast((m) => m.role === 'assistant')

    const composedText = lastAssistent?.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('\n\n') ?? "";

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);
        if(nextOpen) {
            const hasAssistantMessage = messages.some((m) => m.role === 'assistant')

            if(status !== "ready" || hasAssistantMessage) {
                return;
            }

            sendMessage({text: "Rewrite"})
        } else {
            stop();
            clearError();
            
            setMessages([]);
        }
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button type="button" size="sm" className="relative overflow-hidden rounded-full bg-gradient-to-t from-violet-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
                    <span className="flex items-center gap-1.5">
                        <Sparkles className="size-3.5" />
                        <span className="text-xs font-medium">Compose</span>
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[25rem] p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                        <span className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-1.5 px-4 gap-1.5">
                            <Sparkles className="size-3.5 text-white" />
                            <span className="text-sm font-medium">Compose Assistent</span>
                        </span>
                    </div>

                    {status === 'streaming' && (
                        <Button onClick={() => {
                            stop()
                        }} type="button" size="sm" variant="outline">
                            Stop
                        </Button>
                    )}
                </div>

                <div className="px-4 py-3 max-h-80 overflow-y-auto">
                    {error ? (
                        <div>
                            <p className="text-red-500">
                                {error.message}
                            </p>
                            <Button type="button" size="sm" onClick={() => {
                                clearError()
                                setMessages([])
                                sendMessage({text: 'Summarize Thread'})
                            }}>
                                Try Again
                            </Button>
                        </div>
                    ) : composedText ? (
                        
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{composedText}</ReactMarkdown>
                        </div>

                    ) : status === 'submitted' || status === 'streaming' ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">Click compose to generate</div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t px-3 py-2 bg-muted/30 cursor-pointer">
                    <Button type="submit" size='sm' variant="outline" onClick={() => {
                        stop()
                        clearError()
                        setMessages([])
                        setOpen(false)
                    }}>
                        Decline
                    </Button>
                    <Button type="submit" size='sm' onClick={() => {
                        if(!composedText) return;
                        onAccept?.(composedText);
                        stop()
                        clearError()
                        setMessages([])
                        setOpen(false)
                    }} disabled={!composedText}>
                        Accept
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}