import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { SocketProvider } from '@/features/socket';
import { VideoCallProvider, VideoCallUI } from '@/features/video-call';
import { CurrentUserCard } from './CurrentUserCard';
import { SearchUsers } from './SearchUsers';
import { ChatList } from './ChatList';
import { MessengerHeader } from './MessengerHeader';

export function MessengerLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  return (
    <SocketProvider>
      <VideoCallProvider>
        <div className="flex h-screen bg-primary">
        <VideoCallUI />
        {/* Backdrop for mobile when sidebar is open */}
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30 transition-opacity"
          style={{ visibility: sidebarOpen ? 'visible' : 'hidden', opacity: sidebarOpen ? 1 : 0 }}
        />
        <aside
          className={`
            w-72 sm:w-80 flex flex-col border-r border-border bg-secondary shrink-0 min-w-0
            md:relative md:translate-x-0 md:max-w-none
            fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="shrink-0 h-[25vh] min-h-[120px] max-h-[180px] p-2 border-b border-border flex items-stretch">
            <CurrentUserCard user={user} />
          </div>
          <div className="shrink-0 mt-2 px-3">
            <SearchUsers currentUserId={user.id} />
          </div>
          <div className="flex-1 min-h-0 mt-3 px-2 flex flex-col">
            <ChatList currentUserId={user.id} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </aside>
        <main className="flex-1 min-w-0 flex flex-col bg-primary overflow-hidden">
          <MessengerHeader onMenuClick={() => setSidebarOpen((o) => !o)} />
          <Outlet />
        </main>
      </div>
      </VideoCallProvider>
    </SocketProvider>
  );
}
