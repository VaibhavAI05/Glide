"use client";

import { ChannelNameSchemma, ChannelSchemaNameType, transformChannelName } from "@/app/schemas/channel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function CreateNewChannel() {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient()

    const form = useForm({
        resolver: zodResolver(ChannelNameSchemma),
        defaultValues: {
            name: "",
        },
    })

    const createChannelMutation = useMutation(
        orpc.channel.create.mutationOptions({
            onSuccess: (newChannel) => {
                toast.success(`Channel ${newChannel.name} created Succesfully!`);

                queryClient.invalidateQueries({
                    queryKey: orpc.channel.list.queryKey(),
                })

                form.reset()
                setOpen(false);
            },
            onError: (error) => {
                if(isDefinedError(error)){
                    toast.error(error.message);
                    return;
                }
                toast.error("Failed to create channel. Please try again. ")
            }
        })
    )

    function onSubmit( values: ChannelSchemaNameType) {
        createChannelMutation.mutate(values);
    } 

    const watchedName = form.watch("name");
    const tranformedName = watchedName ? transformChannelName(watchedName) : "";
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Plus className="size-4" />
                    Add Channel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create channel</DialogTitle>
                    <DialogDescription>Create a new channel to get started!</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                        <FormField
                        control={form.control}
                        name="name"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="My Channel" {...field} />
                                </FormControl>
                                {tranformedName && tranformedName !== watchedName && (
                                    <p className="text-sm text-muted-foreground">
                                        Will be created as: <code className="bg-muted px-1 py-0.5 rounded text-xs">{tranformedName}</code>
                                    </p>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button
                            disabled={createChannelMutation.isPending}
                            type="submit">
                            {createChannelMutation.isPending ? 'Creating...' : 'Create new channel'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}