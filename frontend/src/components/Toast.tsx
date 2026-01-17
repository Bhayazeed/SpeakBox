import { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Neo-brutalist color mapping
    const getToastColors = (type: 'success' | 'error' | 'info') => {
        switch (type) {
            case 'success':
                return 'bg-brutal-green';
            case 'error':
                return 'bg-brutal-pink';
            case 'info':
                return 'bg-brutal-cyan';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container - Neo Brutalist */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            className={`px-6 py-3 border-brutal shadow-brutal flex items-center gap-3 pointer-events-auto ${getToastColors(toast.type)} text-brutal-black`}
                        >
                            {toast.type === 'success' && <CheckCircle size={20} strokeWidth={3} />}
                            {toast.type === 'error' && <AlertCircle size={20} strokeWidth={3} />}
                            {toast.type === 'info' && <AlertCircle size={20} strokeWidth={3} />}
                            <span className="text-sm font-bold uppercase">{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="ml-2 hover:opacity-70"
                            >
                                <X size={16} strokeWidth={3} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
