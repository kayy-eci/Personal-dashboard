"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { type SlashItem } from "./slash-menu";

export interface SlashMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashMenuPopupProps {
  items: SlashItem[];
  query: string;
  command: (item: SlashItem) => void;
}

export const SlashMenuPopup = forwardRef<SlashMenuRef, SlashMenuPopupProps>(
  function SlashMenuPopup({ items, query, command }: SlashMenuPopupProps, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items, query]);

    useEffect(() => {
      if (items.length === 0) {
        return;
      }
      const element = document.querySelector(
        ".slash-popup-item[data-selected-index='true']",
      );
      element?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex, items]);

    const commit = useCallback(
      (item: SlashItem | undefined) => {
        if (!item) {
          return;
        }
        command(item);
      },
      [command],
    );

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown(event: KeyboardEvent): boolean {
          if (event.key === "ArrowUp") {
            if (items.length === 0) {
              return true;
            }
            setSelectedIndex(
              (current) => (current + items.length - 1) % items.length,
            );
            return true;
          }
          if (event.key === "ArrowDown") {
            if (items.length === 0) {
              return true;
            }
            setSelectedIndex((current) => (current + 1) % items.length);
            return true;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            commit(items[selectedIndex]);
            return true;
          }
          if (event.key === "Tab") {
            event.preventDefault();
            commit(items[selectedIndex]);
            return true;
          }
          // Escape closes the popup; let the suggestion plugin dismiss it.
          return false;
        },
      }),
      [items, selectedIndex, commit],
    );

    if (items.length === 0) {
      return (
        <div className="slash-popup">
          <p className="slash-popup-empty">No commands match /{query}</p>
        </div>
      );
    }

    return (
      <div className="slash-popup">
        <ul role="listbox" aria-label="Block commands">
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                data-selected-index={index === selectedIndex ? "true" : "false"}
                className="slash-popup-item"
                onClick={() => commit(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="slash-popup-label">{item.label}</span>
                <span className="slash-popup-description">{item.description}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="slash-popup-hint" aria-hidden>
          Navigate with arrow keys, Enter to apply
        </p>
      </div>
    );
  },
);

export default SlashMenuPopup;
