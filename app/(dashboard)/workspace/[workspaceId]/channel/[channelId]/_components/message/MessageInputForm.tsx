"use client";

import { createMessageSchema, createMessageSchemaType } from "@/app/schemas/message";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MessageComposer } from "./MessageComposer";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { useState } from "react";
import { useAttachmentUpload } from "@/hooks/use-attachment-upload";
// import { Message } from "@/lib/generated/prisma/client";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs";
import { getAvatar } from "@/lib/get-avatar";
import { MessageListItem } from "@/lib/types";
import { useChannelRealtime } from "@/providers/ChannelRealtimeProvider";

interface iAppProps {
    channelId: string;
    user: KindeUser<Record<string, unknown>>; 
}
//changes here(added the MessageListItem instead of Message)
// type MessagePage = {items: Message[]; nextCursor?: string}
type MessagePage = {items: MessageListItem[]; nextCursor?: string}
type InfiniteMessages = InfiniteData<MessagePage>

export function MessageInputform({channelId, user}: iAppProps) {
    const queryClient = useQueryClient();
    const [editorKey, setEditorKey] = useState(0);
    const upload = useAttachmentUpload();
    const { send } = useChannelRealtime()

    const form = useForm({
        resolver: zodResolver(createMessageSchema),
        defaultValues: {
            channelId: channelId,
            content: "",
        }
    })

    const createMessageMutation = useMutation(
        orpc.message.create.mutationOptions({

            onMutate: async(data) => {
                await queryClient.cancelQueries({
                    queryKey: ['messages.List', channelId]
                });

                const previousData = queryClient.getQueryData<InfiniteMessages>([
                    'messages.List', 
                    channelId,
                ]);

                const tempId = `optimistic-${crypto.randomUUID()}`;
                //check changes (added the MessageListItem)
                const optimisticMessage: MessageListItem = {
                    id: tempId,
                    content: data.content,
                    imageUrl: data.imageUrl ?? null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    authorId: user.id,
                    authorEmail: user.email!,
                    authorName: user.given_name ?? "John Doe",
                    authorAvatar: getAvatar(user.picture, user.email!),
                    channelId: channelId,
                    //check changes from here (added these three things)
                    threadId: null,
                    reactions: [],
                    replyCount: 0,
                }

                queryClient.setQueryData<InfiniteMessages>(['messages.List', channelId], (old) => {
                    if(!old) {
                        return {
                            pages: [
                                {
                                    items: [optimisticMessage],
                                    nextCursor: undefined,
                                },
                            ],
                            pageParams: [undefined],
                        } satisfies InfiniteMessages
                    }

                    const firstPage = old.pages[0] ?? {
                        items: [],
                        nextCursor: undefined,
                    }

                    const updatedFirstPage: MessagePage = {
                        ...firstPage,
                        items: [optimisticMessage, ...firstPage.items],
                    }

                    return {
                        ...old,
                        pages: [updatedFirstPage, ...old.pages.slice(1)],
                    }
                })

                return {
                    previousData,
                    tempId,
                }
            },

            onSuccess: (data, _variables, context) => {
                queryClient.setQueryData<InfiniteMessages>(
                    ['messages.List', channelId],
                    (old) => {
                        if(!old) return old;
                        
                        const updatedPages = old.pages.map((page) => ({
                            ...page,
                            items: page.items.map((m) => m.id === context.tempId ? {
                                ...data,
                                //check changes (added these two things)
                                reactions: [],
                                replyCount: 0,
                            }: m),
                        }))
                        
                        return {
                            ...old,
                            pages: updatedPages,
                        }
                    }
                )
                form.reset({channelId, content: ""});
                upload.clear();
                setEditorKey((k) => k + 1);

                send({
                    type: 'message:created',
                    payload: {message: data},
                })

                return toast.success("Message created successfully");
            },
            
            onError: (_err, _variables, context) => {
                if(context?.previousData) {
                    queryClient.setQueryData(
                        ['messages.List', channelId],
                        context.previousData
                    )
                }

                return toast.error("Something wen wrong")
            }
        })
    )

    function onSubmit(data: createMessageSchemaType) {
        createMessageMutation.mutate({
            ...data,
            imageUrl: upload.stagedUrl ?? undefined,
        })
    }
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField 
                    control={form.control}
                    name="content"
                    render={({field}) => (
                        <FormItem>
                            <FormControl>
                                <MessageComposer key={editorKey} value={field.value} onChange={field.onChange} onSubmit={() => onSubmit(form.getValues())}isSubmitting={createMessageMutation.isPending} upload={upload}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                
                />
            </form>
        </Form>
    )
}