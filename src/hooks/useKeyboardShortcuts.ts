import { useEffect } from "react";

interface Props {
  onRandomizeAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePanel: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onExportImage: () => void;
  onRestart: () => void;
}

export function useKeyboardShortcuts({
  onRandomizeAll,
  onUndo,
  onRedo,
  onTogglePanel,
  onStartRecord,
  onStopRecord,
  onExportImage,
  onRestart,
}: Props): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select"
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        onRedo();
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        onRandomizeAll();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "h") {
        e.preventDefault();
        onTogglePanel();
      } else if (key === "r") {
        e.preventDefault();
        onStartRecord();
      } else if (key === "s") {
        e.preventDefault();
        onStopRecord();
      } else if (key === "e") {
        e.preventDefault();
        onExportImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    onRandomizeAll,
    onUndo,
    onRedo,
    onTogglePanel,
    onStartRecord,
    onStopRecord,
    onExportImage,
    onRestart,
  ]);
}
