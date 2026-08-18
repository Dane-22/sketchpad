import React from 'react';
import { Layer, Group, Circle, Text } from 'react-konva';
import { CanvasComment } from '../../types/comment';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';

interface CommentPinLayerProps {
  comments: CanvasComment[];
  activeCommentId: string | null;
  onSelectComment: (commentId: string) => void;
  pendingPinPos: { x: number; y: number } | null;
}

export const CommentPinLayer: React.FC<CommentPinLayerProps> = ({
  comments,
  activeCommentId,
  onSelectComment,
  pendingPinPos,
}) => {
  const { stageScale } = useCanvasState();

  // Pin base size scaled to maintain consistent screen-space dimension
  const pinRadius = 14 / stageScale;
  const fontSize = 11 / stageScale;

  return (
    <Layer>
      {comments.map((comment, index) => {
        const isSelected = activeCommentId === comment.id;
        const isResolved = comment.isResolved;
        const replyCount = comment.replies?.length || 0;

        // Visual colors based on state
        const pinFill = isResolved ? '#10b981' : isSelected ? '#3b82f6' : '#f59e0b';
        const ringColor = isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)';

        return (
          <Group
            key={comment.id}
            x={comment.x}
            y={comment.y}
            onClick={(e) => {
              e.cancelBubble = true;
              onSelectComment(comment.id);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onSelectComment(comment.id);
            }}
            cursor="pointer"
          >
            {/* Outer Glow / Ring when selected */}
            {isSelected && (
              <Circle
                radius={pinRadius + 6 / stageScale}
                stroke="#3b82f6"
                strokeWidth={3 / stageScale}
                opacity={0.6}
              />
            )}

            {/* Main Pin Circle */}
            <Circle
              radius={pinRadius}
              fill={pinFill}
              stroke={ringColor}
              strokeWidth={2 / stageScale}
              shadowColor="black"
              shadowBlur={6}
              shadowOffset={{ x: 0, y: 2 }}
              shadowOpacity={0.4}
            />

            {/* Pin Number */}
            <Text
              text={`${index + 1}`}
              fontSize={fontSize}
              fontStyle="bold"
              fill="#ffffff"
              align="center"
              verticalAlign="middle"
              x={-pinRadius}
              y={-pinRadius}
              width={pinRadius * 2}
              height={pinRadius * 2}
              listening={false}
            />

            {/* Reply Count Badge */}
            {replyCount > 0 && (
              <Group x={pinRadius * 0.7} y={-pinRadius * 0.7}>
                <Circle
                  radius={7 / stageScale}
                  fill="#1e293b"
                  stroke="#ffffff"
                  strokeWidth={1 / stageScale}
                />
                <Text
                  text={`${replyCount}`}
                  fontSize={8 / stageScale}
                  fontStyle="bold"
                  fill="#ffffff"
                  align="center"
                  verticalAlign="middle"
                  x={-7 / stageScale}
                  y={-7 / stageScale}
                  width={14 / stageScale}
                  height={14 / stageScale}
                  listening={false}
                />
              </Group>
            )}
          </Group>
        );
      })}

      {/* Pending Pin Marker (when dropping a new comment pin) */}
      {pendingPinPos && (
        <Group x={pendingPinPos.x} y={pendingPinPos.y}>
          <Circle
            radius={pinRadius + 4 / stageScale}
            stroke="#3b82f6"
            strokeWidth={2 / stageScale}
            dash={[4 / stageScale, 4 / stageScale]}
          />
          <Circle
            radius={pinRadius}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2 / stageScale}
            opacity={0.9}
          />
          <Text
            text="+"
            fontSize={fontSize * 1.3}
            fontStyle="bold"
            fill="#ffffff"
            align="center"
            verticalAlign="middle"
            x={-pinRadius}
            y={-pinRadius}
            width={pinRadius * 2}
            height={pinRadius * 2}
            listening={false}
          />
        </Group>
      )}
    </Layer>
  );
};
