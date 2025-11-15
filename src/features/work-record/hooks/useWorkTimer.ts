import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Database, Row, TaskMaster, FunctionDeclaration, Blob } from '@shared/types';
import { WorkSession, WorkSessionQuote, LogFormData } from '../types';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useAuth } from '@core/contexts/AuthContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';

// Base64 encode function
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

const controlTimerFunctionDeclaration: FunctionDeclaration = {
  name: 'controlTimer',
  parameters: {
    type: Type.OBJECT,
    description: '作業タイマーを操作する。',
    properties: {
      equipment_name: {
        type: Type.STRING,
        description: '操作対象の機器名やタスク名。（例: 「コンベア」, 「プレス機」）',
      },
      action: {
        type: Type.STRING,
        description: 'タイマーの操作。「start」または「stop」のいずれか。',
      },
    },
    required: ['equipment_name', 'action'],
  },
};


interface ActiveSession {
    id: string; // Typically taskMasterId or a unique identifier like equipment name
    startTime: number;
    name: string;
}

interface SessionToLog {
    startTime: number;
    endTime: number;
    duration: number;
    taskMasterId: string;
    name: string;
    logId: string;
}

const ACTIVE_SESSIONS_KEY = 'activeWorkSessions';
const UNSAVED_SESSIONS_KEY = 'unsavedWorkSessionsToLog';
const UNSAVED_FORMS_KEY = 'unsavedLogFormsData';


