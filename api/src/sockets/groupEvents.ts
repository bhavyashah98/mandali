import { Server } from 'socket.io';
import { randomUUID } from 'crypto';

export enum GroupEventType {
    GROUP_CREATED = 'group_created',
    GROUP_UPDATED = 'group_updated',
    MEMBER_JOINED = 'member_joined',
    MEMBER_LEFT = 'member_left',
    MEMBERSHIP_CHANGED = 'membership_changed'
}

export interface GroupSocketEvent {
    id: string;
    type: GroupEventType;
    timestamp: string;
    payload: {
        groupId: string;
        senderId?: string;
        data?: any;
    };
}

export const emitGroupEvent = (
    io: Server,
    groupId: string,
    type: GroupEventType,
    data: any = {},
    targetUserIds: string[] = [],
    includeGroupRoom: boolean = true
) => {
    const event: GroupSocketEvent = {
        id: randomUUID(),
        type,
        timestamp: new Date().toISOString(),
        payload: {
            groupId,
            data,
        },
    };

    const rooms = new Set<string>();

    // 1. User-level rooms (GroupList updates)
    targetUserIds.forEach((uid) => {
        rooms.add(`user_${uid}`);
    });

    // 2. Group room (GroupDetails updates)
    if (includeGroupRoom) {
        rooms.add(`group_${groupId}`);
    }

    // 3. Emit SINGLE event channel
    rooms.forEach((room) => {
        io.to(room).emit('group_event', event);
    });

    console.log(
        `[Socket] 📢 ${type} → rooms [${Array.from(rooms).join(', ')}] (id: ${event.id})`
    );
};
