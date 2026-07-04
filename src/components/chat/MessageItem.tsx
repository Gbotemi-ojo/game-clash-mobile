// src/components/chat/MessageItem.tsx
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { safeParseDate, formatTime, formatDatePill, getTick } from '../../utils/chatHelpers';

interface MessageItemProps {
  item: any;
  isLastItem: boolean;
  olderMessage: any;
  currentUserId: string;
  opponentName: string;
  repliedMessage: any;
  isHighlighted: boolean;
  isGroup: boolean;
  resolvedSenderName: string;
  onLongPress: (msg: any) => void;
  onReply: (msg: any) => void;
  onPressReplyBlock: (replyId: number) => void;
  onPressSender: (senderId: string) => void;
}

const MessageItemComponent = ({ 
  item, isLastItem, olderMessage, currentUserId, opponentName, repliedMessage, 
  isHighlighted, isGroup, resolvedSenderName, onLongPress, onReply, onPressReplyBlock, onPressSender 
}: MessageItemProps) => {
  const swipeableRef = useRef<Swipeable>(null);
  const isMe = currentUserId && item.senderId === currentUserId;
  const currentDate = safeParseDate(item.createdAt);
  const olderDate = olderMessage ? safeParseDate(olderMessage.createdAt) : null;
  
  let showDateSeparator = false;
  if (isLastItem && currentDate) { 
    showDateSeparator = true; 
  } else if (currentDate && olderDate) { 
    showDateSeparator = currentDate.toDateString() !== olderDate.toDateString(); 
  }
  
  const timeString = formatTime(item.createdAt);

  const renderLeftActions = () => (
    <View style={styles.swipeReplyContainer}>
      <View style={styles.swipeReplyCircle}>
        <Ionicons name="arrow-undo" size={20} color="#fff" />
      </View>
    </View>
  );

  return (
    <View>
      {showDateSeparator && (
        <View style={styles.datePillContainer}>
          <Text style={styles.datePillText}>{formatDatePill(item.createdAt)}</Text>
        </View>
      )}
      
      <Swipeable 
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        overshootLeft={false}
        onSwipeableOpen={() => {
          onReply(item);
          swipeableRef.current?.close(); 
        }}
      >
        <TouchableOpacity 
          activeOpacity={0.7} 
          onLongPress={() => onLongPress(item)}
          style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}
        >
          <View style={[
            styles.messageBubble, 
            isMe ? styles.messageBubbleMe : styles.messageBubbleThem,
            isHighlighted && styles.messageBubbleHighlighted,
            item.status === 'failed' && { opacity: 0.7 }
          ]}>
            
            {isGroup && !isMe && (
              <TouchableOpacity onPress={() => onPressSender(item.senderId)} activeOpacity={0.7}>
                <Text style={styles.groupSenderName}>{resolvedSenderName}</Text>
              </TouchableOpacity>
            )}

            {item.replyToId && (
              <TouchableOpacity 
                activeOpacity={0.6}
                onPress={() => onPressReplyBlock(item.replyToId)}
                style={[styles.repliedMessageBlock, isMe ? styles.repliedMessageBlockMe : styles.repliedMessageBlockThem]}
              >
                <Text style={[styles.repliedMessageName, isMe ? { color: '#e0f2fe' } : { color: '#38bdf8' }]} numberOfLines={1}>
                  {repliedMessage ? (repliedMessage.senderId === currentUserId ? 'You' : (isGroup ? resolvedSenderName : opponentName)) : 'Original message'}
                </Text>
                <Text style={styles.repliedMessageText} numberOfLines={2}>
                  {repliedMessage ? (repliedMessage.content || repliedMessage.text) : '...'}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.messageText}>{item.content || item.text}</Text>
            
            <View style={styles.messageMetaRow}>
              {item.isEdited && (
                <Text style={[styles.messageTime, { fontStyle: 'italic', marginRight: 4 }]}>Edited</Text>
              )}
              {timeString !== '' && <Text style={styles.messageTime}>{timeString}</Text>}
              {isMe && <Text style={[
                styles.tickText, 
                item.status === 'read' && { color: '#38bdf8' },
                item.status === 'failed' && { color: '#ef4444' }
              ]}>{getTick(item.status)}</Text>}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </View>
  );
};

export const MessageItem = React.memo(MessageItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.localId === nextProps.item.localId &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.item.content === nextProps.item.content &&
    prevProps.item.isEdited === nextProps.item.isEdited &&
    prevProps.isHighlighted === nextProps.isHighlighted && 
    prevProps.isLastItem === nextProps.isLastItem && 
    prevProps.opponentName === nextProps.opponentName &&
    prevProps.resolvedSenderName === nextProps.resolvedSenderName &&
    prevProps.olderMessage?.localId === nextProps.olderMessage?.localId &&
    prevProps.repliedMessage?.id === nextProps.repliedMessage?.id &&
    prevProps.repliedMessage?.isEdited === nextProps.repliedMessage?.isEdited &&
    prevProps.repliedMessage?.content === nextProps.repliedMessage?.content
  );
});

const styles = StyleSheet.create({
  datePillContainer: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  datePillText: { backgroundColor: '#1f1f25', color: '#a1a1aa', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  swipeReplyContainer: { justifyContent: 'center', alignItems: 'flex-start', width: 60, paddingLeft: 10, marginBottom: 16 },
  swipeReplyCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1f1f25', justifyContent: 'center', alignItems: 'center' },
  messageWrapper: { marginBottom: 16, flexDirection: 'row' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10 },
  messageBubbleMe: { backgroundColor: '#3b82f6', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  messageBubbleThem: { backgroundColor: '#27272a', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 4, borderBottomRightRadius: 16 },
  messageBubbleHighlighted: { borderWidth: 2, borderColor: '#22d3ee', shadowColor: '#22d3ee', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
  groupSenderName: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  messageText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  messageMetaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 },
  messageTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  tickText: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  repliedMessageBlock: { padding: 8, borderRadius: 6, marginBottom: 6, borderLeftWidth: 3 },
  repliedMessageBlockMe: { backgroundColor: 'rgba(255,255,255,0.15)', borderLeftColor: '#bae6fd' },
  repliedMessageBlockThem: { backgroundColor: '#3f3f46', borderLeftColor: '#10b981' },
  repliedMessageName: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  repliedMessageText: { color: '#d4d4d8', fontSize: 12 },
});
