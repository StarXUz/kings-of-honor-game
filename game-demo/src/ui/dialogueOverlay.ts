export interface DialogueMessage {
  speaker: string;
  content: string;
  tone?: 'system' | 'ally' | 'player';
}

type StreamingMessageState = {
  contentEl: HTMLDivElement;
  targetText: string;
  displayedText: string;
  rafId?: number;
};

export class DialogueOverlay {
  private readonly root: HTMLDivElement;
  private readonly title: HTMLDivElement;
  private readonly log: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly sendButton: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly status: HTMLDivElement;
  private submitHandler?: (message: string) => void;
  private readonly streamingMessages = new Map<string, StreamingMessageState>();
  private messageSerial = 0;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'dialogue-overlay hidden';

    this.title = document.createElement('div');
    this.title.className = 'dialogue-title';

    this.status = document.createElement('div');
    this.status.className = 'dialogue-status';

    this.log = document.createElement('div');
    this.log.className = 'dialogue-log';

    const composer = document.createElement('div');
    composer.className = 'dialogue-composer';

    this.input = document.createElement('input');
    this.input.className = 'dialogue-input';
    this.input.placeholder = '\u8f93\u5165\u60f3\u95ee\u7684\u8bdd\uff0c\u6bd4\u5982\uff1a\u5916\u9762\u73b0\u5728\u6700\u5371\u9669\u7684\u662f\u8c01\uff1f';

    this.sendButton = document.createElement('button');
    this.sendButton.className = 'dialogue-send';
    this.sendButton.textContent = '\u53d1\u9001';

    this.closeButton = document.createElement('button');
    this.closeButton.className = 'dialogue-close';
    this.closeButton.textContent = '\u5173\u95ed';

    composer.append(this.input, this.sendButton, this.closeButton);
    this.root.append(this.title, this.status, this.log, composer);
    document.body.appendChild(this.root);

    this.sendButton.addEventListener('click', () => this.submit());
    this.closeButton.addEventListener('click', () => this.hide());
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.submit();
      if (event.key === 'Escape') this.hide();
    });
  }

  setOnSubmit(handler: (message: string) => void): void {
    this.submitHandler = handler;
  }

  show(title: string): void {
    this.title.textContent = title;
    this.root.classList.remove('hidden');
    this.input.focus();
  }

  hide(): void {
    this.root.classList.add('hidden');
    this.setBusy(false, '');
  }

  isVisible(): boolean {
    return !this.root.classList.contains('hidden');
  }

  clear(): void {
    this.stopAllAnimations();
    this.log.innerHTML = '';
  }

  append(message: DialogueMessage): string {
    const id = this.nextMessageId();
    const { item, content } = this.createMessageNode(message);
    content.textContent = message.content;
    this.log.appendChild(item);
    this.scrollToBottom();
    this.streamingMessages.set(id, {
      contentEl: content,
      targetText: message.content,
      displayedText: message.content,
    });
    return id;
  }

  beginStreaming(message: Omit<DialogueMessage, 'content'> & { content?: string }): string {
    const id = this.nextMessageId();
    const { item, content } = this.createMessageNode({
      ...message,
      content: message.content ?? '',
    });
    this.log.appendChild(item);
    this.streamingMessages.set(id, {
      contentEl: content,
      targetText: message.content ?? '',
      displayedText: '',
    });
    this.scrollToBottom();
    if (message.content) {
      this.updateStreaming(id, message.content);
    }
    return id;
  }

  updateStreaming(id: string, content: string): void {
    const state = this.streamingMessages.get(id);
    if (!state) return;
    state.targetText = content;
    if (state.rafId == null) {
      state.rafId = window.requestAnimationFrame(() => this.stepTypewriter(id));
    }
  }

  finishStreaming(id: string, content?: string): void {
    const state = this.streamingMessages.get(id);
    if (!state) return;
    if (content != null) state.targetText = content;
    state.displayedText = state.targetText;
    state.contentEl.textContent = state.targetText;
    if (state.rafId != null) {
      window.cancelAnimationFrame(state.rafId);
      state.rafId = undefined;
    }
    this.scrollToBottom();
  }

  setBusy(busy: boolean, text = ''): void {
    this.status.textContent = text;
    this.sendButton.disabled = busy;
    this.input.disabled = busy;
  }

  private createMessageNode(message: DialogueMessage) {
    const item = document.createElement('div');
    item.className = `dialogue-item ${message.tone ?? 'ally'}`;
    const speaker = document.createElement('div');
    speaker.className = 'dialogue-speaker';
    speaker.textContent = message.speaker;
    const content = document.createElement('div');
    content.className = 'dialogue-content';
    item.append(speaker, content);
    return { item, content };
  }

  private nextMessageId(): string {
    this.messageSerial += 1;
    return `dialogue-${this.messageSerial}`;
  }

  private stepTypewriter(id: string): void {
    const state = this.streamingMessages.get(id);
    if (!state) return;

    const remaining = state.targetText.length - state.displayedText.length;
    if (remaining <= 0) {
      state.rafId = undefined;
      return;
    }

    const step = Math.max(1, Math.ceil(remaining / 18));
    state.displayedText = state.targetText.slice(0, state.displayedText.length + step);
    state.contentEl.textContent = state.displayedText;
    this.scrollToBottom();
    state.rafId = window.requestAnimationFrame(() => this.stepTypewriter(id));
  }

  private stopAllAnimations(): void {
    this.streamingMessages.forEach((state) => {
      if (state.rafId != null) {
        window.cancelAnimationFrame(state.rafId);
      }
    });
    this.streamingMessages.clear();
  }

  private scrollToBottom(): void {
    this.log.scrollTop = this.log.scrollHeight;
  }

  private submit(): void {
    const value = this.input.value.trim();
    if (!value || !this.submitHandler) return;
    this.input.value = '';
    this.submitHandler(value);
  }
}
