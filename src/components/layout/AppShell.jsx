import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import DesktopSidebar from './DesktopSidebar';
import MobileBottomNav from './MobileBottomNav';
import ToastViewport from '../shared/ToastViewport';
import AddFriendModal from '../modals/AddFriendModal';
import { useAppContext } from '../../context/AppContext';

export default function AppShell() {
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const { addFriend } = useAppContext();

  return (
    <div className="min-h-screen">
      <DesktopSidebar onAddFriend={() => setIsAddFriendModalOpen(true)} />

      <main className="min-h-screen px-4 pb-28 pt-4 sm:px-6 lg:ml-[18rem] lg:px-8 lg:pb-8 lg:pt-8">
        <Outlet context={{ openAddFriendModal: () => setIsAddFriendModalOpen(true) }} />
      </main>

      <MobileBottomNav />
      <ToastViewport />
      <AddFriendModal
        open={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        onSave={addFriend}
      />
    </div>
  );
}
