/**
 * ConversationHistory Component
 * Displays the conversation between the user and the agent in a chat interface
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface ConversationHistoryProps {
  messages: Message[];
}

export default function ConversationHistory({ messages }: ConversationHistoryProps) {
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          La conversation apparaîtra ici
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((message) => (
        <View
          key={message.id}
          style={[
            styles.messageRow,
            message.sender === 'user' ? styles.userMessageRow : styles.agentMessageRow,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              message.sender === 'user' ? styles.userBubble : styles.agentBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.sender === 'user' ? styles.userText : styles.agentText,
              ]}
            >
              {message.text}
            </Text>
            <Text
              style={[
                styles.timestamp,
                message.sender === 'user' ? styles.userTimestamp : styles.agentTimestamp,
              ]}
            >
              {message.timestamp.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  contentContainer: {
    padding: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
  },
  messageRow: {
    marginBottom: spacing.md,
    flexDirection: 'row',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  agentMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  userBubble: {
    backgroundColor: colors.accent.gold,
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    backgroundColor: colors.gray[300],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  userText: {
    color: colors.text.primary,
  },
  agentText: {
    color: colors.text.primary,
  },
  timestamp: {
    ...typography.caption,
    fontSize: 11,
  },
  userTimestamp: {
    color: 'rgba(76, 76, 76, 0.7)',
    textAlign: 'right',
  },
  agentTimestamp: {
    color: colors.text.muted,
    textAlign: 'left',
  },
});
