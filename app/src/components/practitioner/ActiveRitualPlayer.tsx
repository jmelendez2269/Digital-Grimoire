"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, CheckCircle, Timer, X } from 'lucide-react';
import { toast } from 'sonner';

type Step = {
    id: string;
    step_order: number;
    step_type: string;
    content: string;
    duration_seconds?: number;
};

type Ritual = {
    id: string;
    title: string;
    intention: string;
    steps: Step[];
};

export default function ActiveRitualPlayer({ ritual }: { ritual: Ritual }) {
    const router = useRouter();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // Timer State
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const currentStep = ritual.steps[currentStepIndex];
    const isLastStep = currentStepIndex === ritual.steps.length - 1;

    // Initial Timer Setup
    useEffect(() => {
        if (currentStep?.duration_seconds) {
            setTimeLeft(currentStep.duration_seconds);
            setIsTimerRunning(false);
        } else {
            setTimeLeft(null);
            setIsTimerRunning(false);
        }
    }, [currentStepIndex, currentStep]);

    // Timer Countdown
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning && timeLeft !== null && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => (prev !== null ? prev - 1 : 0));
            }, 1000);
        } else if (timeLeft === 0) {
            setIsTimerRunning(false);
            // Optional: Play sound?
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    // Functions
    const handleStart = () => setIsActive(true);

    const handleNext = () => {
        if (isLastStep) {
            setIsComplete(true);
        } else {
            setCurrentStepIndex((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1);
        }
    };

    const handleExit = () => {
        if (confirm("Are you sure you want to end the ritual early?")) {
            router.push('/practitioner/rituals');
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // 1. Completion Screen
    if (isComplete) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
                <div className="text-center max-w-md animate-in fade-in zoom-in duration-500">
                    <CheckCircle className="w-24 h-24 text-amber-500 mx-auto mb-6" />
                    <h1 className="text-4xl font-serif text-amber-100 mb-4">Ritual Complete</h1>
                    <p className="text-zinc-400 mb-8 max-w-sm mx-auto">
                        "It is done." The energy has been raised and directed.
                        Ground yourself now.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => router.push('/practitioner/rituals')}
                            className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
                        >
                            Return to Workbench
                        </button>
                        {/* Future: Log to Journal */}
                    </div>
                </div>
            </div>
        );
    }

    // 2. Intro Screen
    if (!isActive) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
                <h1 className="text-4xl font-serif text-amber-500 mb-4">{ritual.title}</h1>
                <p className="text-xl text-zinc-300 italic mb-12">"{ritual.intention}"</p>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800 mb-12 text-left">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Preparation</h3>
                    <ul className="list-disc pl-5 space-y-2 text-zinc-300">
                        <li>Ensure you will not be disturbed for {ritual.steps.length * 2} minutes.</li>
                        <li>Gather any necessary materials.</li>
                        <li>Clear your mind and space.</li>
                    </ul>
                </div>

                <button
                    onClick={handleStart}
                    className="px-12 py-4 bg-amber-600 hover:bg-amber-500 text-black text-xl font-bold rounded shadow-lg shadow-amber-900/20 transition-all hover:scale-105"
                >
                    Begin Ritual
                </button>
            </div>
        );
    }

    // 3. Active Step UI
    return (
        <div className="fixed inset-0 bg-zinc-950 flex flex-col z-40">
            {/* Top Bar */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/40 backdrop-blur">
                <div className="text-zinc-500 text-sm font-mono">
                    STEP {currentStepIndex + 1} / {ritual.steps.length}
                </div>
                <button
                    onClick={handleExit}
                    className="text-zinc-500 hover:text-red-500 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
                {/* Type Badge */}
                <span className="mb-6 px-3 py-1 bg-zinc-900 text-amber-500 border border-amber-500/30 rounded-full text-xs uppercase tracking-widest font-bold">
                    {currentStep.step_type}
                </span>

                {/* Content */}
                <div className="text-center mb-12">
                    <div className="text-3xl md:text-5xl font-serif text-white leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {currentStep.content}
                    </div>
                </div>

                {/* Timer (if applicable) */}
                {timeLeft !== null && (
                    <div className="mb-12 flex flex-col items-center">
                        <div className="text-5xl font-mono text-zinc-300 mb-4 tabular-nums">
                            {formatTime(timeLeft)}
                        </div>
                        <button
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-full border transition-colors ${isTimerRunning
                                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                                }`}
                        >
                            <Timer size={18} />
                            {isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="h-24 border-t border-white/5 bg-black/40 backdrop-blur flex items-center justify-between px-6 md:px-20">
                <button
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                    <ChevronLeft size={24} />
                    <span className="hidden md:inline">Previous</span>
                </button>

                <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-8 py-3 bg-zinc-100 hover:bg-white text-black font-bold rounded transition-colors"
                >
                    <span className="hidden md:inline">{isLastStep ? 'Complete' : 'Next Step'}</span>
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
}
