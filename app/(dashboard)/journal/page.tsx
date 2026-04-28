'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
    Home,
    Wallet,
    CheckCircle,
    BookOpen,
    Search,
    Calendar,
    Plus,
    Tag,
    Clock,
    ChevronLeft,
    ChevronRight,
    X,
    ListTodo
} from 'lucide-react';
import { MicrophoneIcon } from "@heroicons/react/24/outline"
import { useRef } from "react"
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { dataEventEmitter, DATA_UPDATED_EVENT } from "@/lib/events"

interface JournalEntry {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export default function JournalPage() {
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeView, setActiveView] = useState<'create' | 'past'>('create');

    // Create Journal State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    // Past Journals State
    const [journals, setJournals] = useState<JournalEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [filteredJournals, setFilteredJournals] = useState<JournalEntry[]>([]);
    const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
    const [isEditingJournal, setIsEditingJournal] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editTagInput, setEditTagInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // STT State & Refs
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const startRecording = async (targetField: 'content' | 'editContent') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            audioContextRef.current = audioContext;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            let lastSpeechTime = Date.now();
            let lastChunkTime = Date.now();
            const SILENCE_THRESHOLD = 700; // 0.7 seconds
            const MAX_CHUNK_DURATION = 4000; // Force update every 4 seconds
            const AUTO_STOP_THRESHOLD = 10000; // 10 seconds
            const VOLUME_THRESHOLD = 25; // More sensitive
            let hasRecordedInThisChunk = false;

            const monitorSilence = () => {
                if (!isRecordingRef.current) return;

                analyser.getByteFrequencyData(dataArray);
                const volume = dataArray.reduce((a, b) => a + b) / bufferLength;

                const now = Date.now();
                const timeSinceLastSpeech = now - lastSpeechTime;
                const timeSinceLastChunk = now - lastChunkTime;

                if (volume > VOLUME_THRESHOLD) {
                    lastSpeechTime = now;
                    hasRecordedInThisChunk = true;
                }

                if (timeSinceLastSpeech > AUTO_STOP_THRESHOLD) {
                    stopRecording();
                    return;
                }

                // Auto-commit on silence OR max duration reached
                if (hasRecordedInThisChunk && (timeSinceLastSpeech > SILENCE_THRESHOLD || timeSinceLastChunk > MAX_CHUNK_DURATION)) {
                    commitChunk();
                    lastSpeechTime = now;
                    lastChunkTime = now;
                    hasRecordedInThisChunk = false;
                }

                requestAnimationFrame(monitorSilence);
            };

