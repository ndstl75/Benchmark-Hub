import { useMemo, useState } from "react";
import type { TaskDefinition } from "@shared/schema";
import {
  CHECKPOINT_ACCENT,
  CHECKPOINT_TAG,
  GRADER_TAG,
  SAMPLE_TASKS,
  TASK_GROUPS,
  type PaperGroupId,
  type SampleTask,
} from "@/data/benchmarkContent";
import { ExternalLink } from "lucide-react";

type TaskExplorerProps = {
  taskDefs: TaskDefinition[];
  selectedId?: string;
  onSelect?: (taskId: string) => void;
};

function TaskCard({
  task,
  selected,
  onClick,
}: {
  task: SampleTask;
  selected: boolean;
  onClick: () => void;
}) {
  const n = task.evaluationCheckpoints.length;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        selected
          ? "border-blue-500 bg-white shadow-md ring-1 ring-blue-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 font-mono truncate">
          {task.id}
        </span>
      </div>
      <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2">{task.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{task.scenario}</p>
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-100">
          {task.taskType}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
          {n} checkpoint{n === 1 ? "" : "s"}
        </span>
      </div>
    </button>
  );
}

function TaskDetail({ task, taskDef }: { task: SampleTask; taskDef?: TaskDefinition }) {
  const instruction = taskDef?.prompt ?? task.instruction;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden h-full">
      <div className="px-6 py-5 border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700 mb-2">Task instruction</p>
        <h3 className="text-lg font-bold text-slate-900 leading-snug mb-3">{task.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {instruction || task.scenario}
        </p>
        <a
          href={task.paperUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 mt-3 hover:underline"
        >
          View source paper <ExternalLink size={11} />
        </a>
      </div>

      <div className="px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700 mb-4">Evaluation checkpoints</p>
        <div className="space-y-3">
          {task.evaluationCheckpoints.map((cp) => (
            <div
              key={cp.id}
              className={`rounded-lg border border-slate-200 border-l-4 pl-4 pr-4 py-3 ${CHECKPOINT_ACCENT[cp.accent]}`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-800">{cp.id}</span>
                <span className="text-xs font-semibold text-slate-800">{cp.title}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CHECKPOINT_TAG[cp.accent]}`}>
                  {cp.category}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${GRADER_TAG[cp.grader]}`}>
                  {cp.grader}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{cp.description}</p>
            </div>
          ))}
        </div>

        {taskDef && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Benchmark metrics</p>
            <div className="flex flex-wrap gap-1.5">
              {taskDef.metrics.map((m) => (
                <span
                  key={m}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600"
                >
                  {m}
                </span>
              ))}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
                Human agreement: {taskDef.agreement}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskExplorer({ taskDefs, selectedId, onSelect }: TaskExplorerProps) {
  const [activeGroup, setActiveGroup] = useState<PaperGroupId>("cmm-rx-llm");
  const [internalId, setInternalId] = useState(SAMPLE_TASKS[0]?.id ?? "");

  const groupTasks = useMemo(
    () => SAMPLE_TASKS.filter((t) => t.paperGroup === activeGroup),
    [activeGroup],
  );

  const activeId = selectedId ?? internalId;
  const activeTask =
    SAMPLE_TASKS.find((t) => t.id === activeId && t.paperGroup === activeGroup) ??
    groupTasks[0] ??
    SAMPLE_TASKS[0];
  const taskDef = taskDefs.find((t) => t.name === activeTask?.taskName);

  const select = (id: string) => {
    if (onSelect) onSelect(id);
    else setInternalId(id);
  };

  const switchGroup = (groupId: PaperGroupId) => {
    setActiveGroup(groupId);
    const first = SAMPLE_TASKS.find((t) => t.paperGroup === groupId);
    if (first) select(first.id);
  };

  if (!activeTask) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TASK_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => switchGroup(group.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              activeGroup === group.id
                ? "bg-teal-700 text-white border-teal-700"
                : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
            }`}
          >
            {group.label}
            <span className="ml-1.5 opacity-80">({group.taskNames.length})</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(260px,320px)_1fr] gap-5 items-start">
        <div className="flex flex-col gap-3 max-h-[640px] overflow-y-auto pr-1">
          {groupTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              selected={task.id === activeTask.id}
              onClick={() => select(task.id)}
            />
          ))}
        </div>
        <TaskDetail task={activeTask} taskDef={taskDef} />
      </div>
    </div>
  );
}
