import React, { useMemo } from 'react';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { RemoteCursor } from '../../features/planner/hooks/useCollaboration';
import { getUserColor } from '../../features/planner/utils/colors';

import { useCanvasState } from '../../features/planner/hooks/useCanvasState';

export interface OnlineUsersWidgetProps {
  remoteCursors: Record<string, RemoteCursor>;
}

export const OnlineUsersWidget: React.FC<OnlineUsersWidgetProps> = ({ remoteCursors }) => {
  const currentUser = useAuthStore((state) => state.user);
  const myColor = useCanvasState((state) => state.userColor);

  const onlineUsers = useMemo(() => {
    const users = new Map<string, { name: string; color: string }>();
    
    // Add current user
    if (currentUser) {
      users.set('me', { 
        name: currentUser.fullName || 'You', 
        color: myColor
      });
    }

    // Add remote users
    Object.values(remoteCursors).forEach((cursor) => {
      const id = cursor.userId || cursor.socketId;
      if (!users.has(id)) {
        users.set(id, {
          name: cursor.userName || 'Engineer',
          color: cursor.color || getUserColor(id)
        });
      }
    });

    return Array.from(users.values());
  }, [remoteCursors, currentUser, myColor]);

  const displayUsers = onlineUsers.slice(0, 3);
  const extraUsers = onlineUsers.length > 3 ? onlineUsers.length - 3 : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2">
        {displayUsers.map((user, idx) => (
          <div
            key={idx}
            className="group relative w-6 h-6 rounded-full border-2 border-theme-surface flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: user.color }}
          >
            {user.name.charAt(0).toUpperCase()}
            
            {/* Custom Tooltip */}
            <div className="absolute top-full mt-2 hidden group-hover:block whitespace-nowrap bg-theme-surface border border-theme-border rounded px-2 py-1 text-xs text-white z-50 shadow-lg pointer-events-none">
              {user.name}
            </div>
          </div>
        ))}
        {extraUsers > 0 && (
          <div className="w-6 h-6 rounded-full border-2 border-theme-surface flex items-center justify-center text-[10px] font-bold bg-theme-elevated text-theme-muted shadow-sm">
            +{extraUsers}
          </div>
        )}
      </div>
      <span className="text-[10px] font-medium text-theme-muted hidden sm:inline-block">
        {onlineUsers.length} Online
      </span>
    </div>
  );
};