            const commitChunk = () => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                    if (isRecordingRef.current) {
                        const newRecorder = new MediaRecorder(stream);
                        setupRecorder(newRecorder);
                        newRecorder.start();
                    }
                }
            };

            const setupRecorder = (recorder: MediaRecorder) => {
                const chunks: Blob[] = [];
                mediaRecorderRef.current = recorder;
                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) chunks.push(event.data);
                };
                recorder.onstop = async () => {
                    if (chunks.length === 0) return;
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append('audio', audioBlob);
                    try {
                        const res = await fetch('/api/stt', { method: 'POST', body: formData });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.transcript) {
                                if (targetField === 'content') {
                                    setContent(prev => prev + (prev ? " " : "") + data.transcript);
                                } else {
                                    setEditContent(prev => prev + (prev ? " " : "") + data.transcript);
                                }
                            }
                        }
                    } catch (error) { console.error("STT Error:", error); }
                };
            };

            const initialRecorder = new MediaRecorder(stream);
            setupRecorder(initialRecorder);
            initialRecorder.start();

            isRecordingRef.current = true;
            setIsRecording(true);
            monitorSilence();
        } catch (error) {
            console.error("Mic Access Error:", error);
            toast.error("Could not access microphone");
        }
    };

    const stopRecording = () => {
        isRecordingRef.current = false;
        setIsRecording(false);
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const handleMicClick = (targetField: 'content' | 'editContent') => {
        if (isRecording) stopRecording();
        else startRecording(targetField);
    };

    const fetchJournals = useCallback(async () => {
        // Load from cache first
        const cachedJournals = localStorage.getItem('cache_journals');
        if (cachedJournals) {
            const parsed = JSON.parse(cachedJournals);
            setJournals(parsed);
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/journal');
            if (res.ok) {
                const data = await res.json();
                const journalsData = data.journals || [];
                setJournals(journalsData);
                localStorage.setItem('cache_journals', JSON.stringify(journalsData));
            }
        } catch (error) {
            console.error('Failed to fetch journals:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }: any) => {
            if (user) {
                setUser(user);
            } else {
                router.push('/login');
            }
            setIsLoaded(true);
        });
    }, [router, supabase]);

    useEffect(() => {
        if (user) {
            fetchJournals();
        }
    }, [user, fetchJournals]);

    useEffect(() => {
        filterJournals();
    }, [searchQuery, dateFilter, journals]);

    useEffect(() => {
        const unsubscribe = dataEventEmitter.subscribe(DATA_UPDATED_EVENT, () => {
            console.log("Journal update triggered!");
            fetchJournals();
        });
        return () => unsubscribe();
    }, [fetchJournals]);

    const filterJournals = () => {
        let filtered = [...journals];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(journal =>
                journal.title.toLowerCase().includes(query) ||
                journal.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            filtered = filtered.filter(journal => {
                const journalDate = new Date(journal.createdAt);
                return journalDate.toDateString() === filterDate.toDateString();
            });
        }

        setFilteredJournals(filtered);
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSaveJournal = async () => {
        if (!title.trim()) {
            toast.error('Please add a title');
            return;
        }
        if (!content.trim()) {
            toast.error('Please add content');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, tags })
            });

            if (res.ok) {
                toast.success('Journal saved successfully');
                setTitle('');
                setContent('');
                setTags([]);
                fetchJournals();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toast.error('Failed to save journal');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateJournal = async () => {
        if (!selectedJournal || !editTitle.trim() || !editContent.trim()) {
            toast.error('Title and Content are required');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/journal?id=${selectedJournal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editTitle.trim(),
                    content: editContent.trim(),
                    tags: editTags
                })
            });

            if (res.ok) {
                toast.success('Journal updated successfully');
                setIsEditingJournal(false);
                setSelectedJournal(null);
                fetchJournals();
            } else {
                throw new Error('Failed to update');
            }
        } catch (error) {
            toast.error('Failed to update journal');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteJournal = async (id: string) => {
        if (!confirm('Are you sure you want to delete this journal?')) return;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/journal?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Journal deleted');
                setSelectedJournal(null);
                setIsEditingJournal(false);
                fetchJournals();
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            toast.error('Failed to delete journal');
        } finally {
            setIsLoading(false);
        }
    };

    const startEditing = (journal: JournalEntry) => {
        setEditTitle(journal.title);
        setEditContent(journal.content);
        setEditTags([...journal.tags]);
        setIsEditingJournal(true);
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };



    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white pb-20">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl opacity-20" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-800/10 rounded-full blur-3xl opacity-20" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-8 sm:mb-10">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <Link href="/" className="relative w-12 h-12 shrink-0 sm:w-16 sm:h-16 lg:w-20 lg:h-20 hover:opacity-80 transition-opacity cursor-pointer">
                            <Image
                                src="/kairos-logo.svg"
                                alt="Kairos Logo"
                                fill
                                className="object-contain"
                            />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white uppercase tracking-wider truncate">
                                Diary
                            </h1>
                            <p className="text-zinc-400 mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg font-light truncate">
                                Capture your thoughts, {userName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:gap-6 flex-wrap">
                        {/* Navigation */}
                        <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 gap-1">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="h-9 px-3 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-2 transition-all cursor-pointer">
                                    <Home className="w-4 h-4" />
                                    <span className="hidden md:inline">Dashboard</span>
                                </Button>
                            </Link>
                            <Link href="/finance">
                                <Button variant="ghost" size="sm" className="h-9 px-3 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-2 transition-all cursor-pointer">
                                    <Wallet className="w-4 h-4" />
                                    <span className="hidden md:inline">Finance</span>
                                </Button>
                            </Link>
                            <Link href="/habits">
                                <Button variant="ghost" size="sm" className="h-9 px-3 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-2 transition-all cursor-pointer">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="hidden md:inline">Habits</span>
                                </Button>
                            </Link>
                            <Link href="/journal">
                                <Button size="sm" className="h-9 px-3 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer">
                                    <BookOpen className="w-4 h-4" />
                                    <span className="hidden md:inline">Diary</span>
                                </Button>
                            </Link>
                            <Link href="/todo">
                                <Button variant="ghost" size="sm" className="h-9 px-3 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-2 transition-all cursor-pointer">
                                    <ListTodo className="w-4 h-4" />
                                    <span className="hidden md:inline">To-Do</span>
                                </Button>
                            </Link>
                        </div>

                        {/* View Toggle Switch */}
                        <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 gap-1">
                            <button
                                onClick={() => setActiveView('past')}
                                className={cn(
                                    "h-9 px-4 text-sm font-medium rounded-lg transition-all cursor-pointer",
                                    activeView === 'past'
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                Past Diaries
                            </button>
                            <button
                                onClick={() => setActiveView('create')}
                                className={cn(
                                    "h-9 px-4 text-sm font-medium rounded-lg transition-all cursor-pointer",
                                    activeView === 'create'
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                Add Entry
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                {!isLoaded ? (
                    <div className="animate-in fade-in duration-500 space-y-6">
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 sm:p-8 lg:p-10">
                            <div className="max-w-4xl mx-auto space-y-8">
                                <div className="space-y-4">
                                    <div className="h-3 w-12 bg-white/5 rounded animate-pulse ml-1" />
                                    <div className="h-14 w-full bg-white/5 rounded-xl animate-pulse" />
                                </div>
                                <div className="space-y-4">
                                    <div className="h-3 w-16 bg-white/5 rounded animate-pulse ml-1" />
                                    <div className="h-64 w-full bg-white/5 rounded-xl animate-pulse" />
                                </div>
                                <div className="space-y-4">
                                    <div className="h-3 w-10 bg-white/5 rounded animate-pulse ml-1" />
                                    <div className="h-20 w-full bg-white/5 rounded-xl animate-pulse" />
                                </div>
                                <div className="flex justify-end pt-4">
                                    <div className="h-12 w-32 bg-white/5 rounded-xl animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeView === 'create' ? (
                    /* Create Journal View */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 sm:p-8 lg:p-10">
                            <div className="max-w-4xl mx-auto space-y-6">
                                {/* Title Input */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter journal title..."
                                        className="w-full bg-zinc-900/50 border border-zinc-700 hover:border-emerald-500/50 focus:border-emerald-500 rounded-xl h-14 px-5 text-lg font-semibold text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    />
                                </div>

                                {/* Content Input */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                            Content
                                        </label>
                                        <button
                                            onClick={() => handleMicClick('content')}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-all cursor-pointer",
                                                isRecording
                                                    ? "bg-red-500/20 text-red-500 animate-pulse"
                                                    : "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                            )}
                                            title={isRecording ? "Stop Recording" : "Dictate Entry"}
                                        >
                                            <MicrophoneIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Write your thoughts..."
                                        rows={12}
                                        className="w-full bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500/50 rounded-xl p-5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none leading-relaxed"
                                    />
                                </div>

                                {/* Tags Input */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                        Tags
                                    </label>
                                    <div className="bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 focus-within:border-emerald-500/50 rounded-xl p-4 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-medium border border-emerald-500/20"
                                                >
                                                    <Tag className="w-3 h-3" />
                                                    {tag}
                                                    <button
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="hover:text-emerald-300 transition-colors cursor-pointer"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleAddTag}
                                            placeholder="Type a tag and press Enter..."
                                            className="w-full bg-transparent text-white placeholder:text-zinc-600 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={handleSaveJournal}
                                        disabled={isLoading}
                                        className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5 mr-2" />
                                                Save Diary
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Past Journals View */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        {/* Filters */}
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Search */}
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by title or tag..."
                                        className="w-full bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500/50 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    />
                                </div>
                                {/* Date Filter */}
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                    <input
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="w-full sm:w-auto bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500/50 rounded-xl h-12 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                                    />
                                </div>
                                {dateFilter && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => setDateFilter('')}
                                        className="h-12 px-4 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Clear Date
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Journals List */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : filteredJournals.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredJournals.map((journal) => (
                                    <div
                                        key={journal.id}
                                        onClick={() => {
                                            setSelectedJournal(journal);
                                            setIsEditingJournal(false);
                                        }}
                                        className="bg-zinc-900/30 border border-zinc-800 hover:border-emerald-500/30 rounded-2xl p-6 cursor-pointer transition-all hover:bg-zinc-900/50 group"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <h3 className="font-bold text-white text-lg group-hover:text-emerald-400 transition-colors line-clamp-2">
                                                {journal.title}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-zinc-500 text-xs shrink-0">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDate(journal.createdAt)}
                                            </div>
                                        </div>
                                        <p className="text-zinc-400 text-sm line-clamp-3 mb-4 leading-relaxed">
                                            {journal.content}
                                        </p>
                                        {journal.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {journal.tags.slice(0, 3).map((tag, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-xs font-medium"
                                                    >
                                                        <Tag className="w-2.5 h-2.5" />
                                                        {tag}
                                                    </span>
                                                ))}
                                                {journal.tags.length > 3 && (
                                                    <span className="text-zinc-500 text-xs">
                                                        +{journal.tags.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center justify-center mb-6">
                                    <BookOpen className="w-8 h-8 text-zinc-600" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No journals found</h3>
                                <p className="text-zinc-500 max-w-sm mb-6">
                                    {searchQuery || dateFilter
                                        ? 'Try adjusting your search or filters'
                                        : 'Start writing your first journal entry'}
                                </p>
                                <Button
                                    onClick={() => setActiveView('create')}
                                    className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Journal
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Journal Detail Modal */}
                {selectedJournal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-[#111111] border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-zinc-800 shrink-0">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {isEditingJournal ? (
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                placeholder="Journal Title"
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl h-11 px-4 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        ) : (
                                            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                                                {selectedJournal.title}
                                            </h2>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isEditingJournal && (
                                            <>
                                                <button
                                                    onClick={() => startEditing(selectedJournal)}
                                                    className="h-11 px-5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteJournal(selectedJournal.id)}
                                                    className="h-11 px-5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedJournal(null);
                                                setIsEditingJournal(false);
                                            }}
                                            className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-500 mt-3 pl-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest">
                                        {formatDate(selectedJournal.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
                                {isEditingJournal ? (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between px-1">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                                    Content
                                                </label>
                                                <button
                                                    onClick={() => handleMicClick('editContent')}
                                                    className={cn(
                                                        "p-1.5 rounded-lg transition-all cursor-pointer",
                                                        isRecording
                                                            ? "bg-red-500/20 text-red-500 animate-pulse"
                                                            : "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                    )}
                                                    title={isRecording ? "Stop Recording" : "Dictate Changes"}
                                                >
                                                    <MicrophoneIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                placeholder="Write your thoughts..."
                                                rows={12}
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none leading-relaxed"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Tags</p>
                                            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {editTags.map((tag, index) => (
                                                        <span
                                                            key={index}
                                                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-500/20"
                                                        >
                                                            {tag}
                                                            <button
                                                                onClick={() => setEditTags(editTags.filter(t => t !== tag))}
                                                                className="hover:text-emerald-300 cursor-pointer"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={editTagInput}
                                                    onChange={(e) => setEditTagInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && editTagInput.trim()) {
                                                            e.preventDefault();
                                                            if (!editTags.includes(editTagInput.trim())) {
                                                                setEditTags([...editTags, editTagInput.trim()]);
                                                            }
                                                            setEditTagInput('');
                                                        }
                                                    }}
                                                    placeholder="Add tag..."
                                                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                            {selectedJournal.content}
                                        </p>
                                        {selectedJournal.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-zinc-800">
                                                {selectedJournal.tags.map((tag, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-medium border border-emerald-500/20"
                                                    >
                                                        <Tag className="w-3 h-3" />
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Modal Footer (only for editing) */}
                            {isEditingJournal && (
                                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 shrink-0">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsEditingJournal(false)}
                                        className="h-11 px-6 text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleUpdateJournal}
                                        disabled={isLoading}
                                        className="h-11 px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                                    >
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
