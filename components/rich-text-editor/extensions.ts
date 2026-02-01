import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import {all, createLowlight} from 'lowlight'
import CodeBlock from '@tiptap/extension-code-block-lowlight'
import {Placeholder} from "@tiptap/extensions/placeholder"


// create a lowlight instance with all languages loaded
const lowlight = createLowlight(all)
//This is for editing a message
export const baseExtensions = [
    StarterKit.configure({
        codeBlock: false,
    }),
    TextAlign.configure({
        types: ["heading", "paragraph"]
    }),
    CodeBlock.configure({
        lowlight,
    })
];


//This is for  neeche wala message editor
export const editorExtensions = [
    ...baseExtensions,
    Placeholder.configure({
        placeholder: "Type your Message",
    })
]