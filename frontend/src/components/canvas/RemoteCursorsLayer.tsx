import React from 'react';
import { Path, Text, Group, Label, Tag } from 'react-konva';
import { RemoteCursor } from '../../features/planner/hooks/useCollaboration';
import { getUserColor } from '../../features/planner/utils/colors';

interface RemoteCursorsLayerProps {
  cursors: Record<string, RemoteCursor>;
}

const RemoteCursorsLayer: React.FC<RemoteCursorsLayerProps> = ({ cursors }) => {
  return (
    <Group>
      {Object.values(cursors).map((cursor) => {
        const cursorColor = getUserColor(cursor.userId || cursor.socketId);
        
        return (
          <Group key={cursor.socketId} x={cursor.x} y={cursor.y}>
            <Path
              data="M5.65376 17.9088H5.28532L5.02465 17.6481L0.865463 13.4889L-4.4088 18.7632L-5.82302 17.349L-0.548744 12.0747L-4.70793 7.91552L-4.9686 7.65484V7.28641V0.548743L5.65376 11.1711V17.9088Z"
              fill={cursorColor}
              stroke="#ffffff"
              strokeWidth={1}
              scaleX={1.5}
              scaleY={1.5}
            />
            <Label x={15} y={15}>
              <Tag
                fill={cursorColor}
                cornerRadius={4}
              />
              <Text
                text={cursor.userName || 'Engineer'}
                fontSize={12}
                fill="#ffffff"
                padding={4}
              />
            </Label>
          </Group>
        );
      })}
    </Group>
  );
};

export default RemoteCursorsLayer;
