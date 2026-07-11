import { cn } from "@/lib/utils";

export interface StepDefinition {
  key: string;
  label: string;
}

interface ProcessingStepsProps {
  steps: StepDefinition[];
  currentIndex: number;
  failed?: boolean;
}

export function ProcessingSteps({ steps, currentIndex, failed = false }: ProcessingStepsProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const isFailedHere = failed && isActive;

        return (
          <li key={step.key} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border font-mono text-xs transition-colors duration-300",
                  isDone && "border-highlighter bg-highlighter/10 text-highlighter",
                  isActive && !isFailedHere && "border-highlighter bg-highlighter/20 text-highlighter animate-pulse",
                  isFailedHere && "border-highlighter bg-highlighter text-ink",
                  !isDone && !isActive && "border-ink-rule text-paper-dim"
                )}
              >
                {isDone ? "✓" : `0${i + 1}`}
              </div>
              <span
                className={cn(
                  "font-mono text-[11px] uppercase tracking-wide leading-tight text-center whitespace-nowrap",
                  isDone && "text-highlighter",
                  isActive && "text-paper",
                  !isDone && !isActive && "text-paper-dim"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 transition-colors duration-300",
                  isDone ? "bg-highlighter" : "bg-ink-rule"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}