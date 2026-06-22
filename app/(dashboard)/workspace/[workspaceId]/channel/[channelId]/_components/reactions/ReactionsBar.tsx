import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmojiReaction } from "./EmojiReaction";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { GroupedReactionSchmeaType } from "@/app/schemas/message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { MessageListItem } from "@/lib/types";
import { useChannelRealtime } from "@/providers/ChannelRealtimeProvider";

type ThreadContext = {type:'thread'; threadId: string}
type ListContext = {type: 'list', channelId: string}

interface ReactionsBarProps {
    messageId: string;
    reactions: GroupedReactionSchmeaType[];
    context?: ThreadContext | ListContext 
}

type MessagePage = {
    items: MessageListItem[],
    nextCursor?: string,
}

type InfiniteReplies = InfiniteData<MessagePage>

export function ReactionsBar({messageId, reactions, context}: ReactionsBarProps) {
    const {channelId} = useParams<{channelId: string}>();
    const queryClient = useQueryClient();
    const { send } =useChannelRealtime()

    const toggleMutation = useMutation(
        orpc.message.reaction.toggle.mutationOptions({
            onMutate: async (vars: {messageId: string; emoji: string}) => {
                const bump = (rxns: GroupedReactionSchmeaType[]) => {
                    const found = rxns.find((r) => r.emoji === vars.emoji)

                    if(found) {
                        const dec = found.count - 1;
                        return dec <= 0 ? rxns.filter((r) => r.emoji !== found.emoji) : rxns.map((r) => r.emoji === found.emoji ?  {...r, count: dec, reactedByMe: false} : r)
                    }

                    return [...rxns, {emoji: vars.emoji, count: 1, reactedByMe: true}]
                }
                const isThread = context && context.type ==='thread'
                if(isThread) {
                    const listOptions = orpc.message.thread.list.queryOptions({
                        input: {
                            messageId: context.threadId,
                        },
                    });

                    await queryClient.cancelQueries({queryKey: listOptions.queryKey});

                    const prevThread = queryClient.getQueryData(listOptions.queryKey)

                    queryClient.setQueryData(listOptions.queryKey, (old) => {
                        if(!old) return old 
                        
                        if(vars.messageId === context.threadId) {
                            return {
                                ...old,
                                parent: {
                                    ...old.parent,
                                    reactions: bump(old.parent.reactions)
                                },
                            }
                        }
                        return {
                            ...old,
                            messages: old.messages.map((m) => m.id === vars.messageId ? {...m, reactions: bump(m.reactions)} : m)
                        }
                    })

                    return {
                        prevThread,
                        threadQueryKey: listOptions.queryKey,
                    }
                }

                const listKey = ['messages.List', channelId]
                await queryClient.cancelQueries({queryKey: listKey})
                const previous = queryClient.getQueryData(listKey)

                queryClient.setQueryData<InfiniteReplies>(
                    listKey,
                    (old) => {
                        if(!old) return old;

                        const pages = old.pages.map((page) => ({
                            ...page,
                            items: page.items.map((m) => {
                                if(m.id !== messageId) return m

                                const current = m.reactions
                                // const existing = current.find((r) => r.emoji === vars.emoji)  
                                
                                // let next: GroupedReactionSchmeaType[];
                                // if(existing) {
                                //     const dec = existing.count - 1
                                //     if(dec <=0 ){
                                //         next = current.filter((r) => r.emoji !== existing.emoji);
                                //     } else {
                                //         next = current.map((r) => r.emoji === existing.emoji ? {...r, count:dec, reactedByMe: false} : r)
                                //     }
                                // } else {
                                //     next = [
                                //         {...current,
                                //         emoji: vars.emoji, count: 1, reactedByMe: true},
                                //     ]
                                // }

                                return {
                                    ...m,
                                    reactions: bump(current),
                                }
                            })
                        }))
                        return {
                            ...old,
                            pages,
                        }
                    }
                )

                return {
                    previous,
                    listKey,
                }
            },
            onSuccess: (data) => {
                send({
                    type: 'reactions:updated',
                    payload: data,
                })

                return toast.success("Emoji added!")
            },
            onError: (_err, _vars, ctx) => {
                if(ctx?.threadQueryKey && ctx.prevThread) {
                    queryClient.setQueryData(ctx.threadQueryKey, ctx.prevThread);
                }

                if(ctx?.previous && ctx.listKey){
                    queryClient.setQueryData(ctx.listKey, ctx.previous)
                }
                return toast.error("Failed to update reaction")
            }
        })
    )
    const handleToggle = (emoji: string) => {
        toggleMutation.mutate({emoji, messageId})
    }
    return (
        <div className="mt-1 flex items-center gap-1">
            {reactions?.map((r) => (
                <Button key={r.emoji} type="button" variant="secondary" size="sm" className={cn("h-6 px-2 text-xs", r.reactedByMe && "bg-primary/10 border-primary border")}
                onClick={() => handleToggle(r.emoji)}>
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                </Button>
            ))}
            <EmojiReaction onSelect={handleToggle} />
        </div>
    )
}