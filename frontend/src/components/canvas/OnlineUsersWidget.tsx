import React, { useMemo } from 'react';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { RemoteCursor } from '../../features/planner/hooks/useCollaboration';
import { getUserColor } from '../../features/planner/utils/colors';

export interface OnlineUsersWidgetProps {
  remoteCursors: Record<string, RemoteCursor>;
}

export const OnlineUsersWidget: React.FC<OnlineUsersWidgetProps> = ({ remoteCursors }) => {
  const currentUser = useAuthStore((state) => state.user);

  const onlineUsers = useMemo(() => {
    const users = new Map<string, { name: string; color: string }>();
    
    // Add current user
    if (currentUser) {
      users.set('me', { 
        name: currentUser.fullName || 'You', 
        color: getUserColor(currentUser.id || 'me') 
      });
    }

    // Add remote users
    Object.values(remoteCursors).forEach((cursor) => {
      const id = cursor.userId || cursor.socketId;
      if (!users.has(id)) {
        users.set(id, {
          name: cursor.userName || 'Engineer',
          color: getUserColor(id)
        });
      }
    });

    return Array.from(users.values());
  }, [remoteCursors, currentUser]);

  return (
    <div className="absolute top-20 right-4 z-[999] pointer-events-none">
      <div className="bg-theme-elevated border border-theme-border rounded-xl p-3 shadow-lg backdrop-blur-sm bg-opacity-90 w-48">
        <h3 className="text-xs font-bold text-theme-text/60 uppercase tracking-wider mb-3 px-1">
          Online Users — {onlineUsers.length}
        </h3>
        <div className="flex flex-col gap-2">
          {onlineUsers.map((user, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-1 py-1 rounded-md hover:bg-theme-border/50 transition-colors"
            >
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: user.color }}
              />
              <span className="text-sm font-medium text-theme-text truncate">
                {user.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
