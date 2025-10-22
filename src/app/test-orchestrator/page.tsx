// src/app/test-chat/page.tsx
import PathwayChat from '@/app/components/PathwayChat';

export default function TestChatPage() {
  return (
    <div className="h-screen w-full">
      <PathwayChat />
    </div>
  );
}

// Optional: Add metadata for the page
export const metadata = {
  title: 'Hawaii Pathway Advisor - Chat',
  description: 'Explore educational pathways from high school to career in Hawaii',
};