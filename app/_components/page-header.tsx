"use client";

import { useEffect, useRef, useState } from "react";
import { getLifeOsApi } from "@/lib/pages-client";
import { SaveStatusIndicator } from "./save-status-indicator";
import { useWorkspace } from "./workspace-provider";

const COVER_PRESETS = [
  "#F7F7F7",
  "#647C64",
  "#E8E8E8",
  "#DDE7DD",
  "#FCE9E9",
  "#E9F0F7",
  "#FFF3E0",
  "#EFE7F7",
];

// A small bundled emoji catalogue (~150) with names for search. No emoji library.
const EMOJI_LIST: { emoji: string; name: string }[] = [
  { emoji: "😀", name: "grinning face" },
  { emoji: "😃", name: "smiley" },
  { emoji: "😄", name: "smile" },
  { emoji: "😁", name: "beaming" },
  { emoji: "😆", name: "laughing" },
  { emoji: "😂", name: "joy tears" },
  { emoji: "🤣", name: "rofl" },
  { emoji: "😊", name: "smiling" },
  { emoji: "😇", name: "innocent halo" },
  { emoji: "🙂", name: "slightly smiling" },
  { emoji: "😉", name: "wink" },
  { emoji: "😍", name: "heart eyes" },
  { emoji: "😘", name: "kiss" },
  { emoji: "😎", name: "sunglasses cool" },
  { emoji: "🤔", name: "thinking" },
  { emoji: "😐", name: "neutral" },
  { emoji: "😑", name: "expressionless" },
  { emoji: "😶", name: "no mouth" },
  { emoji: "😏", name: "smirk" },
  { emoji: "😒", name: "unamused" },
  { emoji: "🙄", name: "roll eyes" },
  { emoji: "😬", name: "grimace" },
  { emoji: "🤥", name: "lying" },
  { emoji: "😌", name: "relieved" },
  { emoji: "😔", name: "pensive" },
  { emoji: "😪", name: "sleepy" },
  { emoji: "🤤", name: "drooling" },
  { emoji: "😴", name: "sleeping" },
  { emoji: "😷", name: "mask" },
  { emoji: "🤒", name: "thermometer sick" },
  { emoji: "🤕", name: "bandage hurt" },
  { emoji: "🤢", name: "nauseated" },
  { emoji: "🤮", name: "vomiting" },
  { emoji: "🤧", name: "sneezing" },
  { emoji: "🥵", name: "hot" },
  { emoji: "🥶", name: "cold" },
  { emoji: "🥴", name: "woozy" },
  { emoji: "😵", name: "dizzy" },
  { emoji: "🤯", name: "exploding head" },
  { emoji: "🤠", name: "cowboy" },
  { emoji: "🥳", name: "party" },
  { emoji: "🥸", name: "disguise" },
  { emoji: "🤓", name: "nerd" },
  { emoji: "🧐", name: "monocle" },
  { emoji: "😕", name: "confused" },
  { emoji: "😟", name: "worried" },
  { emoji: "🙁", name: "frown" },
  { emoji: "☹️", name: "frowning" },
  { emoji: "😮", name: "open mouth" },
  { emoji: "😯", name: "hushed" },
  { emoji: "😲", name: "astonished" },
  { emoji: "😳", name: "flushed" },
  { emoji: "🥺", name: "pleading" },
  { emoji: "😦", name: "frowning open" },
  { emoji: "😧", name: "anguished" },
  { emoji: "😨", name: "fearful" },
  { emoji: "😰", name: "anxious" },
  { emoji: "😥", name: "sad relieved" },
  { emoji: "😢", name: "crying" },
  { emoji: "😭", name: "loudly crying" },
  { emoji: "😱", name: "screaming" },
  { emoji: "😖", name: "confounded" },
  { emoji: "😣", name: "persevering" },
  { emoji: "😞", name: "disappointed" },
  { emoji: "😓", name: "downcast sweat" },
  { emoji: "😩", name: "weary" },
  { emoji: "😫", name: "tired" },
  { emoji: "🥱", name: "yawning" },
  { emoji: "😤", name: "triumph" },
  { emoji: "😡", name: "pouting angry" },
  { emoji: "😠", name: "angry" },
  { emoji: "🤬", name: "cursing" },
  { emoji: "😈", name: "smiling devil" },
  { emoji: "👿", name: "angry devil" },
  { emoji: "💀", name: "skull" },
  { emoji: "☠️", name: "skull crossbones" },
  { emoji: "💩", name: "poop" },
  { emoji: "🤡", name: "clown" },
  { emoji: "👹", name: "ogre" },
  { emoji: "👺", name: "goblin" },
  { emoji: "👻", name: "ghost" },
  { emoji: "👽", name: "alien" },
  { emoji: "👾", name: "space invader" },
  { emoji: "🤖", name: "robot" },
  { emoji: "😺", name: "smiley cat" },
  { emoji: "😸", name: "grin cat" },
  { emoji: "😹", name: "joy cat" },
  { emoji: "😻", name: "heart eyes cat" },
  { emoji: "😼", name: "smirk cat" },
  { emoji: "😽", name: "kiss cat" },
  { emoji: "🙀", name: "weary cat" },
  { emoji: "😿", name: "crying cat" },
  { emoji: "😾", name: "pouting cat" },
  { emoji: "👋", name: "wave" },
  { emoji: "🤚", name: "raised back hand" },
  { emoji: "🖐️", name: "hand splayed" },
  { emoji: "✋", name: "raised hand" },
  { emoji: "🖖", name: "vulcan" },
  { emoji: "👌", name: "ok" },
  { emoji: "🤌", name: "pinched fingers" },
  { emoji: "🤏", name: "pinching" },
  { emoji: "✌️", name: "victory" },
  { emoji: "🤞", name: "crossed fingers" },
  { emoji: "🤟", name: "love you" },
  { emoji: "🤘", name: "rock on" },
  { emoji: "🤙", name: "call me" },
  { emoji: "👈", name: "point left" },
  { emoji: "👉", name: "point right" },
  { emoji: "👆", name: "point up" },
  { emoji: "👇", name: "point down" },
  { emoji: "👍", name: "thumbs up" },
  { emoji: "👎", name: "thumbs down" },
  { emoji: "✊", name: "raised fist" },
  { emoji: "👊", name: "oncoming fist" },
  { emoji: "👏", name: "clapping" },
  { emoji: "🙌", name: "raising hands" },
  { emoji: "👐", name: "open hands" },
  { emoji: "🤲", name: "palms up" },
  { emoji: "🙏", name: "pray" },
  { emoji: "✍️", name: "writing" },
  { emoji: "💅", name: "nail polish" },
  { emoji: "🤳", name: "selfie" },
  { emoji: "💪", name: "muscle" },
  { emoji: "🧠", name: "brain" },
  { emoji: "❤️", name: "red heart" },
  { emoji: "🧡", name: "orange heart" },
  { emoji: "💛", name: "yellow heart" },
  { emoji: "💚", name: "green heart" },
  { emoji: "💙", name: "blue heart" },
  { emoji: "💜", name: "purple heart" },
  { emoji: "🖤", name: "black heart" },
  { emoji: "🤍", name: "white heart" },
  { emoji: "💔", name: "broken heart" },
  { emoji: "✨", name: "sparkles" },
  { emoji: "⭐", name: "star" },
  { emoji: "🌟", name: "glowing star" },
  { emoji: "💫", name: "dizzy star" },
  { emoji: "🔥", name: "fire" },
  { emoji: "💧", name: "droplet" },
  { emoji: "⚡", name: "lightning" },
  { emoji: "☀️", name: "sun" },
  { emoji: "🌙", name: "moon" },
  { emoji: "🌈", name: "rainbow" },
  { emoji: "☁️", name: "cloud" },
  { emoji: "❄️", name: "snowflake" },
  { emoji: "🍀", name: "clover" },
  { emoji: "🌸", name: "cherry blossom" },
  { emoji: "🌺", name: "hibiscus" },
  { emoji: "🌻", name: "sunflower" },
  { emoji: "🌹", name: "rose" },
  { emoji: "🌷", name: "tulip" },
  { emoji: "🌱", name: "seedling" },
  { emoji: "🌲", name: "evergreen" },
  { emoji: "🌳", name: "deciduous" },
  { emoji: "🌴", name: "palm" },
  { emoji: "🌵", name: "cactus" },
  { emoji: "🍁", name: "maple leaf" },
  { emoji: "🍂", name: "fallen leaf" },
  { emoji: "🍃", name: "leaf fluttering" },
  { emoji: "🐶", name: "dog" },
  { emoji: "🐱", name: "cat" },
  { emoji: "🐭", name: "mouse" },
  { emoji: "🐹", name: "hamster" },
  { emoji: "🐰", name: "rabbit" },
  { emoji: "🦊", name: "fox" },
  { emoji: "🐻", name: "bear" },
  { emoji: "🐼", name: "panda" },
  { emoji: "🐨", name: "koala" },
  { emoji: "🐯", name: "tiger" },
  { emoji: "🦁", name: "lion" },
  { emoji: "🐮", name: "cow" },
  { emoji: "🐷", name: "pig" },
  { emoji: "🐸", name: "frog" },
  { emoji: "🐵", name: "monkey" },
  { emoji: "🐔", name: "chicken" },
  { emoji: "🐧", name: "penguin" },
  { emoji: "🐦", name: "bird" },
  { emoji: "🦆", name: "duck" },
  { emoji: "🦉", name: "owl" },
  { emoji: "🦅", name: "eagle" },
  { emoji: "🐝", name: "bee" },
  { emoji: "🐛", name: "bug" },
  { emoji: "🦋", name: "butterfly" },
  { emoji: "🐌", name: "snail" },
  { emoji: "🐢", name: "turtle" },
  { emoji: "🐍", name: "snake" },
  { emoji: "🦎", name: "lizard" },
  { emoji: "🐙", name: "octopus" },
  { emoji: "🦑", name: "squid" },
  { emoji: "🦀", name: "crab" },
  { emoji: "🐟", name: "fish" },
  { emoji: "🐠", name: "tropical fish" },
  { emoji: "🐳", name: "whale" },
  { emoji: "🐬", name: "dolphin" },
  { emoji: "🦂", name: "scorpion" },
  { emoji: "🕷️", name: "spider" },
  { emoji: "🍎", name: "apple" },
  { emoji: "🍊", name: "orange" },
  { emoji: "🍋", name: "lemon" },
  { emoji: "🍌", name: "banana" },
  { emoji: "🍉", name: "watermelon" },
  { emoji: "🍇", name: "grapes" },
  { emoji: "🍓", name: "strawberry" },
  { emoji: "🍒", name: "cherries" },
  { emoji: "🍑", name: "peach" },
  { emoji: "🍍", name: "pineapple" },
  { emoji: "🥝", name: "kiwi" },
  { emoji: "🍅", name: "tomato" },
  { emoji: "🥑", name: "avocado" },
  { emoji: "🥦", name: "broccoli" },
  { emoji: "🥕", name: "carrot" },
  { emoji: "🌽", name: "corn" },
  { emoji: "🥔", name: "potato" },
  { emoji: "🍞", name: "bread" },
  { emoji: "🧀", name: "cheese" },
  { emoji: "🥚", name: "egg" },
  { emoji: "🍳", name: "cooking" },
  { emoji: "🥗", name: "salad" },
  { emoji: "🍕", name: "pizza" },
  { emoji: "🍔", name: "burger" },
  { emoji: "🍟", name: "fries" },
  { emoji: "🌭", name: "hotdog" },
  { emoji: "🍿", name: "popcorn" },
  { emoji: "🧂", name: "salt" },
  { emoji: "☕", name: "coffee" },
  { emoji: "🍵", name: "tea" },
  { emoji: "🧃", name: "juice" },
  { emoji: "🍷", name: "wine" },
  { emoji: "🍺", name: "beer" },
  { emoji: "🥂", name: "champagne" },
  { emoji: "🧉", name: "mate" },
  { emoji: "🏠", name: "house" },
  { emoji: "🏢", name: "office" },
  { emoji: "🏥", name: "hospital" },
  { emoji: "🏫", name: "school" },
  { emoji: "🏛️", name: "classical building" },
  { emoji: "⛪", name: "church" },
  { emoji: "🕌", name: "mosque" },
  { emoji: "🛕", name: "hindu temple" },
  { emoji: "🕍", name: "synagogue" },
  { emoji: "⛩️", name: "shinto shrine" },
];

