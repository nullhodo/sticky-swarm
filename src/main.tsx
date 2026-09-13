import { useAtom } from "jotai";
import p5 from "p5";
import p5Svg from "p5.js-svg";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
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
        "darkerArmColor",
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
    ];
    const targetRules: TargetRule[] = [
      "any",
      "body_body",
      "arm_arm",
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
    const randomBg =
      selectedPalette.colors[
        Math.floor(Math.random() * selectedPalette.colors.length)
      ];
    const availableColors = selectedPalette.colors.filter(
      (c) => c.toUpperCase() !== randomBg.toUpperCase(),
    );

    const updated: SwarmParameters = {
      ...paramsRef.current,
      paletteIndex: randomPaletteIdx,
      backgroundColor: randomBg,
      availableObjectColors:
        availableColors.length > 0
          ? availableColors
          : ["#FFFFFF", "#000000"],
    };

    setParams(updated);
    paramsRef.current = updated;
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
          isRestoringHistoryRef.current = true;
          setParams(parsed);
          paramsRef.current = parsed;
          handleRestart();
          pushStateToHistory(parsed);
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

      p.draw = () => {
        const engine = engineRef.current;
        if (!engine) return;

        const currentParams = paramsRef.current;

        // Apply mouse interaction if within canvas
        if (
          currentParams.interactionEnable &&
          p.mouseX >= 0 &&
          p.mouseX <= p.width &&
          p.mouseY >= 0 &&
          p.mouseY <= p.height
        ) {
          const scaleFactor = Math.min(
            p.width / LOGICAL_SPACE_WIDTH,
            p.height / LOGICAL_SPACE_HEIGHT,
          );
          const offsetX =
            (p.width - LOGICAL_SPACE_WIDTH * scaleFactor) / 2;
          const offsetY =
            (p.height - LOGICAL_SPACE_HEIGHT * scaleFactor) / 2;
          const logicalMouseX = (p.mouseX - offsetX) / scaleFactor;
          const logicalMouseY = (p.mouseY - offsetY) / scaleFactor;

          engine.applyMouseInteraction(logicalMouseX, logicalMouseY);
        }

        // Step physics simulation
        engine.step(currentParams);

        // Render viewport
        p.background(currentParams.backgroundColor);

        const scaleFactor = Math.min(
          p.width / LOGICAL_SPACE_WIDTH,
          p.height / LOGICAL_SPACE_HEIGHT,
        );
        const offsetX = (p.width - LOGICAL_SPACE_WIDTH * scaleFactor) / 2;
        const offsetY =
          (p.height - LOGICAL_SPACE_HEIGHT * scaleFactor) / 2;

        p.push();
        p.translate(offsetX, offsetY);
        p.scale(scaleFactor);

        // Draw connections
        p.stroke(255, 100);
        p.strokeWeight(2);
        for (let i = 0; i < engine.activeConstraints.length; i++) {
          const c = engine.activeConstraints[i].constraint;
          if (c.bodyA && c.bodyB) {
            p.line(
              c.bodyA.position.x,
              c.bodyA.position.y,
              c.bodyB.position.x,
              c.bodyB.position.y,
            );
          }
        }

        // Draw agents
        p.noStroke();
        const debugMode = currentParams.debugMode;
        const debugVectors = currentParams.debugVectors;

        for (let i = 0; i < engine.agents.length; i++) {
          const agent = engine.agents[i];
          const body = agent.physicsBody;

          p.push();
          p.translate(body.position.x, body.position.y);
          p.rotate(body.angle);

          if (debugMode) {
            p.stroke(0, 255, 0);
            p.strokeWeight(1.5);
          } else {
            p.noStroke();
          }

          for (let j = 0; j < agent.renderParts.length; j++) {
            const rp = agent.renderParts[j];
            p.push();
            p.translate(rp.localX, rp.localY);
            p.rotate(rp.localAngle);
            p.fill(rp.color);

            if (rp.type === "circle" && rp.radius) {
              p.circle(0, 0, rp.radius * 2);
            } else if (rp.type === "rect" && rp.width && rp.height) {
              p.rectMode(p.CENTER);
              p.rect(0, 0, rp.width, rp.height);
            }
            p.pop();
          }
          p.pop();

          // Motion & Force vector arrows in debug mode
          if (debugMode && debugVectors) {
            // Velocity Vector (Cyan: 動き・速度)
            drawArrow(
              p,
              body.position.x,
              body.position.y,
              body.velocity.x * 12,
              body.velocity.y * 12,
              "#00E5FF",
              4.5,
              12,
            );

            // Force Vector (Coral/Orange: 加わる力)
            if (agent.lastAppliedForce) {
              drawArrow(
                p,
                body.position.x,
                body.position.y,
                agent.lastAppliedForce.x * 3000,
                agent.lastAppliedForce.y * 3000,
                "#FF5722",
                4.5,
                12,
              );
            }
          }
        }

        p.pop();

        // Debug HUD overlay
        if (debugMode) {
          p.push();
          const hudX = p.width - 240;
          const hudY = 16;
          p.fill(0, 0, 0, 180);
          p.stroke(255, 255, 255, 40);
          p.strokeWeight(1);
          p.rect(hudX, hudY, 224, debugVectors ? 135 : 64, 6);

          p.noStroke();
          p.fill(255);
          p.textSize(12);
          p.textAlign(p.LEFT, p.TOP);
          p.text(`Agents: ${engine.agents.length}`, hudX + 12, hudY + 10);
          p.text(
            `Constraints: ${engine.activeConstraints.length}`,
            hudX + 12,
            hudY + 28,
          );

          if (debugVectors) {
            // Cyan: Velocity
            p.stroke("#00E5FF");
            p.strokeWeight(3.5);
            p.line(hudX + 12, hudY + 54, hudX + 28, hudY + 54);
            p.noStroke();
            p.fill("#00E5FF");
            p.text("動き・速度 (Velocity)", hudX + 34, hudY + 48);

            // Coral: Force
            p.stroke("#FF5722");
            p.strokeWeight(3.5);
            p.line(hudX + 12, hudY + 74, hudX + 28, hudY + 74);
            p.noStroke();
            p.fill("#FF5722");
            p.text("加わる力 (Force)", hudX + 34, hudY + 68);

            // White: Constraint line
            p.stroke(255, 180);
            p.strokeWeight(2);
            p.line(hudX + 12, hudY + 94, hudX + 28, hudY + 94);
            p.noStroke();
            p.fill(255);
            p.text("接着バネ (Constraint)", hudX + 34, hudY + 88);

            // Green: Hull
            p.stroke(0, 255, 0);
            p.strokeWeight(1.5);
            p.noFill();
            p.rect(hudX + 12, hudY + 112, 14, 10);
            p.noStroke();
            p.fill(0, 255, 0);
            p.text("剛体 (Collision Hull)", hudX + 34, hudY + 110);
          }
          p.pop();
        }
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
  }, [setRecordingState]);

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
      />

      <RecordingOverlay onStopRecord={handleStopRecord} />
    </div>
  );
};

function drawArrow(
  p: p5,
  fromX: number,
  fromY: number,
  vecX: number,
  vecY: number,
  colorStr: string,
  strokeW = 4.5,
  headSize = 12,
): void {
  const lenSq = vecX * vecX + vecY * vecY;
  if (lenSq < 4) return; // Don't draw tiny jitter vectors

  const toX = fromX + vecX;
  const toY = fromY + vecY;

  p.push();
  p.stroke(colorStr);
  p.strokeWeight(strokeW);
  p.line(fromX, fromY, toX, toY);

  const angle = Math.atan2(vecY, vecX);
  p.push();
  p.translate(toX, toY);
  p.rotate(angle);
  p.fill(colorStr);
  p.noStroke();
  p.triangle(
    0,
    0,
    -headSize,
    -headSize * 0.45,
    -headSize,
    headSize * 0.45,
  );
  p.pop();

  p.pop();
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
