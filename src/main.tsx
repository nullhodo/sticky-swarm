import { useAtom } from "jotai";
import p5 from "p5";
import p5Svg from "p5.js-svg";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { ControlPanel } from "./components/ControlPanel";
import { RecordingOverlay } from "./components/RecordingOverlay";
import { PREDEFINED_PALETTES } from "./constants/palettes";
import {
  exportHighResolutionImage,
  exportJsoncFile,
  exportSvgVector,
  parseJsoncContent,
} from "./core/exporter";
import { VideoRecorderManager } from "./core/recorder";
import {
  LOGICAL_SPACE_HEIGHT,
  LOGICAL_SPACE_WIDTH,
  SwarmEngine,
} from "./core/swarmEngine";
import { renderSwarmScene } from "./core/swarmRenderer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import "./index.css";
import {
  historyPointerAtom,
  historyStackAtom,
  isPanelOpenAtom,
  recordingStateAtom,
  swarmParamsAtom,
} from "./state/swarmStore";
import type {
  ArmPattern,
  SwarmParameters,
  TargetRule,
} from "./types/swarm";

// Initialize p5 SVG plugin
p5Svg(p5);

// Set [DEV] title prefix in local development mode
if (import.meta.env.DEV && !document.title.startsWith("[DEV]")) {
  document.title = `[DEV] ${document.title}`;
}

