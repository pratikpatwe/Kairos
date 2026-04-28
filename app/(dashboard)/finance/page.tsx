'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CategoryChart from '@/components/finance/CategoryChart';
import { AddTransactionModal } from '@/components/finance/AddTransactionModal';
import { TransactionsModal } from '@/components/finance/TransactionsModal';
import { DateRangePicker } from '@/components/finance/DateRangePicker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/finance/ui/card';
import { Button } from '@/components/finance/ui/button';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    PiggyBank,
    Activity,
    TrendingUp,
    Plus,
    RefreshCw,
    CreditCard,
    Download,
    Search,
    Home,
    CheckCircle,
    BookOpen,
    ListTodo
} from 'lucide-react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from '@/lib/utils';
import { dataEventEmitter, DATA_UPDATED_EVENT } from "@/lib/events"

interface Analytics {
    summary: {
        totalIncome: number;
        totalExpense: number;
        savings: number;
        transactionCount: number;
    };
    categoryBreakdown: Array<{
        category: string;
        amount: number;
        percentage: number;
    }>;
    topMerchants: Array<{
        merchant: string;
        amount: number;
        count: number;
    }>;
    alerts: string[];
}

interface Transaction {
    _id: string;
    date: string;
    amount: number;
    type: 'credit' | 'debit';
    merchant: string;
    category: string;
}

