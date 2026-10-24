import { ChatConversation, ChatMessage } from '../types';
import { localDB } from './db';

const CHAT_CONVERSATIONS_KEY = 'app_messenger_conversations';
const CHAT_MESSAGES_KEY_PREFIX = 'app_messenger_messages_';

// Clean initial state: zero fake chat conversations
export const INITIAL_CONVERSATIONS: ChatConversation[] = [];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

export async function getConversations(): Promise<ChatConversation[]> {
  return await localDB.getSetting<ChatConversation[]>(
    CHAT_CONVERSATIONS_KEY,
    INITIAL_CONVERSATIONS
  );
}

export async function saveConversations(conversations: ChatConversation[]): Promise<void> {
  await localDB.setSetting(CHAT_CONVERSATIONS_KEY, conversations);
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const initial = INITIAL_MESSAGES[conversationId] || [];
  return await localDB.getSetting<ChatMessage[]>(
    `${CHAT_MESSAGES_KEY_PREFIX}${conversationId}`,
    initial
  );
}

export async function saveMessages(
  conversationId: string,
  messages: ChatMessage[]
): Promise<void> {
  await localDB.setSetting(`${CHAT_MESSAGES_KEY_PREFIX}${conversationId}`, messages);
}

export const QUICK_TEMPLATES = [
  'سلام، در اولین فرصت تماس می‌گیرم.',
  'پیام شما دریافت شد و در دست بررسی است.',
  'تأیید شد، اقدام بفرمایید.',
  'لطفاً فایل یا مستندات را در پیام‌رسان بفرستید.',
  'جلسه با موفقیت به پایان رسید.',
  'رسید تراکنش مالی ضمیمه شد.',
];
