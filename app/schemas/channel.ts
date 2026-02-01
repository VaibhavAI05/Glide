// Create channel validation schema
import z from "zod";

export function transformChannelName(name: string) {
    return name.toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, "") // Remove special characters(keep only letters, numbers, and dashes)
    .replace(/-+/g, "-") // Replace multiple hyphens with a single hyphen
    .replace(/^-|-$/g, ""); // Remove leading and trailing hyphens
}

export const ChannelNameSchemma = z.object({
    name: z.string().min(2, "Channel name should be atleast two characters").max(50, "Channel name should be atmost 50 characters")
    .transform((name, ctx) => {
        const transformed = transformChannelName(name);

        if (transformed.length < 2) {
            ctx.addIssue({
                code: "custom",
                message: "Channel name must contain at least 2 Characters after transformation",
            });
            return z.NEVER;
        }
        return transformed;
    }),
})

export type ChannelSchemaNameType = z.infer<typeof ChannelNameSchemma>