export default function FinanceDashboardPage() {
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [dateRange, setDateRange] = useState<{ period: string; from?: Date; to?: Date }>({ period: 'month' });

    const fetchData = useCallback(async () => {
        let params = new URLSearchParams();
        if (dateRange.period === 'custom' && dateRange.from) {
            params.append('startDate', dateRange.from.toISOString());
            if (dateRange.to) params.append('endDate', dateRange.to.toISOString());
        } else {
            params.append('period', dateRange.period);
        }

        // Load from cache first
        const cacheKeyAnalytics = `cache_finance_analytics_${params.toString()}`;
        const cacheKeyTransactions = `cache_finance_transactions_${params.toString()}`;
        const cachedAnalytics = localStorage.getItem(cacheKeyAnalytics);
        const cachedTransactions = localStorage.getItem(cacheKeyTransactions);
        if (cachedAnalytics) setAnalytics(JSON.parse(cachedAnalytics));
        if (cachedTransactions) setRecentTransactions(JSON.parse(cachedTransactions));

        try {
            const analyticsRes = await fetch(`/api/finance/analytics?${params.toString()}`);
            if (analyticsRes.ok) {
                const data = await analyticsRes.json();
                setAnalytics(data);
                localStorage.setItem(cacheKeyAnalytics, JSON.stringify(data));
            }

            const txnParams = new URLSearchParams(params);
            txnParams.append('limit', '5');
            txnParams.append('sortBy', 'date');
            txnParams.append('sortOrder', 'desc');

            const txnRes = await fetch(`/api/finance/transactions?${txnParams.toString()}`);
            if (txnRes.ok) {
                const data = await txnRes.json();
                setRecentTransactions(data.transactions);
                localStorage.setItem(cacheKeyTransactions, JSON.stringify(data.transactions));
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

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
            fetchData();
        }
    }, [user, fetchData]);

    // Refetch data when page becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                fetchData();
            }
        };

        const handleFocus = () => {
            if (user) {
                fetchData();
            }
        };

        const unsubscribe = dataEventEmitter.subscribe(DATA_UPDATED_EVENT, () => {
            console.log("Finance update triggered!");
            fetchData();
        });

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            unsubscribe();
        };
    }, [user, fetchData]);

    const formatAmount = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white pb-20">
            {/* Ambient Background - Subtle Grayscale */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl opacity-20" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-zinc-700/20 rounded-full blur-3xl opacity-20" />
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
                                Spend Tracker
                            </h1>
                            <p className="text-zinc-400 mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg font-light truncate">
                                Overview for {userName}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:gap-6 flex-wrap">
                        <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 gap-1">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="h-9 px-3 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-2 transition-all cursor-pointer">
                                    <Home className="w-4 h-4" />
                                    <span className="hidden md:inline">Dashboard</span>
                                </Button>
                            </Link>
                            <Link href="/finance">
                                <Button size="sm" className="h-9 px-3 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer">
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
                                <Button variant="ghost" size="sm" className="h-9 px-3 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-2 transition-all cursor-pointer">
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
                        <div className="flex items-center gap-2 flex-wrap">
                            <TransactionsModal
                                onDeleteSuccess={fetchData}
                                trigger={
                                    <Button variant="outline" size="lg" className="w-11 p-0 border-zinc-700 hover:bg-zinc-800 text-white cursor-pointer rounded-xl">
                                        <Search className="w-4 h-4" />
                                    </Button>
                                }
                            />
                            <AddTransactionModal onSuccess={fetchData} />
                            <DateRangePicker onRangeChange={(range) => setDateRange(range)} className="w-full sm:w-auto" />
                            <Button
                                variant="default"
                                size="lg"
                                onClick={() => {
                                    setIsLoading(true);
                                    fetchData();
                                }}
                                disabled={isLoading}
                                className="px-4 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 text-white"
                            >
                                <RefreshCw className={cn("w-4 h-4 sm:mr-2", isLoading && "animate-spin")} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {isLoading && !analytics ? (
                    <div className="grid md:grid-cols-4 gap-6 animate-pulse">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-40 bg-zinc-900 rounded-xl border border-zinc-800" />
                        ))}
                    </div>
                ) : analytics ? (
                    <div className="space-y-6 sm:space-y-8">
                        {/* Summary Cards - Carousel on Mobile, Grid on Desktop */}
                        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-zinc-400">Total Income</CardTitle>
                                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-emerald-500 tracking-tight">{formatAmount(analytics.summary.totalIncome)}</div>
                                    <p className="text-xs text-zinc-500 mt-1">Inflow this period</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-zinc-400">Total Expenses</CardTitle>
                                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-red-500 tracking-tight">{formatAmount(analytics.summary.totalExpense)}</div>
                                    <p className="text-xs text-zinc-500 mt-1">Outflow this period</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-zinc-400">Net Savings</CardTitle>
                                    <PiggyBank className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-blue-500 tracking-tight">{formatAmount(analytics.summary.savings)}</div>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        {analytics.summary.totalIncome > 0 ? (analytics.summary.savings / analytics.summary.totalIncome * 100).toFixed(1) : 0}% savings rate
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-zinc-400">Transactions</CardTitle>
                                    <Activity className="h-4 w-4 text-white" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white tracking-tight">{analytics.summary.transactionCount}</div>
                                    <p className="text-xs text-zinc-500 mt-1">Total items processed</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Mobile Carousel */}
                        <div className="block sm:hidden -mx-4 px-4 overflow-visible">
                            <Carousel className="w-full">
                                <CarouselContent className="-ml-2 md:-ml-4">
                                    <CarouselItem className="pl-2 basis-[85%]">
                                        <Card className="bg-zinc-900/50 border-zinc-800 h-full">
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium text-zinc-400">Total Income</CardTitle>
                                                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-emerald-500 tracking-tight">{formatAmount(analytics.summary.totalIncome)}</div>
                                                <p className="text-xs text-zinc-500 mt-1">Inflow this period</p>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                    <CarouselItem className="pl-2 basis-[85%]">
                                        <Card className="bg-zinc-900/50 border-zinc-800 h-full">
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium text-zinc-400">Total Expenses</CardTitle>
                                                <ArrowDownRight className="h-4 w-4 text-red-500" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-red-500 tracking-tight">{formatAmount(analytics.summary.totalExpense)}</div>
                                                <p className="text-xs text-zinc-500 mt-1">Outflow this period</p>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                    <CarouselItem className="pl-2 basis-[85%]">
                                        <Card className="bg-zinc-900/50 border-zinc-800 h-full">
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium text-zinc-400">Net Savings</CardTitle>
                                                <PiggyBank className="h-4 w-4 text-blue-500" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-blue-500 tracking-tight">{formatAmount(analytics.summary.savings)}</div>
                                                <p className="text-xs text-zinc-500 mt-1">
                                                    {analytics.summary.totalIncome > 0 ? (analytics.summary.savings / analytics.summary.totalIncome * 100).toFixed(1) : 0}% savings rate
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                    <CarouselItem className="pl-2 basis-[85%]">
                                        <Card className="bg-zinc-900/50 border-zinc-800 h-full">
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium text-zinc-400">Transactions</CardTitle>
                                                <Activity className="h-4 w-4 text-white" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-white tracking-tight">{analytics.summary.transactionCount}</div>
                                                <p className="text-xs text-zinc-500 mt-1">Total items processed</p>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                </CarouselContent>
                            </Carousel>
                        </div>

                        {/* Analysis & Visualization Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            {/* Spending Chart */}
                            <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                                        Spending Breakdown
                                    </CardTitle>
                                    <CardDescription className="text-zinc-500 text-sm">
                                        Expenses by category
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pl-2">
                                    <div className="h-[200px] sm:h-[250px] lg:h-[300px] w-full flex items-center justify-center">
                                        {isLoading || !analytics ? (
                                            <div className="w-full h-full bg-zinc-900/50 rounded-xl animate-pulse" />
                                        ) : (
                                            <CategoryChart data={analytics.categoryBreakdown} />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Top Merchants */}
                            <Card className="border-zinc-800 bg-zinc-900/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                                        Top Merchants
                                    </CardTitle>
                                    <CardDescription className="text-zinc-500 text-sm">
                                        Highest spending activity
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {isLoading || !analytics ? (
                                            [...Array(5)].map((_, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
                                                        <div className="space-y-2">
                                                            <div className="h-3 w-20 bg-zinc-800 animate-pulse rounded" />
                                                            <div className="h-2 w-12 bg-zinc-800 animate-pulse rounded" />
                                                        </div>
                                                    </div>
                                                    <div className="h-3 w-16 bg-zinc-800 animate-pulse rounded" />
                                                </div>
                                            ))
                                        ) : (
                                            <>
                                                {analytics.topMerchants.slice(0, 5).map((merchant, i) => (
                                                    <div key={merchant.merchant} className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-white group-hover:bg-white group-hover:text-black transition-colors">
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{merchant.merchant}</p>
                                                                <p className="text-xs text-zinc-500">{merchant.count} txns</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-white">{formatAmount(merchant.amount)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {analytics.topMerchants.length === 0 && (
                                                    <div className="text-center py-8 text-zinc-500 text-sm">
                                                        No merchant data available
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Transactions */}
                        <Card className="border-zinc-800 bg-zinc-900/30">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-white text-base sm:text-lg">Recent Activity</CardTitle>
                                    <CardDescription className="text-zinc-500 text-sm">Latest transactions</CardDescription>
                                </div>
                                <TransactionsModal onDeleteSuccess={fetchData} />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="flex items-center justify-between py-4 gap-3">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-900 animate-pulse border border-zinc-800" />
                                                    <div className="space-y-2 flex-1">
                                                        <div className="h-4 w-1/3 bg-zinc-900 animate-pulse rounded" />
                                                        <div className="h-3 w-1/4 bg-zinc-900 animate-pulse rounded" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <div className="h-4 w-20 bg-zinc-900 animate-pulse rounded ml-auto" />
                                                    <div className="h-3 w-12 bg-zinc-900 animate-pulse rounded ml-auto" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : recentTransactions.length > 0 ? (
                                    <div className="divide-y divide-zinc-800/50">
                                        {recentTransactions.map((txn) => (
                                            <div key={txn._id} className="flex items-center justify-between py-3 sm:py-4 group hover:bg-zinc-900/50 px-3 sm:px-4 -mx-3 sm:-mx-4 transition-colors rounded-lg gap-3">
                                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 flex-shrink-0">
                                                        {txn.type === 'credit' ? (
                                                            <ArrowDownRight className="w-4 h-4 text-white" />
                                                        ) : (
                                                            <ArrowUpRight className="w-4 h-4 text-zinc-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-zinc-200 group-hover:text-white transition-colors text-sm sm:text-base truncate">
                                                            {txn.merchant}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                                                            <span className="capitalize px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 whitespace-nowrap">{txn.category}</span>
                                                            <span className="hidden sm:inline">•</span>
                                                            <span className="hidden sm:inline">{new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className={cn(
                                                        "font-semibold text-sm sm:text-base whitespace-nowrap",
                                                        txn.type === 'credit' ? "text-white" : "text-zinc-400"
                                                    )}>
                                                        {txn.type === 'credit' ? '+' : '-'}{formatAmount(txn.amount)}
                                                    </p>
                                                    <div className="text-xs text-zinc-500 capitalize">{txn.type}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                                            <Wallet className="w-6 h-6 text-zinc-500" />
                                        </div>
                                        <h3 className="text-lg font-medium text-white">No transactions yet</h3>
                                        <p className="text-zinc-500 max-w-sm mx-auto mt-2 mb-6">
                                            Upload your statement to get started.
                                        </p>
                                        <AddTransactionModal onSuccess={fetchData} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    /* Initial Empty State */
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                        <div className="relative mb-8 group">
                            <div className="absolute inset-0 bg-white/5 blur-xl rounded-full group-hover:bg-white/10 transition-all duration-500" />
                            <div className="relative w-24 h-24 bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center justify-center">
                                <span className="text-4xl grayscale">📊</span>
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Your Financial Hub
                        </h2>
                        <p className="text-zinc-500 max-w-md mx-auto mb-8 text-lg">
                            Get started by uploading a statement to see your spend analysis, income tracking, and savings goals.
                        </p>
                        <div className="flex items-center gap-4">
                            <AddTransactionModal onSuccess={fetchData} />
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