const ICON_DISPLAY = (value: string | null): { kind: "emoji" | "image" | null; value: string } => {
  if (!value) return { kind: null, value: "" };
  if (value.startsWith("emoji:")) return { kind: "emoji", value: value.slice(6) };
  if (value.startsWith("image:")) return { kind: "image", value: value.slice(6) };
  return { kind: null, value: "" };
};

function CoverView({ cover }: { cover: string }) {
  if (cover.startsWith("color:")) {
    return <div className="page-cover" style={{ background: cover.slice(6) }} />;
  }
  if (cover.startsWith("image:")) {
    const file = cover.slice(6);
    return (
      <div className="page-cover">
        <img src={`/attachment/${file}`} alt="" className="page-cover-image" />
      </div>
    );
  }
  return null;
}

export function PageHeader() {
  const workspace = useWorkspace();
  const activePage =
    workspace.tree && workspace.activePageId
      ? findNodeSafe(workspace.tree, workspace.activePageId)
      : undefined;

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [customEmoji, setCustomEmoji] = useState("");
  const [uploadTab, setUploadTab] = useState<"emoji" | "upload">("emoji");
  const iconPickerRef = useRef<HTMLDivElement | null>(null);
  const coverMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!iconPickerOpen && !coverMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIconPickerOpen(false);
        setCoverMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iconPickerOpen, coverMenuOpen]);

  useEffect(() => {
    if (!iconPickerOpen) return;
    const onClick = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setIconPickerOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [iconPickerOpen]);

  useEffect(() => {
    if (!coverMenuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (coverMenuRef.current && !coverMenuRef.current.contains(event.target as Node)) {
        setCoverMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [coverMenuOpen]);

  if (!activePage || !workspace.activePageId) {
    return null;
  }

  const iconInfo = ICON_DISPLAY(activePage.icon);
  const api = getLifeOsApi();

  const handleUploadIcon = async (file: File) => {
    if (!api) return;
    if (file.size > 5 * 1024 * 1024) {
      workspace.pushError?.("Icon image must be 5 MB or smaller.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      workspace.pushError?.("Icon must be PNG, JPG or WebP.");
      return;
    }
    const bytes = await file.arrayBuffer();
    try {
      const stored = await api.saveAttachment({ mime: file.type, bytes });
      await workspace.setPageIcon(workspace.activePageId!, `image:${stored.fileName}`);
      setIconPickerOpen(false);
    } catch (error) {
      workspace.pushError?.(error instanceof Error ? error.message : "Icon upload failed");
    }
  };

  const handleUploadCover = async (file: File) => {
    if (!api) return;
    const bytes = await file.arrayBuffer();
    try {
      const stored = await api.saveAttachment({ mime: file.type, bytes });
      await workspace.setPageCover(workspace.activePageId!, `image:${stored.fileName}`);
      setCoverMenuOpen(false);
    } catch (error) {
      workspace.pushError?.(error instanceof Error ? error.message : "Cover upload failed");
    }
  };

  const filteredEmoji = emojiQuery.trim()
    ? EMOJI_LIST.filter((entry) =>
        entry.name.toLowerCase().includes(emojiQuery.trim().toLowerCase()) ||
        entry.emoji.includes(emojiQuery.trim()),
      )
    : EMOJI_LIST;

  return (
    <div
      className="page-header"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {activePage.cover ? <CoverView cover={activePage.cover} /> : null}

      <div className="page-header-body">
        {!activePage.cover && hover ? (
          <button
            type="button"
            className="page-header-add-cover"
            onClick={() => setCoverMenuOpen(true)}
          >
            Add cover
          </button>
        ) : null}
        {activePage.cover && hover ? (
          <button
            type="button"
            className="page-header-change-cover"
            onClick={() => setCoverMenuOpen(true)}
          >
            Change cover
          </button>
        ) : null}

        <div className="page-header-icon-row">
          {iconInfo.kind === "emoji" ? (
            <button
              type="button"
              className="page-header-icon page-header-icon-emoji"
              onClick={() => setIconPickerOpen(true)}
              aria-label="Change page icon"
            >
              {iconInfo.value}
            </button>
          ) : iconInfo.kind === "image" ? (
            <button
              type="button"
              className="page-header-icon page-header-icon-image"
              onClick={() => setIconPickerOpen(true)}
              aria-label="Change page icon"
            >
              <img src={`/attachment/${iconInfo.value}`} alt="" />
            </button>
          ) : hover ? (
            <button
              type="button"
              className="page-header-add-icon"
              onClick={() => setIconPickerOpen(true)}
            >
              Add icon
            </button>
          ) : null}
        </div>

        <TitleInput initialTitle={activePage.title} />

        {iconPickerOpen ? (
          <div ref={iconPickerRef} className="page-header-popover" role="dialog" aria-label="Choose icon">
            <div className="page-header-popover-tabs">
              <button
                type="button"
                className={uploadTab === "emoji" ? "active" : ""}
                onClick={() => setUploadTab("emoji")}
              >
                Emoji
              </button>
              <button
                type="button"
                className={uploadTab === "upload" ? "active" : ""}
                onClick={() => setUploadTab("upload")}
              >
                Upload
              </button>
            </div>
            {uploadTab === "emoji" ? (
              <>
                <input
                  type="search"
                  className="page-header-popover-search"
                  placeholder="Search emoji"
                  value={emojiQuery}
                  onChange={(event) => setEmojiQuery(event.target.value)}
                  aria-label="Search emoji"
                />
                <input
                  type="text"
                  className="page-header-popover-custom"
                  placeholder="Type or paste any emoji"
                  value={customEmoji}
                  onChange={(event) => setCustomEmoji(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && customEmoji.trim()) {
                      event.preventDefault();
                      void workspace.setPageIcon(workspace.activePageId!, `emoji:${customEmoji.trim()}`);
                      setCustomEmoji("");
                      setIconPickerOpen(false);
                    }
                  }}
                  aria-label="Custom emoji"
                />
                <div className="page-header-emoji-grid">
                  {filteredEmoji.map((entry) => (
                    <button
                      key={entry.emoji}
                      type="button"
                      className="page-header-emoji-button"
                      title={entry.name}
                      aria-label={entry.name}
                      onClick={() => {
                        void workspace.setPageIcon(workspace.activePageId!, `emoji:${entry.emoji}`);
                        setIconPickerOpen(false);
                      }}
                    >
                      {entry.emoji}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="page-header-remove"
                  onClick={() => {
                    void workspace.setPageIcon(workspace.activePageId!, null);
                    setIconPickerOpen(false);
                  }}
                >
                  Remove
                </button>
              </>
            ) : (
              <div className="page-header-upload">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleUploadIcon(file);
                  }}
                />
                <p className="page-header-help">PNG, JPG or WebP, up to 5 MB.</p>
              </div>
            )}
          </div>
        ) : null}

        {coverMenuOpen ? (
          <div ref={coverMenuRef} className="page-header-popover page-header-cover-menu" role="dialog" aria-label="Change cover">
            <div className="page-header-cover-presets">
              {COVER_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="page-header-cover-preset"
                  style={{ background: color }}
                  aria-label={`Cover color ${color}`}
                  onClick={() => {
                    void workspace.setPageCover(workspace.activePageId!, `color:${color}`);
                    setCoverMenuOpen(false);
                  }}
                />
              ))}
            </div>
            <div className="page-header-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUploadCover(file);
                }}
              />
              <p className="page-header-help">Image upload, up to 20 MB.</p>
            </div>
            <button
              type="button"
              className="page-header-remove"
              onClick={() => {
                void workspace.setPageCover(workspace.activePageId!, null);
                setCoverMenuOpen(false);
              }}
            >
              Remove cover
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function findNodeSafe(tree: unknown, id: string): { id: string; title: string; icon: string | null; cover: string | null } | undefined {
  type Node = { id: string; title: string; icon: string | null; cover: string | null; children?: Node[] };
  const walk = (nodes: Node[]): Node | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = walk(node.children ?? []);
      if (found) return found;
    }
    return undefined;
  };
  return walk(Array.isArray(tree) ? (tree as Node[]) : []);
}

function TitleInput({ initialTitle }: { initialTitle: string }) {
  const workspace = useWorkspace();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handledFocusToken = useRef(0);

  useEffect(() => {
    if (workspace.pageTitleFocusToken > handledFocusToken.current) {
      handledFocusToken.current = workspace.pageTitleFocusToken;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [workspace.pageTitleFocusToken]);

  const commit = (value: string) => {
    if (!workspace.activePageId) return;
    if (value !== initialTitle && value.trim()) {
      void workspace.renamePage(workspace.activePageId, value);
    }
  };

  return (
    <header className="page-title-row">
      <input
        ref={inputRef}
        className="page-title-input"
        type="text"
        defaultValue={initialTitle}
        maxLength={500}
        aria-label="Page title"
        placeholder="Untitled"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(event.currentTarget.value);
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.value = initialTitle;
            event.currentTarget.blur();
          }
        }}
        onBlur={(event) => {
          commit(event.currentTarget.value);
          if (event.currentTarget.value.trim() === "") {
            event.currentTarget.value = initialTitle;
          }
        }}
      />
      <SaveStatusIndicator />
    </header>
  );
}

// bottom import removed
