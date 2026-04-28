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
    ListTodo,
    Search,
    Calendar,
    Plus,
    Tag,
    Clock,
    X,
    MapPin,
    Bell,
    Flag,
    Check,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { dataEventEmitter, DATA_UPDATED_EVENT } from "@/lib/events"

interface TodoItem {
    id: string;
    title: string;
    description?: string;
    date: Date;
    deadline?: Date;
    priority: number;
    effectivePriority?: number;
    label?: string;
    location?: string;
    reminder?: Date;
    isCompleted: boolean;
    completedAt?: Date;
    createdAt: Date;
}

type ViewType = 'today' | 'upcoming' | 'filters' | 'completed' | 'prioritize' | 'add';

export default function TodoPage() {
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeView, setActiveView] = useState<ViewType>('upcoming');

    // Todos State
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [labelFilter, setLabelFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // Add Task State
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newDeadline, setNewDeadline] = useState('');
    const [newPriority, setNewPriority] = useState(5);
    const [newLabel, setNewLabel] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newReminder, setNewReminder] = useState('');

    // Edit State
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

    const fetchTodos = useCallback(async () => {
        let url = `/api/todo?filter=${activeView === 'filters' ? 'all' : activeView}`;
        if (labelFilter) url += `&label=${encodeURIComponent(labelFilter)}`;
        if (dateFilter) url += `&startDate=${dateFilter}&endDate=${dateFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

        // Load from cache first
        const cacheKey = `cache_todos_${url}`;
        const cachedTodos = localStorage.getItem(cacheKey);
        if (cachedTodos) setTodos(JSON.parse(cachedTodos));

        setIsLoading(true);
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const todosData = data.todos || [];
                setTodos(todosData);
                localStorage.setItem(cacheKey, JSON.stringify(todosData));
            }
        } catch (error) {
            console.error('Failed to fetch todos:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeView, labelFilter, dateFilter, searchQuery]);

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
        if (user && activeView !== 'add') {
            fetchTodos();
        }
    }, [user, fetchTodos, activeView]);

    useEffect(() => {
        const unsubscribe = dataEventEmitter.subscribe(DATA_UPDATED_EVENT, () => {
            console.log("Todo update triggered!");
            fetchTodos();
        });
        return () => unsubscribe();
    }, [fetchTodos]);

    const handleAddTask = async () => {
        if (!newTitle.trim()) {
            toast.error('Please add a title');
            return;
        }
        if (!newDate) {
            toast.error('Please select a date');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/todo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    description: newDescription,
                    date: newDate,
                    deadline: newDeadline || undefined,
                    priority: newPriority,
                    label: newLabel || undefined,
                    location: newLocation || undefined,
                    reminder: newReminder || undefined,
                })
            });

            if (res.ok) {
                toast.success('Task added successfully');
                resetForm();
                setActiveView('upcoming');
            } else {
                throw new Error('Failed to add task');
            }
        } catch (error) {
            toast.error('Failed to add task');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleComplete = async (todo: TodoItem) => {
        try {
            const res = await fetch(`/api/todo?id=${todo.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCompleted: !todo.isCompleted })
            });

            if (res.ok) {
                toast.success(todo.isCompleted ? 'Task unmarked' : 'Task completed!');
                fetchTodos();
            }
        } catch (error) {
            toast.error('Failed to update task');
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const res = await fetch(`/api/todo?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Task deleted');
                fetchTodos();
            }
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    const resetForm = () => {
        setNewTitle('');
        setNewDescription('');
        setNewDate('');
        setNewDeadline('');
        setNewPriority(5);
        setNewLabel('');
        setNewLocation('');
        setNewReminder('');
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateHeader = (date: Date) => {
        const d = new Date(date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (d.toDateString() === today.toDateString()) {
            return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })} · Today · ${d.toLocaleDateString('en-US', { weekday: 'long' })}`;
        } else if (d.toDateString() === tomorrow.toDateString()) {
            return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })} · Tomorrow · ${d.toLocaleDateString('en-US', { weekday: 'long' })}`;
        }
        return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })} · ${d.toLocaleDateString('en-US', { weekday: 'long' })}`;
    };

    const getPriorityColor = (priority: number) => {
        if (priority >= 8) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (priority >= 6) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        if (priority >= 4) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    };

    const groupTodosByDate = (todos: TodoItem[]) => {
        const groups: { [key: string]: TodoItem[] } = {};
        todos.forEach(todo => {
            const dateKey = new Date(todo.date).toDateString();
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(todo);
        });
        return Object.entries(groups).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    };

    const userName = user?.user_metadata?.full_name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';

    return (
        <div className="min-h-screen bg-[#060606] text-white pb-20">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
                <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-800/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-8 sm:mb-12">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <Link href="/" className="relative w-16 h-16 shrink-0 sm:w-20 sm:h-20 lg:w-24 lg:h-24 hover:opacity-80 transition-opacity cursor-pointer">
                            <Image
                                src="/kairos-logo.svg"
                                alt="Kairos Logo"
                                fill
                                className="object-contain"
                            />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white uppercase tracking-tighter truncate">
                                To-Do List
                            </h1>
                            <p className="text-zinc-500 mt-2 text-base sm:text-lg lg:text-xl font-medium tracking-tight truncate">
                                Stay organized, {userName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:gap-6 flex-wrap">
                        {/* Navigation */}
                        <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-2xl p-1.5 gap-1.5 w-fit">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="h-10 px-4 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl gap-2 transition-all cursor-pointer">
                                    <Home className="w-4 h-4" />
                                    <span className="hidden md:inline font-semibold">Dashboard</span>
                                </Button>
                            </Link>
                            <Link href="/finance">
                                <Button variant="ghost" size="sm" className="h-10 px-4 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl gap-2 transition-all cursor-pointer">
                                    <Wallet className="w-4 h-4" />
                                    <span className="hidden md:inline font-semibold">Finance</span>
                                </Button>
                            </Link>
                            <Link href="/habits">
                                <Button variant="ghost" size="sm" className="h-10 px-4 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl gap-2 transition-all cursor-pointer">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="hidden md:inline font-semibold">Habits</span>
                                </Button>
                            </Link>
                            <Link href="/journal">
                                <Button variant="ghost" size="sm" className="h-10 px-4 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl gap-2 transition-all cursor-pointer">
                                    <BookOpen className="w-4 h-4" />
                                    <span className="hidden md:inline font-semibold">Diary</span>
                                </Button>
                            </Link>
                            <Link href="/todo">
                                <Button size="sm" className="h-10 px-4 text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer">
                                    <ListTodo className="w-4 h-4" />
                                    <span className="hidden md:inline font-semibold">To-Do</span>
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* View Toggle Switch */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 gap-1 flex-wrap">
                            {(['today', 'upcoming', 'filters', 'completed'] as ViewType[]).map((view) => (
                                <button
                                    key={view}
                                    onClick={() => setActiveView(view)}
                                    className={cn(
                                        "h-9 px-4 text-sm font-medium rounded-lg transition-all cursor-pointer capitalize",
                                        activeView === view
                                            ? "bg-white text-black"
                                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {view === 'filters' ? 'Filters / Labels' : view === 'today' ? "Today's Tasks" : view}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveView('prioritize')}
                                className={cn(
                                    "h-9 px-6 text-sm font-medium rounded-xl transition-all cursor-pointer border",
                                    activeView === 'prioritize'
                                        ? "bg-white text-black border-white"
                                        : "text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500"
                                )}
                            >
                                Prioritize
                            </button>
                            <button
                                onClick={() => setActiveView('add')}
                                className={cn(
                                    "h-9 px-6 text-sm font-medium rounded-xl transition-all cursor-pointer border",
                                    activeView === 'add'
                                        ? "bg-emerald-500 text-white border-emerald-500"
                                        : "text-zinc-400 border-zinc-700 hover:text-emerald-400 hover:border-emerald-500"
                                )}
                            >
                                Add Task
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                {activeView === 'add' ? (
                    /* Add Task View */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 sm:p-8 lg:p-10">
                            <div className="max-w-2xl mx-auto space-y-6">
                                <h2 className="text-xl font-bold mb-6">Add New Task</h2>

                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="What needs to be done?"
                                        className="w-full bg-zinc-900/50 border border-zinc-700 hover:border-emerald-500/50 focus:border-emerald-500 rounded-xl h-14 px-5 text-lg font-semibold text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder="Add more details..."
                                        rows={3}
                                        className="w-full bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500/50 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                                    />
                                </div>

                                {/* Date & Deadline */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                            Date *
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                            <input
                                                type="date"
                                                value={newDate}
                                                onChange={(e) => setNewDate(e.target.value)}
                                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl h-12 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                            Deadline (Optional)
                                        </label>
                                        <div className="relative">
                                            <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                            <input
                                                type="date"
                                                value={newDeadline}
                                                onChange={(e) => setNewDeadline(e.target.value)}
                                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl h-12 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Priority */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                        Priority (1-10): {newPriority}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={newPriority}
                                        onChange={(e) => setNewPriority(parseInt(e.target.value))}
                                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <div className="flex justify-between text-xs text-zinc-600">
                                        <span>Low</span>
                                        <span>High</span>
                                    </div>
                                </div>

                                {/* Label & Location */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                            Label (Optional)
                                        </label>
                                        <div className="relative">
                                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                            <input
                                                type="text"
                                                value={newLabel}
                                                onChange={(e) => setNewLabel(e.target.value)}
                                                placeholder="e.g., Work, Personal"
                                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                            Location (Optional)
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                            <input
                                                type="text"
                                                value={newLocation}
                                                onChange={(e) => setNewLocation(e.target.value)}
                                                placeholder="Where?"
                                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Reminder */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                                        Reminder (Optional)
                                    </label>
                                    <div className="relative">
                                        <Bell className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input
                                            type="datetime-local"
                                            value={newReminder}
                                            onChange={(e) => setNewReminder(e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl h-12 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={handleAddTask}
                                        disabled={isLoading}
                                        className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5 mr-2" />
                                                Add Task
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeView === 'filters' ? (
                    /* Filters/Labels View */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={labelFilter}
                                        onChange={(e) => setLabelFilter(e.target.value)}
                                        placeholder="Search by label..."
                                        className="w-full bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500/50 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    />
                                </div>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                    <input
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="w-full sm:w-auto bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500/50 rounded-xl h-12 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                                    />
                                </div>
                                {(labelFilter || dateFilter) && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => { setLabelFilter(''); setDateFilter(''); }}
                                        className="h-12 px-4 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Results */}
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
                            <h3 className="text-lg font-bold mb-4">Filtered Results</h3>
                            {renderTodoList()}
                        </div>
                    </div>
                ) : (
                    /* Today, Upcoming, Completed, Prioritize Views */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 sm:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold capitalize">
                                    {activeView === 'today' ? "Today's Tasks" : activeView === 'prioritize' ? 'Prioritized Tasks' : activeView}
                                </h2>
                                {activeView === 'upcoming' && (
                                    <div className="text-sm text-zinc-500">
                                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </div>
                                )}
                            </div>

                            {renderTodoList()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    function renderTodoList() {
        if (!isLoaded || isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-24 opacity-20 animate-in fade-in duration-500">
                    <ListTodo className="w-12 h-12 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-[0.2em]">Syncing Tasks...</p>
                </div>
            );
        }

        if (todos.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center mb-4">
                        <ListTodo className="w-6 h-6 text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No tasks found</h3>
                    <p className="text-zinc-500 mb-4">
                        {activeView === 'completed' ? 'Complete some tasks to see them here' : 'Add a new task to get started'}
                    </p>
                    <Button
                        onClick={() => setActiveView('add')}
                        className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl cursor-pointer"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                    </Button>
                </div>
            );
        }

        if (activeView === 'prioritize') {
            return (
                <div className="space-y-3">
                    {todos.map((todo) => (
                        <div
                            key={todo.id}
                            className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all group"
                        >
                            <button
                                onClick={() => handleToggleComplete(todo)}
                                className={cn(
                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
                                    todo.isCompleted
                                        ? "bg-emerald-500 border-emerald-500"
                                        : "border-zinc-600 hover:border-emerald-500"
                                )}
                            >
                                {todo.isCompleted && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={cn("font-medium truncate", todo.isCompleted && "line-through text-zinc-500")}>{todo.title}</h4>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full border", getPriorityColor(todo.effectivePriority || todo.priority))}>
                                        P{todo.effectivePriority || todo.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                    <span>{formatDate(todo.date)}</span>
                                    {todo.deadline && (
                                        <span className="text-orange-400">Due: {formatDate(todo.deadline)}</span>
                                    )}
                                    {todo.label && (
                                        <span className="px-2 py-0.5 bg-zinc-800 rounded">{todo.label}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteTask(todo.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 transition-all cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            );
        }

        // Group by date for upcoming view
        const groupedTodos = groupTodosByDate(todos);

        return (
            <div className="space-y-6">
                {groupedTodos.map(([dateStr, dateTodos]) => (
                    <div key={dateStr}>
                        <h4 className="text-sm font-bold text-zinc-400 mb-3">
                            {formatDateHeader(new Date(dateStr))}
                        </h4>
                        <div className="space-y-2">
                            {dateTodos.map((todo) => (
                                <div
                                    key={todo.id}
                                    className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all group"
                                >
                                    <button
                                        onClick={() => handleToggleComplete(todo)}
                                        className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
                                            todo.isCompleted
                                                ? "bg-emerald-500 border-emerald-500"
                                                : "border-zinc-600 hover:border-emerald-500"
                                        )}
                                    >
                                        {todo.isCompleted && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className={cn("font-medium truncate", todo.isCompleted && "line-through text-zinc-500")}>{todo.title}</h4>
                                            {todo.priority >= 7 && (
                                                <span className={cn("text-xs px-2 py-0.5 rounded-full border", getPriorityColor(todo.priority))}>
                                                    P{todo.priority}
                                                </span>
                                            )}
                                        </div>
                                        {todo.description && (
                                            <p className="text-sm text-zinc-500 truncate mt-0.5">{todo.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                            {todo.deadline && (
                                                <span className="text-orange-400 flex items-center gap-1">
                                                    <Flag className="w-3 h-3" />
                                                    {formatDate(todo.deadline)}
                                                </span>
                                            )}
                                            {todo.label && (
                                                <span className="px-2 py-0.5 bg-zinc-800 rounded flex items-center gap-1">
                                                    <Tag className="w-3 h-3" />
                                                    {todo.label}
                                                </span>
                                            )}
                                            {todo.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {todo.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteTask(todo.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 transition-all cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {/* Add task inline */}
                            <button
                                onClick={() => setActiveView('add')}
                                className="flex items-center gap-2 p-3 text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer w-full"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm">Add task</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
}
