import { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSocket, useAppState } from '../hooks/useSocket';
import { useSpatialAudio } from '../hooks/useSpatialAudio';
import { Howler } from 'howler';
import { ReplyModal } from './ReplyModal';
import { LogOut } from 'lucide-react';
import { useToast } from './Toast';

interface RoomData {
    id: string;
    title: string;
    topic: string;
    opening_question?: string;
    audioUrl?: string;
    color?: string;
}

interface SpatialCanvasProps {
    roomId: string;
    roomData?: RoomData | null;
    username?: string;
    onExit: () => void;
}

export const SpatialCanvas = ({ roomId, roomData, username, onExit }: SpatialCanvasProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Reply Interaction State
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [focusTimer, setFocusTimer] = useState<number>(0);
    const [canReply, setCanReply] = useState(false);

    // Access state from store (hooked up to WebSocket in App or here)
    const { nodes, users } = useAppState();

    // Seed nodes based on room - RESET when entering a new room
    // Neo-brutalist color palette for nodes
    const BRUTAL_COLORS = ['#FFE600', '#0066FF', '#FF4D6D', '#00D26A', '#9747FF', '#FF6B35', '#00C2FF'];

    useEffect(() => {
        const getRandomColor = () => BRUTAL_COLORS[Math.floor(Math.random() * BRUTAL_COLORS.length)];

        // Custom room - use opening question from roomData
        if (roomData && roomId.startsWith('custom-')) {
            useAppState.getState().setNodes([
                {
                    id: '1',
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2,
                    color: getRandomColor(),
                    text: roomData.opening_question || roomData.topic,
                    audioUrl: roomData.audioUrl
                }
            ]);
        } else if (roomId === 'room-a') {
            useAppState.getState().setNodes([
                { id: '1', x: window.innerWidth / 2, y: window.innerHeight / 2, color: '#0066FF', text: "Is free will an illusion? Share your perspective." }
            ]);
        } else if (roomId === 'room-b') {
            useAppState.getState().setNodes([
                { id: '2', x: window.innerWidth / 2, y: window.innerHeight / 2, color: '#9747FF', text: "Should AI be regulated? Debate the policy." }
            ]);
        }
    }, [roomId, roomData]);

    // Local mouse tracking
    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        // TODO: Send to WebSocket
    };

    // Toast notifications
    const { showToast } = useToast();

    // Handle reply from ReplyModal - now receives AI-processed audioUrl and summary
    const handleReply = (audioUrl: string, summary: string) => {
        const newNodeId = `reply-${Date.now()}`; // Unique ID

        // Find the parent node we're replying to
        const parentNode = nodes.find(n => n.id === focusedNodeId);
        const originX = parentNode ? parentNode.x : mousePos.x;
        const originY = parentNode ? parentNode.y : mousePos.y;

        // Spawn at a fixed distance (400px) at a random angle
        const angle = Math.random() * Math.PI * 2;
        const offset = 400;

        // Pick random brutalist color
        const randomColor = BRUTAL_COLORS[Math.floor(Math.random() * BRUTAL_COLORS.length)];

        const displayName = username || 'You';
        const newUserNode = {
            id: newNodeId,
            x: originX + Math.cos(angle) * offset,
            y: originY + Math.sin(angle) * offset,
            color: randomColor,
            text: summary, // AI-generated summary from backend
            audioUrl: audioUrl,
            parentId: focusedNodeId || undefined,
            author: displayName
        };

        useAppState.getState().setNodes([...nodes, newUserNode]);

        // Show success toast
        showToast(`✨ Reply added by ${displayName}`, 'success');
    };

    // Audio Logic
    const audioSources = useMemo(() => {
        return nodes.map(n => {
            // If it's a user reply, use the stored URL
            // @ts-ignore - We are hacking the store type strictly for this demo
            if (n.audioUrl) return { id: n.id, x: n.x, y: n.y, src: n.audioUrl };

            // Hardcoded mapping for initial nodes
            if (n.id === '1') return { id: n.id, x: n.x, y: n.y, src: '/recording_5.m4a' };
            if (n.id === '2') return { id: n.id, x: n.x, y: n.y, src: '/recording_6.m4a' };

            return { id: n.id, x: n.x, y: n.y, src: '/white_noise.wav' };
        });
    }, [nodes]);

    const { distances } = useSpatialAudio(mousePos.x, mousePos.y, audioSources);

    // Calculate closest node for blur effect
    const minDistance = Object.values(distances).length > 0 ? Math.min(...Object.values(distances)) : 1000;

    // Focus / Reply Logic with Momentum Lock
    useEffect(() => {
        const CLOSE_THRESHOLD = 250;
        const ABANDON_THRESHOLD = 400; // Must move this far to break momentum lock
        const MOMENTUM_LOCK_PERCENT = 20; // Lock in after 20% progress (faster lock)

        // Get all nodes within close threshold and find the closest
        const nodesWithinRange = Object.entries(distances)
            .filter(([_, dist]) => dist < CLOSE_THRESHOLD)
            .sort((a, b) => a[1] - b[1]);

        const closestNodeId = nodesWithinRange.length > 0 ? nodesWithinRange[0][0] : null;

        // If we have momentum lock (timer > 20%), only break focus if we move very far away
        const currentFocusDistance = focusedNodeId ? distances[focusedNodeId] : Infinity;
        const hasMomentumLock = focusTimer >= MOMENTUM_LOCK_PERCENT;

        if (hasMomentumLock && focusedNodeId) {
            // Only break lock if we move beyond the abandon threshold
            if (currentFocusDistance > ABANDON_THRESHOLD) {
                setFocusedNodeId(null);
                setFocusTimer(0);
                setCanReply(false);
            }
            // Otherwise, keep the current focus (momentum lock active)
        } else {
            // Normal behavior: focus on closest node
            if (closestNodeId) {
                if (closestNodeId !== focusedNodeId) {
                    setFocusTimer(0); // Reset timer when switching
                    setCanReply(false);
                }
                setFocusedNodeId(closestNodeId);
            } else {
                setFocusedNodeId(null);
                setFocusTimer(0);
                setCanReply(false);
            }
        }
    }, [distances, focusTimer, focusedNodeId]);

    // Modal State
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

    // Keyboard Hotkeys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Space: Reply when timer is complete (original behavior)
            if (e.code === 'Space' && canReply && focusedNodeId) {
                e.preventDefault();
                setIsReplyModalOpen(true);
            }

            // R: INSTANT reply when near any node (bypasses timer)
            if (e.code === 'KeyR' && focusedNodeId && !isReplyModalOpen) {
                e.preventDefault();
                setIsReplyModalOpen(true);
            }

            // Escape: Close modal
            if (e.code === 'Escape' && isReplyModalOpen) {
                setIsReplyModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canReply, focusedNodeId]);

    // Mute Audio when Modal is Open
    useEffect(() => {
        Howler.mute(isReplyModalOpen);
        return () => {
            Howler.mute(false);
        };
    }, [isReplyModalOpen]);

    // Timer for unlocking reply
    useEffect(() => {
        let interval: number;
        if (focusedNodeId && !canReply) {
            interval = window.setInterval(() => {
                setFocusTimer(prev => {
                    if (prev >= 100) {
                        setCanReply(true);
                        return 100;
                    }
                    return prev + 1; // Approx 3 seconds to reach 100 if interval is 30ms
                });
            }, 30);
        }
        return () => clearInterval(interval);
    }, [focusedNodeId, canReply]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-brutal-cream overflow-auto cursor-crosshair"
            onMouseMove={handleMouseMove}
            style={{
                backgroundImage: 'linear-gradient(#1a1a1a 2px, transparent 2px), linear-gradient(90deg, #1a1a1a 2px, transparent 2px)',
                backgroundSize: '60px 60px',
                backgroundPosition: 'center center',
                minWidth: '200vw',
                minHeight: '200vh'
            }}
        >
            {/* No blur overlay for neo-brutalism - clean and sharp */}

            <ReplyModal
                isOpen={isReplyModalOpen}
                onClose={() => setIsReplyModalOpen(false)}
                nodeId={focusedNodeId || ''}
                onReply={handleReply}
            />

            {/* Edges Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {nodes.map(node => {
                    if (!node.parentId) return null;
                    const parent = nodes.find(n => n.id === node.parentId);
                    if (!parent) return null;

                    return (
                        <line
                            key={`edge-${node.id}`}
                            x1={parent.x}
                            y1={parent.y}
                            x2={node.x}
                            y2={node.y}
                            stroke="#1a1a1a"
                            strokeWidth="4"
                            strokeOpacity="1"
                        />
                    );
                })}
            </svg>

            {/* Render Nodes - Neo Brutalist Squares */}
            {nodes.map(node => (
                <motion.div
                    key={node.id}
                    className="absolute flex items-center justify-center group border-4 border-brutal-black"
                    style={{
                        left: node.x,
                        top: node.y,
                        width: 90,
                        height: 90,
                        x: '-50%',
                        y: '-50%',
                        backgroundColor: node.color,
                        boxShadow: '6px 6px 0px #1a1a1a'
                    }}
                    whileHover={{
                        scale: 1.05,
                        boxShadow: '8px 8px 0px #1a1a1a'
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 20
                    }}
                >
                    {/* Tooltip / Interaction Ring */}
                    {focusedNodeId === node.id && (
                        <>
                            {/* Progress Ring */}
                            <svg className="absolute w-24 h-24 pointer-events-none -rotate-90">
                                <circle
                                    cx="48" cy="48" r="40"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeOpacity="0.3"
                                />
                                <circle
                                    cx="48" cy="48" r="40"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeDasharray="251.2"
                                    strokeDashoffset={251.2 - (251.2 * focusTimer) / 100}
                                    className="transition-all duration-75"
                                />
                            </svg>

                            {/* Tooltip - Neo Brutalist */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-28 w-80 p-5 bg-brutal-white border-brutal-thick shadow-brutal-lg text-sm text-brutal-black z-50 pointer-events-auto"
                            >
                                <p className="font-bold mb-2 text-brutal-blue uppercase text-xs tracking-wider">Voice Summary</p>
                                <p className="mb-4 font-medium leading-relaxed">{node.text}</p>

                                {canReply ? (
                                    <button
                                        className="w-full py-3 bg-brutal-blue border-brutal shadow-brutal text-brutal-white font-bold uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm transition-all"
                                        onClick={() => setIsReplyModalOpen(true)}
                                    >
                                        Reply Now
                                    </button>
                                ) : (
                                    <p className="text-xs text-center text-brutal-black/50 font-bold uppercase">Listening... {Math.round(focusTimer)}%</p>
                                )}
                                <div className="mt-3 flex justify-center gap-4 text-[10px] text-brutal-black/40 uppercase tracking-widest font-bold">
                                    <span><kbd className="px-1.5 py-0.5 bg-brutal-gray border border-brutal-black">R</kbd> Reply</span>
                                    <span><kbd className="px-1.5 py-0.5 bg-brutal-gray border border-brutal-black">Space</kbd> Send</span>
                                </div>
                            </motion.div>
                        </>
                    )}
                </motion.div>
            ))}

            {/* Render Other Users (Cursors) */}
            {users.map(user => (
                <div
                    key={user.id}
                    className="absolute w-4 h-4 rounded-full border-2 border-white/50 pointer-events-none"
                    style={{
                        left: user.x,
                        top: user.y,
                        transform: 'translate(-50%, -50%)'
                    }}
                />
            ))}

            {/* HUD / Debug Info - Neo Brutalist */}
            <div className="absolute bottom-4 left-4 px-3 py-2 bg-brutal-black/80 border-2 border-brutal-white/30 text-xs text-brutal-white/50 font-bold uppercase pointer-events-none">
                ROOM: {roomId} | FOCUS: {focusedNodeId || 'NONE'}
            </div>

            {/* Exit Button - Neo Brutalist */}
            <button
                onClick={onExit}
                className="absolute top-6 left-6 flex items-center gap-2 px-5 py-3 bg-brutal-white border-brutal shadow-brutal text-brutal-black font-bold uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm transition-all z-50 text-xs tracking-widest"
            >
                <LogOut size={16} strokeWidth={3} /> Exit Room
            </button>
        </div>
    );
};
