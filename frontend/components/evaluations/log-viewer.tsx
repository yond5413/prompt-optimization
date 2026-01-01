"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    module: string;
}

interface LogViewerProps {
    logs: LogEntry[];
    isLoading?: boolean;
}

export function LogViewer({ logs, isLoading }: LogViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const getLogLevelColor = (level: string) => {
        switch (level) {
            case "ERROR":
                return "text-red-500";
            case "WARNING":
                return "text-yellow-500";
            case "INFO":
                return "text-blue-400";
            case "DEBUG":
                return "text-slate-500";
            default:
                return "text-slate-300";
        }
    };

    return (
        <Card className="bg-slate-950 text-slate-50 font-mono text-xs border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full min-h-[400px]">
            <CardHeader className="py-3 border-b border-slate-800 flex flex-row items-center space-y-0 shrink-0">
                <div className="flex items-center">
                    <Terminal className="h-4 w-4 mr-2 text-slate-400" />
                    <CardTitle className="text-sm font-semibold text-slate-300">
                        Evaluation Logs
                    </CardTitle>
                </div>
                <div className="ml-auto flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden relative">
                <div
                    ref={scrollRef}
                    className="absolute inset-0 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
                >
                    {logs.length === 0 ? (
                        <div className="text-slate-600 italic animate-pulse">
                            {isLoading ? "Starting evaluation engine..." : "No logs available."}
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="flex gap-3 hover:bg-white/5 -mx-1 px-1 rounded transition-colors group">
                                <span className="text-slate-600 shrink-0 select-none opacity-50 group-hover:opacity-100 transition-opacity">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className={`font-bold shrink-0 w-12 select-none ${getLogLevelColor(log.level)}`}>
                                    {log.level.padEnd(5)}
                                </span>
                                <span className="text-slate-300 break-all">
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
