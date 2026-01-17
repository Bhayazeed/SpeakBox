import { useState } from 'react';
import { SpatialCanvas } from './components/SpatialCanvas';
import { Lobby } from './components/Lobby';
import { useSocket } from './hooks/useSocket';
import { ToastProvider } from './components/Toast';

interface RoomData {
  id: string;
  title: string;
  topic: string;
  opening_question?: string;
  audioUrl?: string;
  color?: string;
}

function App() {
  const { isConnected } = useSocket('ws://localhost:8000/ws/user_1');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomData, setActiveRoomData] = useState<RoomData | null>(null);
  const [username, setUsername] = useState<string>('');

  const handleJoinRoom = (roomId: string, roomData?: RoomData, name?: string) => {
    setActiveRoomId(roomId);
    setActiveRoomData(roomData || null);
    setUsername(name || '');
  };

  const handleExitRoom = () => {
    setActiveRoomId(null);
    setActiveRoomData(null);
  };

  return (
    <ToastProvider>
      <div className="w-full h-screen bg-black text-white overflow-hidden font-sans">
        {!activeRoomId ? (
          <Lobby onJoin={handleJoinRoom} />
        ) : (
          <SpatialCanvas
            roomId={activeRoomId}
            roomData={activeRoomData}
            username={username}
            onExit={handleExitRoom}
          />
        )}

        {/* Connection Indicator - Neo Brutalist */}
        <div className={`fixed bottom-6 right-6 px-4 py-2 text-xs font-bold uppercase tracking-widest border-brutal shadow-brutal z-[100] ${isConnected
          ? 'bg-brutal-green text-brutal-black'
          : 'bg-brutal-pink text-brutal-black'
          }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${isConnected ? 'bg-brutal-black animate-pulse' : 'bg-brutal-black'}`} />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
