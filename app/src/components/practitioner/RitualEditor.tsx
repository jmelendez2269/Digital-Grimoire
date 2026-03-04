"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

type RitualStep = {
    id: string; // Temp ID for UI
    type: 'instruction' | 'action' | 'meditation' | 'chant' | 'note';
    content: string;
    duration_seconds?: number;
};

export default function RitualEditor() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    // Ritual Metadata State
    const [title, setTitle] = useState('');
    const [intention, setIntention] = useState('');
    const [phase, setPhase] = useState('Any');
    const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
    const [visibility, setVisibility] = useState<'private' | 'public'>('private');
    const [steps, setSteps] = useState<RitualStep[]>([]);

    // Add Step
    const addStep = () => {
        setSteps([
            ...steps,
            {
                id: crypto.randomUUID(),
                type: 'action',
                content: '',
                duration_seconds: 0
            }
        ]);
    };

    // Update Step
    const updateStep = (id: string, field: keyof RitualStep, value: any) => {
        setSteps(steps.map(step =>
            step.id === id ? { ...step, [field]: value } : step
        ));
    };

    // Remove Step
    const removeStep = (id: string) => {
        setSteps(steps.filter(step => step.id !== id));
    };

    // Move Step
    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === steps.length - 1) return;

        const newSteps = [...steps];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
        setSteps(newSteps);
    };

    // Save Ritual
    const handleSave = async () => {
        if (!title) {
            toast.error('Please give your ritual a title.');
            return;
        }
        if (steps.length === 0) {
            toast.error('A ritual must have at least one step.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Create Ritual
            const { data: ritual, error: ritualError } = await supabase
                .from('rituals')
                .insert({
                    user_id: user.id,
                    title,
                    intention,
                    phase,
                    estimated_duration_minutes: estimatedDuration,
                    visibility,
                    approval_status: visibility === 'public' ? 'pending' : 'approved' // Default approved for private so it's "clean" in DB, though logic ignores it. actually per schema default is pending. Let's explicit set it.
                })
                .select()
                .single();

            if (ritualError) throw ritualError;

            // 2. Create Steps
            const stepsToInsert = steps.map((step, index) => ({
                ritual_id: ritual.id,
                step_order: index,
                step_type: step.type,
                content: step.content,
                duration_seconds: step.duration_seconds || null
            }));

            const { error: stepsError } = await supabase
                .from('ritual_steps')
                .insert(stepsToInsert);

            if (stepsError) throw stepsError;

            toast.success('Ritual created successfully!');
            router.push('/workbench/rituals');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create ritual');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Metadata Section */}
            <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                <h2 className="text-xl font-serif text-amber-500 mb-4">Ritual Fundamentals</h2>
                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 outline-none"
                            placeholder="e.g. Morning Banishing"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Intention</label>
                        <textarea
                            value={intention}
                            onChange={(e) => setIntention(e.target.value)}
                            className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 outline-none h-20"
                            placeholder="What is the purpose of this rite?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Visibility</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setVisibility('private')}
                                className={`flex-1 py-2 px-4 rounded border transition-colors ${visibility === 'private' ? 'bg-amber-900/20 border-amber-500 text-amber-500' : 'bg-black border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                            >
                                Private Collection
                            </button>
                            <button
                                type="button"
                                onClick={() => setVisibility('public')}
                                className={`flex-1 py-2 px-4 rounded border transition-colors ${visibility === 'public' ? 'bg-cyan-900/20 border-cyan-500 text-cyan-500' : 'bg-black border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                            >
                                Submit to Website
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            {visibility === 'public'
                                ? 'Your ritual will be reviewed by an admin before appearing in the public library.'
                                : 'Visible only to you.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="ritual-phase" className="block text-sm text-zinc-400 mb-1">Phase</label>
                            <select
                                id="ritual-phase"
                                value={phase}
                                onChange={(e) => setPhase(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 outline-none"
                            >
                                {['Any', 'New Moon', 'Waxing', 'Full Moon', 'Waning', 'Dark Moon'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="ritual-duration" className="block text-sm text-zinc-400 mb-1">Est. Duration (min)</label>
                            <input
                                id="ritual-duration"
                                type="number"
                                value={estimatedDuration}
                                onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:border-amber-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Steps Section */}
            <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-serif text-amber-500">Ritual Steps</h2>
                    <button
                        onClick={addStep}
                        className="flex items-center gap-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-sm transition-colors"
                    >
                        <Plus size={16} /> Add Step
                    </button>
                </div>

                <div className="space-y-4">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex gap-4 p-4 bg-black/60 border border-zinc-800 rounded group">
                            {/* Order Controls */}
                            <div className="flex flex-col gap-1 justify-center text-zinc-600">
                                <button
                                    onClick={() => moveStep(index, 'up')}
                                    disabled={index === 0}
                                    className="hover:text-amber-500 disabled:opacity-30"
                                    aria-label="Move step up"
                                >
                                    <ArrowUp size={16} />
                                </button>
                                <span className="text-xs text-center font-mono">{index + 1}</span>
                                <button
                                    onClick={() => moveStep(index, 'down')}
                                    disabled={index === steps.length - 1}
                                    className="hover:text-amber-500 disabled:opacity-30"
                                    aria-label="Move step down"
                                >
                                    <ArrowDown size={16} />
                                </button>
                            </div>

                            {/* Step Content */}
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-4">
                                    <select
                                        value={step.type}
                                        onChange={(e) => updateStep(step.id, 'type', e.target.value)}
                                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300 focus:border-amber-500 outline-none"
                                        aria-label="Step type"
                                    >
                                        <option value="action">Action</option>
                                        <option value="instruction">Instruction</option>
                                        <option value="meditation">Meditation</option>
                                        <option value="chant">Chant</option>
                                        <option value="note">Note</option>
                                    </select>

                                    {(step.type === 'meditation' || step.type === 'action') && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={step.duration_seconds || ''}
                                                onChange={(e) => updateStep(step.id, 'duration_seconds', Number(e.target.value))}
                                                className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300 focus:border-amber-500 outline-none"
                                            />
                                            <span className="text-xs text-zinc-500">sec</span>
                                        </div>
                                    )}
                                </div>

                                <textarea
                                    value={step.content}
                                    onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                                    placeholder="Describe the action or words to be spoken..."
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 focus:border-amber-500 outline-none min-h-[80px]"
                                />
                            </div>

                            {/* Delete */}
                            <div>
                                <button
                                    onClick={() => removeStep(step.id)}
                                    className="text-zinc-600 hover:text-red-500 transition-colors p-2"
                                    aria-label="Remove step"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {steps.length === 0 && (
                        <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded">
                            No steps added yet. Click &quot;Add Step&quot; to begin.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    onClick={() => router.back()}
                    className="px-6 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded transition-colors disabled:opacity-50"
                >
                    {loading && <Loader2 className="animate-spin" size={18} />}
                    Create Ritual
                </button>
            </div>
        </div>
    );
}