const App: React.FC = () => {
  const [params, setParams] = useAtom(swarmParamsAtom);
  const [, setRecordingState] = useAtom(recordingStateAtom);
  const [, setIsPanelOpen] = useAtom(isPanelOpenAtom);
  const [historyStack, setHistoryStack] = useAtom(historyStackAtom);
  const [historyPointer, setHistoryPointer] = useAtom(historyPointerAtom);

  const p5ContainerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const engineRef = useRef<SwarmEngine | null>(null);
  const recorderRef = useRef<VideoRecorderManager | null>(null);

  const paramsRef = useRef<SwarmParameters>(params);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoringHistoryRef = useRef(false);

  // Viewport Zoom & Pan State
  const zoomLevelRef = useRef(1.0);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const [zoomDisplay, setZoomDisplay] = useState(1.0);

  const handleResetZoom = useCallback(() => {
    zoomLevelRef.current = 1.0;
    panOffsetRef.current = { x: 0, y: 0 };
    setZoomDisplay(1.0);
  }, []);

  const handleZoomIn = useCallback(() => {
    zoomLevelRef.current = Math.min(5.0, zoomLevelRef.current * 1.2);
    setZoomDisplay(zoomLevelRef.current);
  }, []);

  const handleZoomOut = useCallback(() => {
    zoomLevelRef.current = Math.max(0.2, zoomLevelRef.current / 1.2);
    setZoomDisplay(zoomLevelRef.current);
  }, []);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Push new state to history stack
  const pushStateToHistory = useCallback(
    (newParams: SwarmParameters) => {
      if (isRestoringHistoryRef.current) return;
      setHistoryStack((prev) => {
        const sliced = prev.slice(0, historyPointer + 1);
        return [...sliced, JSON.parse(JSON.stringify(newParams))];
      });
      setHistoryPointer((prev) => prev + 1);
    },
    [historyPointer, setHistoryStack, setHistoryPointer],
  );

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset(paramsRef.current);
    }
  }, []);

  const handleParamChange = useCallback(
    (
      key: keyof SwarmParameters,
      val: SwarmParameters[keyof SwarmParameters],
    ) => {
      const updated: SwarmParameters = {
        ...paramsRef.current,
        [key]: val,
      };

      // If palette changed, ensure available colors and background match
      if (key === "paletteIndex") {
        const pal = PREDEFINED_PALETTES[val as number];
        const allColors = [...pal.colors];
        const bg = updated.backgroundColor.toUpperCase();
        updated.availableObjectColors = allColors.filter(
          (c) => c.toUpperCase() !== bg,
        );
        if (updated.availableObjectColors.length === 0) {
          updated.availableObjectColors = ["#FFFFFF", "#000000"];
        }
      }

      setParams(updated);
      paramsRef.current = updated;

      // Dynamic color updates without resetting simulation
      if (key === "uniformColorHex" && typeof val === "string") {
        if (engineRef.current) {
          engineRef.current.applyUniformColor(val, updated.darkerArmColor);
          engineRef.current.currentParams = updated;
        }
        pushStateToHistory(updated);
        return;
      }

      if (
        (key === "darkerArmColor" || key === "uniformColor") &&
        updated.uniformColor
      ) {
        if (engineRef.current) {
          const colorToUse =
            updated.uniformColorHex ||
            updated.availableObjectColors[0] ||
            "#A6171C";
          engineRef.current.applyUniformColor(
            colorToUse,
            updated.darkerArmColor,
          );
          engineRef.current.currentParams = updated;
        }
        pushStateToHistory(updated);
        return;
      }

      // Keys that require simulation regeneration
      const structuralKeys: (keyof SwarmParameters)[] = [
        "agentCount",
        "baseRadius",
        "armLength",
        "armThickness",
        "armPattern",
        "targetRule",
        "stiffness",
        "paletteIndex",
        "uniformColor",
      ];

      if (structuralKeys.includes(key)) {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          handleRestart();
          pushStateToHistory(updated);
        }, 150);
      } else {
        if (engineRef.current) {
          engineRef.current.currentParams = updated;
        }
        pushStateToHistory(updated);
      }
    },
    [setParams, handleRestart, pushStateToHistory],
  );

  const handleRandomizeAll = useCallback(() => {
    const armPatterns: ArmPattern[] = [
      "one_right",
      "left_right",
      "right_top",
      "right_two",
      "three_120",
      "four_90",
      "six_60",
      "two_random_cardinal",
    ];
    const targetRules: TargetRule[] = [
      "any",
      "body_body",
      "arm_arm",
      "arm_tip_any_angle",
      "arm_body",
    ];

    const randomPaletteIdx = Math.floor(
      Math.random() * PREDEFINED_PALETTES.length,
    );
    const selectedPalette = PREDEFINED_PALETTES[randomPaletteIdx];
    const randomBg =
      selectedPalette.colors[
        Math.floor(Math.random() * selectedPalette.colors.length)
      ];

    const availableColors = selectedPalette.colors.filter(
      (c) => c.toUpperCase() !== randomBg.toUpperCase(),
    );

    const randomized: SwarmParameters = {
      ...paramsRef.current,
      agentCount: Math.floor(20 + Math.random() * 100),
      movementSpeed: Number.parseFloat(
        (0.5 + Math.random() * 2.5).toFixed(1),
      ),
      rotationSpeed: Number.parseFloat((Math.random() * 2.0).toFixed(1)),
      baseRadius: Math.floor(10 + Math.random() * 25),
      armLength: Math.floor(15 + Math.random() * 40),
      armThickness: Math.floor(3 + Math.random() * 10),
      armPattern:
        armPatterns[Math.floor(Math.random() * armPatterns.length)],
      targetRule:
        targetRules[Math.floor(Math.random() * targetRules.length)],
      stiffness: Number.parseFloat(
        (0.05 + Math.random() * 0.45).toFixed(2),
      ),
      compoundOnAlign: Math.random() > 0.3,
      paletteIndex: randomPaletteIdx,
      backgroundColor: randomBg,
      availableObjectColors:
        availableColors.length > 0
          ? availableColors
          : ["#FFFFFF", "#000000"],
      uniformColor: Math.random() > 0.5,
      darkerArmColor: Math.random() > 0.5,
      spawnNewAgents: Math.random() > 0.5,
      maintainPopulation: Math.random() > 0.5,
    };

    setParams(randomized);
    paramsRef.current = randomized;
    handleRestart();
    pushStateToHistory(randomized);
  }, [setParams, handleRestart, pushStateToHistory]);

  const handleRandomizePalette = useCallback(() => {
    const randomPaletteIdx = Math.floor(
      Math.random() * PREDEFINED_PALETTES.length,
    );
    const selectedPalette = PREDEFINED_PALETTES[randomPaletteIdx];
    const bgIndex = Math.floor(
      Math.random() * selectedPalette.colors.length,
    );
    const randomBg = selectedPalette.colors[bgIndex];

    const availableColors = selectedPalette.colors.filter(
      (c) => c.toUpperCase() !== randomBg.toUpperCase(),
    );
    const candidateColors =
      availableColors.length > 0
        ? availableColors
        : selectedPalette.colors;

    const randomAgentColor =
      candidateColors[Math.floor(Math.random() * candidateColors.length)];

    const updated: SwarmParameters = {
      ...paramsRef.current,
      paletteIndex: randomPaletteIdx,
      backgroundColor: randomBg,
      availableObjectColors: candidateColors,
      uniformColorHex: randomAgentColor,
    };

    setParams(updated);
    paramsRef.current = updated;
    if (engineRef.current && updated.uniformColor) {
      engineRef.current.applyUniformColor(
        randomAgentColor,
        updated.darkerArmColor,
      );
    }
    handleRestart();
    pushStateToHistory(updated);
  }, [setParams, handleRestart, pushStateToHistory]);

  const handleUndo = useCallback(() => {
    if (historyPointer > 0) {
      const nextPointer = historyPointer - 1;
      const targetState = historyStack[nextPointer];
      isRestoringHistoryRef.current = true;
      setHistoryPointer(nextPointer);
      setParams(targetState);
      paramsRef.current = targetState;
      handleRestart();
      setTimeout(() => {
        isRestoringHistoryRef.current = false;
      }, 50);
    }
  }, [
    historyPointer,
    historyStack,
    setHistoryPointer,
    setParams,
    handleRestart,
  ]);

  const handleRedo = useCallback(() => {
    if (historyPointer < historyStack.length - 1) {
      const nextPointer = historyPointer + 1;
      const targetState = historyStack[nextPointer];
      isRestoringHistoryRef.current = true;
      setHistoryPointer(nextPointer);
      setParams(targetState);
      paramsRef.current = targetState;
      handleRestart();
      setTimeout(() => {
        isRestoringHistoryRef.current = false;
      }, 50);
    }
  }, [
    historyPointer,
    historyStack,
    setHistoryPointer,
    setParams,
    handleRestart,
  ]);

  const handleStartRecord = useCallback(async () => {
    if (recorderRef.current) {
      await recorderRef.current.startRecording();
    }
  }, []);

  const handleStopRecord = useCallback(async () => {
    if (recorderRef.current) {
      await recorderRef.current.stopRecording();
    }
  }, []);

  const handleExportJpg = useCallback(() => {
    if (p5InstanceRef.current && engineRef.current) {
      exportHighResolutionImage(
        p5InstanceRef.current,
        engineRef.current,
        paramsRef.current,
      );
    }
  }, []);

  const handleExportSvg = useCallback(() => {
    if (p5InstanceRef.current && engineRef.current) {
      exportSvgVector(
        p5InstanceRef.current,
        engineRef.current,
        paramsRef.current,
      );
    }
  }, []);

  const handleExportJsonc = useCallback(() => {
    exportJsoncFile(paramsRef.current);
  }, []);

  const handleImportJsonc = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (readEvent) => {
        try {
          const raw = readEvent.target?.result as string;
          const parsed = parseJsoncContent(raw);
          const merged: SwarmParameters = {
            ...paramsRef.current,
            ...parsed,
          };
          isRestoringHistoryRef.current = true;
          setParams(merged);
          paramsRef.current = merged;
          handleRestart();
          pushStateToHistory(merged);
          setTimeout(() => {
            isRestoringHistoryRef.current = false;
          }, 50);
        } catch (err) {
          console.error("Failed to parse JSONC:", err);
          alert(
            "設定ファイルの読み込みに失敗しました。フォーマットを確認してください。",
          );
        }
        e.target.value = "";
      };
      reader.readAsText(file);
    },
    [setParams, handleRestart, pushStateToHistory],
  );

  useKeyboardShortcuts({
    onRandomizeAll: handleRandomizeAll,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onTogglePanel: () => setIsPanelOpen((prev) => !prev),
    onStartRecord: handleStartRecord,
    onStopRecord: handleStopRecord,
    onExportImage: handleExportJpg,
    onRestart: handleRestart,
    onResetZoom: handleResetZoom,
  });

  // p5 Sketch Lifecycle
  useEffect(() => {
    if (!p5ContainerRef.current) return;

    const sketch = (p: p5) => {
      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        if (p5ContainerRef.current) {
          canvas.parent(p5ContainerRef.current);
        }
        p.pixelDensity(window.devicePixelRatio || 1);
        p.frameRate(60);

        const canvasEl = canvas.elt as HTMLCanvasElement;
        recorderRef.current = new VideoRecorderManager(
          canvasEl,
          (recording, elapsedSec) => {
            setRecordingState({
              isRecording: recording,
              elapsedSeconds: elapsedSec,
            });
          },
        );

        // Initialize Swarm Physics Engine
        const engine = new SwarmEngine(paramsRef.current);
        engine.setNoiseFunction((t) => p.noise(t));
        engine.reset(paramsRef.current);
        engineRef.current = engine;
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        const canvasEl = p5ContainerRef.current?.querySelector("canvas");
        if (recorderRef.current && canvasEl) {
          recorderRef.current.setCanvas(canvasEl);
        }
      };

      p.mouseWheel = (event: { deltaY: number; target?: EventTarget }) => {
        const canvasEl = p5ContainerRef.current?.querySelector("canvas");
        const targetEl = event?.target as HTMLElement | undefined;
        const hoveredEl = document.elementFromPoint(p.mouseX, p.mouseY);

        if (
          (targetEl && canvasEl && targetEl !== canvasEl) ||
          (hoveredEl && canvasEl && hoveredEl !== canvasEl)
        ) {
          return true;
        }

        const mx = p.mouseX;
        const my = p.mouseY;

        if (mx < 0 || mx > p.width || my < 0 || my > p.height) {
          return true;
        }

        const baseScale = Math.min(
          p.width / LOGICAL_SPACE_WIDTH,
          p.height / LOGICAL_SPACE_HEIGHT,
        );
        const baseOffsetX =
          (p.width - LOGICAL_SPACE_WIDTH * baseScale) / 2;
        const baseOffsetY =
          (p.height - LOGICAL_SPACE_HEIGHT * baseScale) / 2;

        const currentZoom = zoomLevelRef.current;
        const currentPan = panOffsetRef.current;

        const currentTotalScale = baseScale * currentZoom;
        const currentTotalOffsetX = baseOffsetX + currentPan.x;
        const currentTotalOffsetY = baseOffsetY + currentPan.y;

        const logicalX = (mx - currentTotalOffsetX) / currentTotalScale;
        const logicalY = (my - currentTotalOffsetY) / currentTotalScale;

        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = Math.min(
          5.0,
          Math.max(0.2, currentZoom * zoomFactor),
        );

        const nextTotalScale = baseScale * nextZoom;
        const nextPanX = mx - baseOffsetX - logicalX * nextTotalScale;
        const nextPanY = my - baseOffsetY - logicalY * nextTotalScale;

        zoomLevelRef.current = nextZoom;
        panOffsetRef.current = { x: nextPanX, y: nextPanY };
        setZoomDisplay(nextZoom);

        return false;
      };

      p.doubleClicked = () => {
        handleResetZoom();
      };

      p.draw = () => {
        const engine = engineRef.current;
        if (!engine) return;

        const currentParams = paramsRef.current;

        const baseScale = Math.min(
          p.width / LOGICAL_SPACE_WIDTH,
          p.height / LOGICAL_SPACE_HEIGHT,
        );
        const baseOffsetX =
          (p.width - LOGICAL_SPACE_WIDTH * baseScale) / 2;
        const baseOffsetY =
          (p.height - LOGICAL_SPACE_HEIGHT * baseScale) / 2;

        const zoom = zoomLevelRef.current;
        const pan = panOffsetRef.current;

        const totalScale = baseScale * zoom;
        const totalOffsetX = baseOffsetX + pan.x;
        const totalOffsetY = baseOffsetY + pan.y;

        // Apply mouse interaction if within canvas
        if (
          currentParams.interactionEnable &&
          p.mouseX >= 0 &&
          p.mouseX <= p.width &&
          p.mouseY >= 0 &&
          p.mouseY <= p.height
        ) {
          const logicalMouseX = (p.mouseX - totalOffsetX) / totalScale;
          const logicalMouseY = (p.mouseY - totalOffsetY) / totalScale;

          engine.applyMouseInteraction(logicalMouseX, logicalMouseY);
        }

        const currentFps = Math.round(p.frameRate());

        // Step physics simulation
        engine.step(currentParams, currentFps);

        // Render viewport with unified renderer
        renderSwarmScene(p, engine, p.width, p.height, currentParams, {
          drawDebug: true,
          zoomLevel: zoom,
          panOffset: pan,
          fps: currentFps,
        });
      };
    };

    const instance = new p5(sketch);
    p5InstanceRef.current = instance;

    return () => {
      instance.remove();
      p5InstanceRef.current = null;
      engineRef.current = null;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [setRecordingState, handleResetZoom]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950 select-none">
      <div ref={p5ContainerRef} className="absolute inset-0" />

      <ControlPanel
        onParamChange={handleParamChange}
        onRestart={handleRestart}
        onRandomizeAll={handleRandomizeAll}
        onRandomizePalette={handleRandomizePalette}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExportJpg={handleExportJpg}
        onExportSvg={handleExportSvg}
        onStartRecord={handleStartRecord}
        onStopRecord={handleStopRecord}
        onExportJsonc={handleExportJsonc}
        onImportJsonc={handleImportJsonc}
        zoomDisplay={zoomDisplay}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />

      <RecordingOverlay onStopRecord={handleStopRecord} />
    </div>
  );
};

export default App;

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
