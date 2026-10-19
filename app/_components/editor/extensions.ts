import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { common, createLowlight } from "lowlight";
import { Callout } from "./callout";
import { BlockEditing } from "./block-editing";
import { BlockIds } from "./block-ids";
import { ImagePaste } from "./attachments";
import { MarkdownPaste } from "./markdown-paste";
import { SlashMenu } from "./slash-menu";
import type { Extensions } from "@tiptap/core";

const lowlight = createLowlight(common);

export function createEditorExtensions(
  options: {
    onCreateSubPage?: (() => void) | null;
  } = {},
): Extensions {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
      },
    }),
    CodeBlockLowlight.configure({ lowlight }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image.configure({ inline: false, allowBase64: false }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Details,
    DetailsSummary,
    DetailsContent,
    Highlight.configure({ multicolor: true }),
    TextStyleKit,
    Callout,
    SlashMenu.configure({
      onCreateSubPage: options.onCreateSubPage ?? null,
    }),
    ImagePaste,
    MarkdownPaste,
    BlockIds,
    BlockEditing,
    Placeholder.configure({
      placeholder: ({ editor, node }) => {
        const isEmptyDocument =
          node.type.name === "paragraph" && editor.isEmpty;
        if (isEmptyDocument) {
          return "Type / for commands";
        }
        return "";
      },
    }),
  ];
}
