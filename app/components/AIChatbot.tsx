"use client";

import { MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import { products } from "../lib/products";

type ChatMessage = { role: "user" | "assistant"; content: string };

const CONFIGURED_CHATBOT_API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL?.trim() ?? "";
const initialMessage: ChatMessage = {
  role: "assistant",
  content: "안녕하세요. MAISON ÉLAN AI 스타일 어시스턴트입니다. 상품 추천, 사이즈, 컬러와 쇼핑몰 이용 방법을 물어보세요.",
};
const suggestions = ["지금 가장 인기 있는 상품은?", "10만원 이하 상품 추천해줘", "배송과 반품 방법 알려줘"];
const productUrlPattern = /(https:\/\/springseed-park\.github\.io\/product\/[a-z0-9-]+|\/product\/[a-z0-9-]+)/gi;
const exactProductUrlPattern = /^(https:\/\/springseed-park\.github\.io\/product\/[a-z0-9-]+|\/product\/[a-z0-9-]+)$/i;
const productIds = new Set(products.map((product) => product.id));

function getChatbotApiUrl() {
  if (CONFIGURED_CHATBOT_API_URL) return CONFIGURED_CHATBOT_API_URL;
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) return "http://localhost:8787";
  return "";
}

function getChatSessionId() {
  const storageKey = "maison-elan-chat-session";
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) return stored;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function MessageContent({ content }: { content: string }) {
  return <>{content.split(productUrlPattern).map((part, index) => {
    const slug = part.match(/\/product\/([a-z0-9-]+)/i)?.[1];
    return exactProductUrlPattern.test(part) && slug && productIds.has(slug)
      ? <a href={`/product/${slug}`} key={`${part}-${index}`}>{part}</a>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  })}</>;
}

export function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryMessages, setRetryMessages] = useState<ChatMessage[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => toggleRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!open) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => () => activeControllerRef.current?.abort(), []);

  const requestAnswer = async (conversation: ChatMessage[]) => {
    const apiUrl = getChatbotApiUrl();
    const requestId = ++requestIdRef.current;
    activeControllerRef.current?.abort();
    setError("");
    setRetryMessages(null);
    setLoading(true);

    if (!apiUrl) {
      setError("AI 상담 연결을 준비 중입니다. 잠시 후 다시 이용해 주세요.");
      setRetryMessages(conversation);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Chat-Session": getChatSessionId() },
        body: JSON.stringify({ messages: conversation.slice(-8) }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({})) as { answer?: string; message?: string };
      if (!response.ok || !data.answer) throw new Error(data.message || "AI 답변을 불러오지 못했습니다.");
      if (requestId === requestIdRef.current) setMessages([...conversation, { role: "assistant", content: data.answer.slice(0, 1_500) }]);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setError(requestError instanceof Error && requestError.name === "AbortError" ? "답변이 지연되고 있어요. 잠시 후 다시 시도해 주세요." : requestError instanceof Error ? requestError.message : "AI 답변을 불러오지 못했습니다.");
      setRetryMessages(conversation);
    } finally {
      window.clearTimeout(timeout);
      if (requestId === requestIdRef.current) {
        activeControllerRef.current = null;
        setLoading(false);
      }
    }
  };

  const ask = (question: string) => {
    const content = question.trim().slice(0, 500);
    if (!content || loading) return;
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    void requestAnswer(nextMessages);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(input);
  };

  const reset = () => {
    requestIdRef.current += 1;
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
    setLoading(false);
    setMessages([initialMessage]);
    setInput("");
    setError("");
    setRetryMessages(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className={`ai-chatbot ${open ? "is-open" : ""}`}>
      {open && <section id="ai-chat-panel" className="ai-chat-panel" role="dialog" aria-modal="false" aria-labelledby="ai-chat-title">
        <header>
          <div><span className="ai-chat-brand-symbol"><img src="/maison-elan-symbol.svg" alt="" aria-hidden="true" /></span><p><strong id="ai-chat-title">ÉLAN AI</strong><em><i />스타일 어시스턴트</em></p></div>
          <nav aria-label="AI 상담 메뉴"><button type="button" onClick={reset} aria-label="새 대화 시작"><RotateCcw size={18} /></button><button type="button" onClick={close} aria-label="AI 상담 닫기"><X size={20} /></button></nav>
        </header>
        <div className="ai-chat-messages" ref={listRef} role="log" aria-live="polite" aria-relevant="additions text">
          {messages.map((message, index) => <div className={`ai-chat-message is-${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "É" : "나"}</span><p><MessageContent content={message.content} /></p></div>)}
          {messages.length === 1 && <div className="ai-chat-suggestions">{suggestions.map((suggestion) => <button type="button" onClick={() => ask(suggestion)} key={suggestion}>{suggestion}</button>)}</div>}
          {loading && <div className="ai-chat-typing" role="status" aria-label="답변 작성 중"><i /><i /><i /></div>}
          {error && <div className="ai-chat-error" role="alert"><p>{error}</p>{retryMessages && <button type="button" disabled={loading} onClick={() => void requestAnswer(retryMessages)}>다시 보내기</button>}</div>}
        </div>
        <form onSubmit={submit}>
          <label className="sr-only" htmlFor="ai-chat-input">AI 상담 질문</label>
          <input ref={inputRef} id="ai-chat-input" value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} disabled={loading} placeholder="상품이나 사이즈를 물어보세요" autoComplete="off" />
          <button type="submit" disabled={loading || !input.trim()} aria-label="질문 보내기"><Send size={18} /></button>
        </form>
        <small>개인정보·결제정보를 입력하지 마세요. AI는 개인 주문을 조회하지 못하며 답변은 참고용입니다.</small>
      </section>}
      <button ref={toggleRef} className="ai-chat-toggle" type="button" onClick={() => open ? close() : setOpen(true)} aria-expanded={open} aria-controls="ai-chat-panel" aria-label={open ? "AI 상담 닫기" : "AI 상담 열기"}>{open ? <X size={22} /> : <MessageCircle size={24} strokeWidth={1.35} />}</button>
    </div>
  );
}
