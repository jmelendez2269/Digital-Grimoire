"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Check, Timer } from "lucide-react";

interface RitualStep {
    title: string;
    instruction: string;
    duration?: number; // minutes
}

interface RitualRunnerProps {
    steps: RitualStep[];
    onComplete: () => void;
}

export default function RitualRunner({ steps, onComplete }: RitualRunnerProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [activeTimer, setActiveTimer] = useState<number | null>(null);

    const currentStep = steps[currentStepIndex];
    const isLastStep = currentStepIndex === steps.length - 1;

    // Progress calculation
    const progress = ((currentStepIndex + (completedSteps.includes(currentStepIndex) ? 1 : 0)) / steps.length) * 100;

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const toggleComplete = () => {
        if (completedSteps.includes(currentStepIndex)) {
            setCompletedSteps(prev => prev.filter(i => i !== currentStepIndex));
        } else {
            setCompletedSteps(prev => [...prev, currentStepIndex]);
        }
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-amber-500/20">
            {/* Top Bar: Progress */}
            <div className="bg-black/40 backdrop-blur border-b border-white/5 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-500 font-mono text-lg font-bold">
                        {currentStepIndex + 1}
                    </div>
                    <div>
                        <h3 className="text-sm font-mono text-amber-500/70 uppercase tracking-widest">Step {currentStepIndex + 1} of {steps.length}</h3>
                        <p className="text-zinc-300 font-medium">{currentStep.title}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-1/3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500 ease-out w-[var(--progress-width)]"
                        style={{ '--progress-width': `${progress}%` } as React.CSSProperties}
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-gradient-to-b from-transparent to-black/20 flex flex-col justify-center items-center text-center">
                <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 key={currentStepIndex}">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-amber-50 mb-8 leading-tight">
                        {currentStep.instruction}
                    </h2>

                    {currentStep.duration && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-900/20 border border-amber-500/30 text-amber-400 font-mono text-sm mb-8">
                            <Timer className="w-4 h-4" />
                            <span>Duration: {currentStep.duration} min</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-black/60 backdrop-blur border-t border-white/10 p-6 flex items-center justify-between">
                <button
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="font-mono uppercase tracking-wider text-sm">Previous</span>
                </button>

                <button
                    onClick={handleNext}
                    className={`flex items-center gap-3 px-8 py-3 rounded-lg font-mono uppercase tracking-wider text-sm font-bold transition-all
            ${isLastStep
                            ? "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                            : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-white/10"
                        }`}
                >
                    <span>{isLastStep ? "Complete Ritual" : "Next Step"}</span>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
