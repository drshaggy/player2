import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from './ChatPanel';
import { createRef } from 'react';

const baseProps = (overrides: Partial<Parameters<typeof ChatPanel>[0]> = {}) => ({
  chatMessages: [],
  isTyping: false,
  chatInput: '',
  onChatInputChange: vi.fn(),
  onSend: vi.fn(),
  chatEndRef: createRef<HTMLDivElement>(),
  ...overrides,
});

describe('ChatPanel', () => {
  it('renders the empty-state hint when there are no messages', () => {
    render(<ChatPanel {...baseProps()} />);
    expect(screen.getByText(/No conversation yet/i)).toBeInTheDocument();
  });

  it('renders existing messages with role-appropriate alignment', () => {
    render(
      <ChatPanel
        {...baseProps({
          chatMessages: [
            { role: 'user', content: 'Hello coach' },
            { role: 'assistant', content: 'Hi there' },
          ],
        })}
      />,
    );
    expect(screen.getByText('Hello coach')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('shows the typing indicator when isTyping is true', () => {
    render(<ChatPanel {...baseProps({ isTyping: true })} />);
    expect(screen.getByText(/Coach is thinking/i)).toBeInTheDocument();
  });

  it('calls onSend when the Send button is clicked', () => {
    const onSend = vi.fn();
    render(<ChatPanel {...baseProps({ onSend })} />);
    fireEvent.click(screen.getByText('Send'));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('calls onSend when Enter is pressed in the input', () => {
    const onSend = vi.fn();
    render(<ChatPanel {...baseProps({ onSend, chatInput: 'why e4?' })} />);
    const input = screen.getByPlaceholderText(/Ask a question/i);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onSend on non-Enter keys', () => {
    const onSend = vi.fn();
    render(<ChatPanel {...baseProps({ onSend })} />);
    fireEvent.keyDown(screen.getByPlaceholderText(/Ask a question/i), { key: 'a' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('propagates input changes via onChatInputChange', () => {
    const onChatInputChange = vi.fn();
    render(<ChatPanel {...baseProps({ onChatInputChange })} />);
    fireEvent.change(screen.getByPlaceholderText(/Ask a question/i), { target: { value: 'hi' } });
    expect(onChatInputChange).toHaveBeenCalledWith('hi');
  });
});
