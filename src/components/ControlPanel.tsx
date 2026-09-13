import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import {
  DicesIcon,
  Redo2Icon,
  RotateCcwIcon,
  SettingsIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  historyPointerAtom,
  historyStackAtom,
  isPanelOpenAtom,
  recordingStateAtom,
  swarmParamsAtom,
} from "../state/swarmStore";
import type { SwarmParameters } from "../types/swarm";
import { AgentSection } from "./panel/AgentSection";
import { ColorSection } from "./panel/ColorSection";
import { ConnectionSection } from "./panel/ConnectionSection";
import { ExportSection } from "./panel/ExportSection";
import { InteractionSection } from "./panel/InteractionSection";
import { SystemSection } from "./panel/SystemSection";

interface Props {
  onParamChange: (
    key: keyof SwarmParameters,
    val: SwarmParameters[keyof SwarmParameters],
  ) => void;
  onRestart: () => void;
  onRandomizeAll: () => void;
  onRandomizePalette: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportJpg: () => void;
  onExportSvg: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onExportJsonc: () => void;
  onImportJsonc: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ControlPanel: React.FC<Props> = ({
  onParamChange,
  onRestart,
  onRandomizeAll,
  onRandomizePalette,
  onUndo,
  onRedo,
  onExportJpg,
  onExportSvg,
  onStartRecord,
  onStopRecord,
  onExportJsonc,
  onImportJsonc,
}) => {
  const [params] = useAtom(swarmParamsAtom);
  const [isOpen, setIsOpen] = useAtom(isPanelOpenAtom);
  const [historyStack] = useAtom(historyStackAtom);
  const [historyPointer] = useAtom(historyPointerAtom);
  const [recordingState] = useAtom(recordingStateAtom);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const canUndo = historyPointer > 0;
  const canRedo = historyPointer < historyStack.length - 1;

  // Accordion section states
  const [openSections, setOpenSections] = useState<
    Record<string, boolean>
  >({
    system: true,
    agent: true,
    connection: true,
    interaction: false,
    color: true,
    export: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Close panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (!isOpen) return;
      const path = e.composedPath?.() || [];
      if (
        panelRef.current &&
        (path.includes(panelRef.current) ||
          panelRef.current.contains(e.target as Node))
      ) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      window.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [isOpen, setIsOpen]);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImportJsonc}
        accept=".jsonc,.json"
        className="hidden"
      />

      {/* Floating Toggle Button (Visible when closed) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="設定パネルの表示 (Hキー)"
          className="absolute top-4 left-4 z-40 bg-white/95 hover:bg-white text-gray-900 px-3.5 py-2 rounded-md shadow-md backdrop-blur-md border border-gray-200 transition flex items-center gap-2 cursor-pointer text-xs font-semibold"
        >
          <SettingsIcon className="w-4 h-4 text-gray-700" />
          <span>Sticky Swarm 設定</span>
          {import.meta.env.DEV && (
            <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px] leading-none">
              DEV
            </span>
          )}
        </button>
      )}

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: -420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            onWheel={(e) => e.stopPropagation()}
            className="absolute top-4 left-4 bottom-4 w-96 z-40 bg-white/95 text-gray-900 rounded-md shadow-2xl border border-gray-200 backdrop-blur-md flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/90 flex-shrink-0">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-gray-800" />
                <span className="text-xs font-bold tracking-wide text-gray-900">
                  Sticky Swarm コントロール
                </span>
                {import.meta.env.DEV && (
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px] leading-none">
                    DEV
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-900 p-1 rounded hover:bg-gray-200/60 transition cursor-pointer"
                title="パネルを閉じる (Hキー)"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Bar */}
            <div className="p-3 bg-gray-50/70 border-b border-gray-200 space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onRestart}
                  title="シミュレーションを初期状態から再開"
                  className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 py-1.5 px-2.5 rounded font-medium transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-xs"
                >
                  <RotateCcwIcon className="w-3.5 h-3.5 text-gray-700" />
                  <span>リセット</span>
                </button>

                <button
                  type="button"
                  onClick={onRandomizeAll}
                  title="全パラメータをランダム設定 (Spaceキー)"
                  className="flex-1 bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white py-1.5 px-3 rounded font-bold transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-sm"
                >
                  <DicesIcon className="w-4 h-4" />
                  <span>ランダム実行 (Space)</span>
                </button>

                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    disabled={!canUndo}
                    onClick={onUndo}
                    title="元に戻す (Ctrl+Z)"
                    className="bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 border border-gray-300 px-2 py-1.5 rounded transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed text-xs font-medium shadow-xs"
                  >
                    <Undo2Icon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!canRedo}
                    onClick={onRedo}
                    title="やり直す (Ctrl+Y)"
                    className="bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 border border-gray-300 px-2 py-1.5 rounded transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed text-xs font-medium shadow-xs"
                  >
                    <Redo2Icon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Settings Sections */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 text-xs">
              <SystemSection
                params={params}
                isOpen={openSections.system}
                onToggle={() => toggleSection("system")}
                onParamChange={onParamChange}
              />

              <AgentSection
                params={params}
                isOpen={openSections.agent}
                onToggle={() => toggleSection("agent")}
                onParamChange={onParamChange}
              />

              <ConnectionSection
                params={params}
                isOpen={openSections.connection}
                onToggle={() => toggleSection("connection")}
                onParamChange={onParamChange}
              />

              <InteractionSection
                params={params}
                isOpen={openSections.interaction}
                onToggle={() => toggleSection("interaction")}
                onParamChange={onParamChange}
              />

              <ColorSection
                params={params}
                isOpen={openSections.color}
                onToggle={() => toggleSection("color")}
                onParamChange={onParamChange}
                onRandomizePalette={onRandomizePalette}
              />

              <ExportSection
                params={params}
                isOpen={openSections.export}
                onToggle={() => toggleSection("export")}
                onParamChange={onParamChange}
                onExportJpg={onExportJpg}
                onExportSvg={onExportSvg}
                onStartRecord={onStartRecord}
                onStopRecord={onStopRecord}
                isRecording={recordingState.isRecording}
                onExportJsonc={onExportJsonc}
                onTriggerImport={() => fileInputRef.current?.click()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
