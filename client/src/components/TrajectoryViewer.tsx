import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EVAL_REPLAY_MODEL,
  getTrajectorySteps,
  SAMPLE_TASKS,
  type TrajectoryStep,
} from "@/data/benchmarkContent";

type TrajectoryViewerProps = {
  taskId?: string;
};

function StepCard({
  step,
  active,
  onClick,
}: {
  step: TrajectoryStep;
  active: boolean;
  onClick: () => void;
}) {
  const bg =
    step.kind === "evaluation"
      ? step.passed
        ? "bg-emerald-950/80 border-emerald-700/50"
        : "bg-red-950/80 border-red-800/50"
      : step.kind === "response"
        ? "bg-slate-800/80 border-slate-600/50"
        : "bg-slate-800/60 border-slate-700/50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${bg} ${
        active ? "ring-1 ring-teal-400" : "hover:brightness-110"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{step.label}</p>
      <p className="text-xs text-slate-200 leading-snug">{step.summary}</p>
      {step.kind === "evaluation" && (
        <p className="text-[10px] mt-1 text-slate-400">click for details →</p>
      )}
    </button>
  );
}

export function TrajectoryViewer({ taskId }: TrajectoryViewerProps) {
  const [activeTaskId, setActiveTaskId] = useState(taskId ?? SAMPLE_TASKS[0]?.id ?? "");
  const [stepIdx, setStepIdx] = useState(0);
  const [detailStep, setDetailStep] = useState<TrajectoryStep | null>(null);

  useEffect(() => {
    if (taskId) {
      setActiveTaskId(taskId);
      setStepIdx(0);
      setDetailStep(null);
    }
  }, [taskId]);

  const activeTask = SAMPLE_TASKS.find((t) => t.id === activeTaskId) ?? SAMPLE_TASKS[0];

  const steps = useMemo(() => {
    if (!activeTask) return [];
    return getTrajectorySteps(activeTask, EVAL_REPLAY_MODEL);
  }, [activeTask]);

  const evalStep = steps.find((s) => s.kind === "evaluation");
  const passedMatch = evalStep?.summary.match(/(\d+)\s*\/\s*(\d+)/);
  const passedCount = passedMatch ? parseInt(passedMatch[1], 10) : 0;
  const totalCp = passedMatch ? parseInt(passedMatch[2], 10) : activeTask?.evaluationCheckpoints.length ?? 0;

  const currentStep = detailStep ?? steps[stepIdx];

  const goPrev = () => {
    setDetailStep(null);
    setStepIdx((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    setDetailStep(null);
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  };

  if (!activeTask || steps.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">
        Select a task above to view evaluation replay.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
        {SAMPLE_TASKS.map((t) => {
          const active = activeTaskId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTaskId(t.id);
                setStepIdx(0);
                setDetailStep(null);
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
              }`}
            >
              {t.taskName}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{activeTask.title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeTaskId} · {EVAL_REPLAY_MODEL} (gpt-5-mini eval) · {passedCount} / {totalCp} checkpoints
              passed
            </p>
          </div>
          <span className="text-xs text-teal-700 font-medium flex items-center gap-1 shrink-0">
            Evaluation replay <ExternalLink size={12} />
          </span>
        </div>

        <div className="bg-slate-950 p-4 min-h-[320px]">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
            <span className="font-mono">{activeTaskId}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-slate-400 hover:text-white"
                onClick={goPrev}
                disabled={stepIdx === 0}
              >
                <ChevronLeft size={14} /> Prev
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-slate-400 hover:text-white"
                onClick={goNext}
                disabled={stepIdx >= steps.length - 1}
              >
                Next <ChevronRight size={14} />
              </Button>
              <span className="text-slate-500 font-mono px-2">
                {stepIdx + 1} / {steps.length}
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-slate-400 hover:text-white">
                <Play size={12} className="mr-1" /> Play
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              {steps.map((step, i) => (
                <StepCard
                  key={`${step.label}-${i}`}
                  step={step}
                  active={!detailStep && i === stepIdx}
                  onClick={() => {
                    setStepIdx(i);
                    setDetailStep(step);
                  }}
                />
              ))}
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 min-h-[200px]">
              {currentStep ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-2">
                    {currentStep.label}
                  </p>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{currentStep.detail}</p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Select a step to view details.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
