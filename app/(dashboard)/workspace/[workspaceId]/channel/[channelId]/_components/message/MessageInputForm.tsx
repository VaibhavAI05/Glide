"use client";

import { createMessageSchema, createMessageSchemaType } from "@/app/schemas/message";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MessageComposer } from "./MessageComposer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";

interface iAppProps {
    channelId: string
}


export function MessaggeInputform({channelId}: iAppProps) {
    const queryClient = useQueryClient();

    const form = useForm({
        resolver: zodResolver(createMessageSchema),
        defaultValues: {
            channelId: channelId,
            content: "",
        }
    })

    const createMessageMutation = useMutation(
        orpc.message.create.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: orpc.message.list.key()
                })
                return toast.success("Message created successfully");
            },
            onError: () => {
                return toast.error('Something went wrong');
            }
        })
    )

    function onSubmit(data: createMessageSchemaType) {
        createMessageMutation.mutate(data)
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
                                <MessageComposer value={field.value} onChange={field.onChange} onSubmit={() => onSubmit(form.getValues())}isSubmitting={createMessageMutation.isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                
                />
            </form>
        </Form>
    )
}