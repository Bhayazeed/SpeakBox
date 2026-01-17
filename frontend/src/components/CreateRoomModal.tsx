import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, AlertTriangle, Loader2 } from 'lucide-react';

interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRoomCreated: (room: { id: string; title: string; topic: string; opening_question: string }) => void;
}

export const CreateRoomModal = ({ isOpen, onClose, onRoomCreated }: CreateRoomModalProps) => {
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/rooms/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, topic })
            });

            const data = await response.json();

            if (data.success) {
                onRoomCreated({
                    id: data.room_id,
                    title,
                    topic,
                    opening_question: data.opening_question
                });
                setTitle('');
                setTopic('');
                onClose();
            } else {
                setError(data.error || 'Failed to create room');
            }
        } catch (err) {
            setError('Could not connect to server. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg p-8 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl"
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
                                <Plus size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Create Debate Room</h2>
                                <p className="text-white/50 text-sm">Start a new conversation topic</p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
                            >
                                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                                <p className="text-red-300 text-sm">{error}</p>
                            </motion.div>
                        )}

                        {/* Form */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-white/70 text-sm font-medium mb-2">
                                    Room Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Climate Action Debate"
                                    maxLength={50}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-colors"
                                />
                                <p className="text-white/30 text-xs mt-1">{title.length}/50 characters</p>
                            </div>

                            <div>
                                <label className="block text-white/70 text-sm font-medium mb-2">
                                    Opening Topic
                                </label>
                                <textarea
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., Should governments mandate carbon taxes to combat climate change?"
                                    maxLength={200}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-colors resize-none"
                                />
                                <p className="text-white/30 text-xs mt-1">{topic.length}/200 characters</p>
                            </div>

                            {/* Content Policy Notice */}
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-white/50 text-xs leading-relaxed">
                                    <strong className="text-white/70">Content Policy:</strong> Topics promoting hate speech,
                                    violence, discrimination, or illegal activities will be automatically rejected.
                                </p>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || title.length < 3 || topic.length < 10}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        Create Room
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