export const useWorkTimer = () => {
    const { database, setDatabase } = useDatabase();
    const { currentUser } = useAuth();
    const { currentPage } = useNavigation();

    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});
    const intervalRef = useRef<number | null>(null);

    const [sessionsToLog, setSessionsToLog] = useState<SessionToLog[]>([]);
    const [logFormsData, setLogFormsData] = useState<Record<string, LogFormData>>({});
    
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [quoteModalForLogId, setQuoteModalForLogId] = useState<string | null>(null);
    
    const [isRecording, setIsRecording] = useState(false);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    // FIX: Add explicit type arguments to new Map() to resolve type inference issue.
    const taskMasterMap = useMemo(() => new Map<string, TaskMaster>((database?.task_master?.data as TaskMaster[] || []).map(t => [t.id as string, t])), [database?.task_master]);

    useEffect(() => {
        try {
            const savedSessions = localStorage.getItem(ACTIVE_SESSIONS_KEY);
            if (savedSessions) setActiveSessions(JSON.parse(savedSessions));
            
            const savedSessionsToLog = localStorage.getItem(UNSAVED_SESSIONS_KEY);
            const savedLogFormsData = localStorage.getItem(UNSAVED_FORMS_KEY);
            if (savedSessionsToLog && savedLogFormsData) {
                setSessionsToLog(JSON.parse(savedSessionsToLog));
                setLogFormsData(JSON.parse(savedLogFormsData));
            }
        } catch (e) { console.error("Could not load saved sessions from localStorage", e); }
    }, []);

    useEffect(() => {
        if (sessionsToLog.length > 0 || Object.keys(logFormsData).length > 0) {
            localStorage.setItem(UNSAVED_SESSIONS_KEY, JSON.stringify(sessionsToLog));
            localStorage.setItem(UNSAVED_FORMS_KEY, JSON.stringify(logFormsData));
        } else {
            localStorage.removeItem(UNSAVED_SESSIONS_KEY);
            localStorage.removeItem(UNSAVED_FORMS_KEY);
        }
    }, [sessionsToLog, logFormsData]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (activeSessions.length > 0 || sessionsToLog.length > 0) {
                e.preventDefault();
                e.returnValue = '計測中または未保存の作業記録があります。ページを離れてもよろしいですか？';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [activeSessions.length, sessionsToLog.length]);

    useEffect(() => {
        if (activeSessions.length > 0) {
            localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(activeSessions));
            const updateTimers = () => {
                const now = Date.now();
                setElapsedTimes(
                    activeSessions.reduce((acc, session) => {
                        acc[session.id] = now - session.startTime;
                        return acc;
                    }, {} as Record<string, number>)
                );
            };
            updateTimers();
            intervalRef.current = window.setInterval(updateTimers, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            localStorage.removeItem(ACTIVE_SESSIONS_KEY);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [activeSessions]);

    const startSession = useCallback((taskMasterId: string) => {
        const task = taskMasterMap.get(taskMasterId);
        if (task && !activeSessions.some(s => s.id === task.id)) {
            setActiveSessions(prev => [...prev, { id: task.id as string, startTime: Date.now(), name: task.name as string }]);
        }
        setIsTaskModalOpen(false);
    }, [taskMasterMap, activeSessions]);

    const stopSession = useCallback((sessionId: string) => {
        const session = activeSessions.find(s => s.id === sessionId);
        if (session) {
            const endTime = Date.now();
            const newLog: SessionToLog = {
                startTime: session.startTime,
                endTime: endTime,
                duration: endTime - session.startTime,
                taskMasterId: session.id,
                name: session.name,
                logId: `log_${endTime}`
            };
            setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
            setSessionsToLog(prev => [newLog, ...prev]);
            setLogFormsData(prev => ({
                ...prev,
                [newLog.logId]: { notes: '', selectedQuoteIds: [], isCreatingNewQuote: false, newQuoteSubject: '' }
            }));
        }
    }, [activeSessions]);

    const handleLogFormChange = (logId: string, field: keyof LogFormData, value: any) => {
        setLogFormsData(prev => ({ ...prev, [logId]: { ...prev[logId], [field]: value } }));
    };

    const handleSaveLog = (logId: string) => {
        const log = sessionsToLog.find(s => s.logId === logId);
        const formData = logFormsData[logId];
        if (!log || !formData || !currentUser) return;

        const operations: { tableName: string, data: Row }[] = [];
        const workSession: WorkSession = {
            id: `ws_${log.startTime}`, user_id: currentUser.id, task_master_id: log.taskMasterId,
            start_time: new Date(log.startTime).toISOString(), end_time: new Date(log.endTime).toISOString(),
            duration_minutes: Math.round(log.duration / 60000), notes: formData.notes,
        };
        operations.push({ tableName: 'work_sessions', data: workSession });
        
        let allQuoteIds = [...formData.selectedQuoteIds];
        
        if (formData.isCreatingNewQuote && formData.newQuoteSubject.trim()) {
            const newQuoteId = `qt_${Date.now()}`;
            operations.push({ tableName: 'quotes', data: { id: newQuoteId, subject: formData.newQuoteSubject, quote_status: '受注', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
            allQuoteIds.push(newQuoteId);
        }

        allQuoteIds.forEach(quoteId => {
            operations.push({ tableName: 'work_session_quotes', data: { id: `wsq_${log.startTime}_${quoteId}`, work_session_id: workSession.id, quote_id: quoteId } });
        });
        
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            operations.forEach(op => { if (newDb[op.tableName]) newDb[op.tableName].data.push(op.data); });
            return newDb;
        });

        // サーバーに保存
        (async () => {
            try {
                if (!database) return;
                
                // テーブルごとに操作をグループ化
                const operationsByTable = new Map<string, Array<{ type: 'INSERT'; data: Row }>>();
                
                operations.forEach(op => {
                    if (!operationsByTable.has(op.tableName)) {
                        operationsByTable.set(op.tableName, []);
                    }
                    operationsByTable.get(op.tableName)!.push({
                        type: 'INSERT',
                        data: op.data
                    });
                });

                // 各テーブルに対してサーバー更新を実行
                for (const [tableName, tableOps] of operationsByTable) {
                    const serverOperations = tableOps.map(op => ({
                        type: 'INSERT' as const,
                        data: op.data
                    }));

                    const result = await updateDatabase(currentPage, tableName, serverOperations, database);
                    if (!result.success) {
                        throw new Error(result.error || `Failed to save ${tableName} to server`);
                    }
                }
            } catch (error) {
                console.error('[useWorkTimer] Failed to save log to server:', error);
                alert('サーバーへの保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
            }
        })();

        setSessionsToLog(prev => prev.filter(s => s.logId !== logId));
        setLogFormsData(prev => { const newForms = { ...prev }; delete newForms[logId]; return newForms; });
    };

    const handleDeleteLog = useCallback((logId: string) => {
        if (window.confirm('この未保存の作業記録を破棄しますか？')) {
            setSessionsToLog(prev => prev.filter(s => s.logId !== logId));
            setLogFormsData(prev => {
                const newForms = { ...prev };
                delete newForms[logId];
                return newForms;
            });
        }
    }, []);
    
    const handleDeleteHistory = useCallback((sessionId: string) => {
        if (window.confirm('この保存済み作業記録を削除しますか？関連する案件紐付けも削除されます。')) {
            // まずローカル状態を更新
            setDatabase(db => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                if (newDb.work_sessions) {
                    newDb.work_sessions.data = newDb.work_sessions.data.filter((s: Row) => s.id !== sessionId);
                }
                if (newDb.work_session_quotes) {
                    newDb.work_session_quotes.data = newDb.work_session_quotes.data.filter((wsq: Row) => wsq.work_session_id !== sessionId);
                }
                return newDb;
            });

            // サーバーから削除
            (async () => {
                try {
                    if (!database) return;

                    // work_session_quotesを先に削除（外部キー制約のため）
                    const quotesToDelete = (database.work_session_quotes?.data || []).filter((wsq: Row) => wsq.work_session_id === sessionId);
                    if (quotesToDelete.length > 0) {
                        const quoteOperations = quotesToDelete.map((wsq: Row) => ({
                            type: 'DELETE' as const,
                            where: { id: wsq.id }
                        }));
                        const quoteResult = await updateDatabase(currentPage, 'work_session_quotes', quoteOperations, database);
                        if (!quoteResult.success) {
                            throw new Error(quoteResult.error || 'Failed to delete work_session_quotes from server');
                        }
                    }

                    // work_sessionsを削除
                    const sessionOperations = [{
                        type: 'DELETE' as const,
                        where: { id: sessionId }
                    }];
                    const sessionResult = await updateDatabase(currentPage, 'work_sessions', sessionOperations, database);
                    if (!sessionResult.success) {
                        throw new Error(sessionResult.error || 'Failed to delete work_session from server');
                    }
                } catch (error) {
                    console.error('[useWorkTimer] Failed to delete history from server:', error);
                    alert('サーバーからの削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
                }
            })();
        }
    }, [setDatabase, database, currentPage]);

    const toggleRecording = useCallback(async () => {
        if (isRecording) {
            setIsRecording(false);
            sessionPromiseRef.current?.then(session => session.close());
            audioStreamRef.current?.getTracks().forEach(track => track.stop());
            scriptProcessorRef.current?.disconnect();
            mediaStreamSourceRef.current?.disconnect();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
            }
            sessionPromiseRef.current = null;
            return;
        }
    
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            setIsRecording(true);
            const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});
    
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        audioContextRef.current = context;
                        const source = context.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        const processor = context.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = processor;
                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = { data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32767)).buffer)), mimeType: 'audio/pcm;rate=16000' };
                            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processor);
                        processor.connect(context.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'controlTimer') {
                                    const { equipment_name, action } = fc.args;
                                    const taskName = String(equipment_name || '').toLowerCase();
                                    const task = [...taskMasterMap.values()].find(t => (t.name as string).toLowerCase().includes(taskName));
                                    if (task) {
                                        if (action === 'start') startSession(task.id as string);
                                        else if (action === 'stop') stopSession(task.id as string);
                                    }
                                    sessionPromiseRef.current?.then((session) => session.sendToolResponse({ functionResponses: { id : fc.id, name: fc.name, response: { result: `Timer for ${taskName} ${action}ed.` } } }));
                                }
                            }
                        }
                    },
                    onerror: (e: ErrorEvent) => { console.error('Live session error:', e); alert('音声認識セッションでエラーが発生しました。'); if (isRecording) toggleRecording(); },
                    onclose: () => { console.debug('Live session closed.'); if (isRecording) toggleRecording(); },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    tools: [{ functionDeclarations: [controlTimerFunctionDeclaration] }],
                }
            });
        } catch (err) {
            console.error('Failed to get microphone access:', err);
            alert('マイクへのアクセスが拒否されました。');
            setIsRecording(false);
        }
    }, [isRecording, taskMasterMap, startSession, stopSession]);

    return {
        activeSessions,
        elapsedTimes,
        sessionsToLog,
        logFormsData,
        startSession,
        stopSession,
        handleLogFormChange,
        handleSaveLog,
        handleDeleteLog,
        handleDeleteHistory,
        isRecording,
        toggleRecording,
        isTaskModalOpen,
        setIsTaskModalOpen,
        quoteModalForLogId,
        setQuoteModalForLogId
    };
};