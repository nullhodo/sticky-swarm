import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CpuIcon,
  DicesIcon,
  DownloadIcon,
  FileCodeIcon,
  FolderOpenIcon,
  ImageIcon,
  LinkIcon,
  MousePointerIcon,
  PaletteIcon,
  Redo2Icon,
  RotateCcwIcon,
  SaveIcon,
  SettingsIcon,
  ShapesIcon,
  SparklesIcon,
  Undo2Icon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { PREDEFINED_PALETTES } from "../constants/palettes";
import {
  historyPointerAtom,
  historyStackAtom,
  isPanelOpenAtom,
  recordingStateAtom,
  swarmParamsAtom,
} from "../state/swarmStore";
import type {
  ArmPattern,
  SwarmParameters,
  TargetRule,
} from "../types/swarm";

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
              {/* Section 1: System Settings */}
              <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("system")}
                  className="w-full p-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between font-bold text-gray-800 border-b border-gray-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CpuIcon className="w-4 h-4 text-indigo-600" />
                    <span>システム設定</span>
                  </div>
                  {openSections.system ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {openSections.system && (
                  <div className="p-3 space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          初期エージェント数
                        </span>
                        <span className="font-mono text-gray-500">
                          {params.agentCount}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="1"
                        value={params.agentCount}
                        onChange={(e) =>
                          onParamChange(
                            "agentCount",
                            Number.parseInt(e.target.value, 10),
                          )
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          ランダム移動速度
                        </span>
                        <span className="font-mono text-gray-500">
                          {params.movementSpeed.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="5.0"
                        step="0.1"
                        value={params.movementSpeed}
                        onChange={(e) =>
                          onParamChange(
                            "movementSpeed",
                            Number.parseFloat(e.target.value),
                          )
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          回転速度
                        </span>
                        <span className="font-mono text-gray-500">
                          {params.rotationSpeed.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="5.0"
                        step="0.1"
                        value={params.rotationSpeed}
                        onChange={(e) =>
                          onParamChange(
                            "rotationSpeed",
                            Number.parseFloat(e.target.value),
                          )
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={params.spawnNewAgents}
                          onChange={(e) =>
                            onParamChange(
                              "spawnNewAgents",
                              e.target.checked,
                            )
                          }
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-gray-700">
                          画面外から継続登場
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={params.maintainPopulation}
                          onChange={(e) =>
                            onParamChange(
                              "maintainPopulation",
                              e.target.checked,
                            )
                          }
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-gray-700">
                          初期数を下回った場合のみ登場
                        </span>
                      </label>

                      {params.spawnNewAgents && (
                        <div>
                          <div className="flex justify-between mb-1 mt-1">
                            <span className="text-gray-600 text-[11px]">
                              登場頻度 (1秒あたりの平均数)
                            </span>
                            <span className="font-mono text-gray-500 text-[11px]">
                              {params.spawnRate.toFixed(1)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            value={params.spawnRate}
                            onChange={(e) =>
                              onParamChange(
                                "spawnRate",
                                Number.parseFloat(e.target.value),
                              )
                            }
                            className="w-full accent-indigo-600 cursor-pointer"
                          />
                        </div>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={params.debugMode}
                          onChange={(e) =>
                            onParamChange("debugMode", e.target.checked)
                          }
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-gray-700">
                          物理デバッグモード (剛体・力・拘束の可視化)
                        </span>
                      </label>

                      {params.debugMode && (
                        <div className="pl-6 space-y-1 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={params.debugVectors}
                              onChange={(e) =>
                                onParamChange(
                                  "debugVectors",
                                  e.target.checked,
                                )
                              }
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                            <span className="text-[11px] text-gray-600">
                              動き（速度）・加わる力の矢印ベクトル表示
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Agent Settings */}
              <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("agent")}
                  className="w-full p-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between font-bold text-gray-800 border-b border-gray-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShapesIcon className="w-4 h-4 text-emerald-600" />
                    <span>エージェント形状</span>
                  </div>
                  {openSections.agent ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {openSections.agent && (
                  <div className="p-3 space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          ボディの基本半径
                        </span>
                        <span className="font-mono text-gray-500">
                          {params.baseRadius}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        step="1"
                        value={params.baseRadius}
                        onChange={(e) =>
                          onParamChange(
                            "baseRadius",
                            Number.parseInt(e.target.value, 10),
                          )
                        }
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          腕の長さ
                        </span>
                        <span className="font-mono text-gray-500">
                          {params.armLength}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        step="1"
                        value={params.armLength}
                        onChange={(e) =>
                          onParamChange(
                            "armLength",
                            Number.parseInt(e.target.value, 10),
                          )
                        }
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          腕の太さ
                        </span>
                        <span className="font-mono text-gray-500">
                          {params.armThickness}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        step="1"
                        value={params.armThickness}
                        onChange={(e) =>
                          onParamChange(
                            "armThickness",
                            Number.parseInt(e.target.value, 10),
                          )
                        }
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <span className="font-medium text-gray-700 block mb-1">
                        腕の配置パターン
                      </span>
                      <select
                        value={params.armPattern}
                        onChange={(e) =>
                          onParamChange(
                            "armPattern",
                            e.target.value as ArmPattern,
                          )
                        }
                        className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-800 text-xs focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="one_right">1本 (右)</option>
                        <option value="left_right">2本 (左右反対)</option>
                        <option value="right_top">
                          2本 (直角: 右と上)
                        </option>
                        <option value="right_two">2本 (右側に平行)</option>
                        <option value="three_120">
                          3本 (120度等間隔)
                        </option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Connection & Rigid Rules */}
              <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("connection")}
                  className="w-full p-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between font-bold text-gray-800 border-b border-gray-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-blue-600" />
                    <span>接着・剛体化ルール</span>
                  </div>
                  {openSections.connection ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {openSections.connection && (
                  <div className="p-3 space-y-3">
                    <div>
                      <span className="font-medium text-gray-700 block mb-1">
                        接着する対象部位
                      </span>
                      <select
                        value={params.targetRule}
                        onChange={(e) =>
                          onParamChange(
                            "targetRule",
                            e.target.value as TargetRule,
                          )
                        }
                        className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-800 text-xs focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="any">どこでも接着 (Any)</option>
                        <option value="body_body">
                          ボディ同士のみ (Body to Body)
                        </option>
                        <option value="arm_arm">
                          腕同士のみ (Arm to Arm)
                        </option>
                        <option value="arm_body">
                          腕とボディのみ (Arm to Body)
                        </option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          接着バネの硬さ (Stiffness)
                        </span>
                        <span className="font-mono text-gray-500">
                          {params.stiffness.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="1.0"
                        step="0.01"
                        value={params.stiffness}
                        onChange={(e) =>
                          onParamChange(
                            "stiffness",
                            Number.parseFloat(e.target.value),
                          )
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={params.compoundOnAlign}
                          onChange={(e) =>
                            onParamChange(
                              "compoundOnAlign",
                              e.target.checked,
                            )
                          }
                          className="mt-0.5 rounded text-blue-600 focus:ring-0"
                        />
                        <div className="text-gray-700 leading-snug">
                          <span className="font-medium block">
                            一直線で複合剛体に結合 (Compound)
                          </span>
                          <span className="text-[11px] text-gray-500">
                            腕が揃った時点で1つの剛体に結合し、高速回転バグを防止して安定した巨大な塊を形成します
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Mouse Interaction */}
              <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("interaction")}
                  className="w-full p-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between font-bold text-gray-800 border-b border-gray-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MousePointerIcon className="w-4 h-4 text-purple-600" />
                    <span>マウス操作</span>
                  </div>
                  {openSections.interaction ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {openSections.interaction && (
                  <div className="p-3 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={params.interactionEnable}
                        onChange={(e) =>
                          onParamChange(
                            "interactionEnable",
                            e.target.checked,
                          )
                        }
                        className="rounded text-purple-600 focus:ring-0"
                      />
                      <span className="font-medium text-gray-700">
                        マウスインタラクションを有効化
                      </span>
                    </label>

                    {params.interactionEnable && (
                      <>
                        <div>
                          <span className="font-medium text-gray-700 block mb-1">
                            反応モード
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onParamChange("interactionMode", "attract")
                              }
                              className={`py-1.5 px-2 rounded border text-xs font-medium cursor-pointer transition ${
                                params.interactionMode === "attract"
                                  ? "bg-purple-50 border-purple-500 text-purple-700 font-bold"
                                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              引き寄せる (Attract)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onParamChange("interactionMode", "repel")
                              }
                              className={`py-1.5 px-2 rounded border text-xs font-medium cursor-pointer transition ${
                                params.interactionMode === "repel"
                                  ? "bg-purple-50 border-purple-500 text-purple-700 font-bold"
                                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              反発する (Repel)
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium text-gray-700">
                              力の強さ
                            </span>
                            <span className="font-mono text-gray-500">
                              {params.interactionForce.toFixed(1)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="15.0"
                            step="0.1"
                            value={params.interactionForce}
                            onChange={(e) =>
                              onParamChange(
                                "interactionForce",
                                Number.parseFloat(e.target.value),
                              )
                            }
                            className="w-full accent-purple-600 cursor-pointer"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Section 5: Color Settings */}
              <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("color")}
                  className="w-full p-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between font-bold text-gray-800 border-b border-gray-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <PaletteIcon className="w-4 h-4 text-amber-600" />
                    <span>カラー設定</span>
                  </div>
                  {openSections.color ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {openSections.color && (
                  <div className="p-3 space-y-3">
                    <div>
                      <span className="font-medium text-gray-700 block mb-1">
                        カラーパレット
                      </span>
                      <select
                        value={params.paletteIndex}
                        onChange={(e) =>
                          onParamChange(
                            "paletteIndex",
                            Number.parseInt(e.target.value, 10),
                          )
                        }
                        className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-800 text-xs focus:ring-1 focus:ring-amber-500"
                      >
                        {PREDEFINED_PALETTES.map((pal, idx) => (
                          <option key={pal.title} value={idx}>
                            {pal.title}
                          </option>
                        ))}
                      </select>

                      {/* Palette preview swatches */}
                      <div className="flex h-4 rounded overflow-hidden mt-1.5 border border-gray-300">
                        {PREDEFINED_PALETTES[
                          params.paletteIndex
                        ].colors.map((c) => (
                          <div
                            key={c}
                            className="flex-1"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">
                        背景色
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={params.backgroundColor}
                          onChange={(e) =>
                            onParamChange(
                              "backgroundColor",
                              e.target.value,
                            )
                          }
                          className="w-7 h-7 rounded border border-gray-300 p-0.5 cursor-pointer"
                        />
                        <span className="font-mono text-gray-600 text-xs">
                          {params.backgroundColor}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={params.uniformColor}
                          onChange={(e) =>
                            onParamChange("uniformColor", e.target.checked)
                          }
                          className="rounded text-amber-600 focus:ring-0"
                        />
                        <span className="text-gray-700">
                          全エージェントを同じ色で統一
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={params.darkerArmColor}
                          onChange={(e) =>
                            onParamChange(
                              "darkerArmColor",
                              e.target.checked,
                            )
                          }
                          className="rounded text-amber-600 focus:ring-0"
                        />
                        <span className="text-gray-700">
                          腕の色をボディより少し暗くする
                        </span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={onRandomizePalette}
                      className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 py-1.5 px-3 rounded font-medium transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-xs"
                    >
                      <SparklesIcon className="w-3.5 h-3.5 text-amber-700" />
                      <span>パレット・背景をランダム変更</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Section 6: Actions & Export */}
              <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("export")}
                  className="w-full p-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between font-bold text-gray-800 border-b border-gray-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <DownloadIcon className="w-4 h-4 text-rose-600" />
                    <span>ファイル & 書き出し</span>
                  </div>
                  {openSections.export ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {openSections.export && (
                  <div className="p-3 space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          画像書き出し解像度倍率
                        </span>
                        <span className="font-mono text-gray-500">
                          {params.exportScaleMultiplier}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={params.exportScaleMultiplier}
                        onChange={(e) =>
                          onParamChange(
                            "exportScaleMultiplier",
                            Number.parseInt(e.target.value, 10),
                          )
                        }
                        className="w-full accent-rose-600 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={onExportJpg}
                        title="高精細JPG画像と設定ファイルを書き出し"
                        className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 py-2 px-2.5 rounded font-medium transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
                        <span>高解像度 JPG</span>
                      </button>

                      <button
                        type="button"
                        onClick={onExportSvg}
                        title="p5.js-svg によるベクターSVG書き出し"
                        className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 py-2 px-2.5 rounded font-medium transition flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-xs"
                      >
                        <FileCodeIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>ベクター SVG</span>
                      </button>
                    </div>

                    {/* MP4 Recording Control */}
                    <div>
                      {recordingState.isRecording ? (
                        <button
                          type="button"
                          onClick={onStopRecord}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm animate-pulse"
                        >
                          <span className="w-2 h-2 rounded-full bg-white" />
                          <span>録画停止 (Sキー)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onStartRecord}
                          className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 px-3 rounded font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          <VideoIcon className="w-4 h-4 text-red-400" />
                          <span>MP4 録画開始 (Rキー)</span>
                        </button>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1 text-center">
                        mp4-muxer による 60fps H.264 MP4 直接録画
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={onExportJsonc}
                        className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-1.5 px-2 rounded transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                      >
                        <SaveIcon className="w-3 h-3 text-gray-500" />
                        <span>設定保存 (JSONC)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-1.5 px-2 rounded transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                      >
                        <FolderOpenIcon className="w-3 h-3 text-gray-500" />
                        <span>読込 (JSONC)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
