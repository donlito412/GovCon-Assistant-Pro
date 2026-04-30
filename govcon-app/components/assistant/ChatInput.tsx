'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Send, Loader2, Paperclip, X, FileText, AlertCircle,
} from 'lucide-react';

// ============================================================
// CHAT INPUT — message input with file upload support
// ============================================================

interface Props {
  onSend: (message: string, file?: File) => void;
  onFileSelect?: (file: File) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const ACCEPTED_TYPES = '.pdf';
const MAX_BYTES = 20 * 1024 * 1024;

export function ChatInput({ onSend, onFileSelect, isLoading, placeholder, disabled }: Props) {
  const [draft,        setDraft]        = useState('');
  const [file,         setFile]         = useState<File | null>(null);
  const [fileError,    setFileError]    = useState<string | null>(null);
  const [dragOver,     setDragOver]     = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const handleFile = useCallback((f: File) => {
    setFileError(null);
    if (!f.name.endsWith('.pdf') && f.type !== 'application/pdf') {
      setFileError('Only PDF files are supported');
      return;
    }
    if (f.size > MAX_BYTES) {
      setFileError('File must be under 20MB');
      return;
    }
    setFile(f);
    onFileSelect?.(f);
  }, [onFileSelect]);

  const handleSend = () => {
    if ((!draft.trim() && !file) || isLoading || disabled) return;
    onSend(draft.trim(), file ?? undefined);
    setDraft('');
    setFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  return (
    <div
      className={`relative border rounded-2xl transition ${
        dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'
      } ${disabled ? 'opacity-60' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Attached file */}
      {file && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded-lg px-2.5 py-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-medium truncate max-w-[240px]">{file.name}</span>
            <span className="text-purple-400">({(file.size / 1024).toFixed(0)}KB)</span>
          </div>
          <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {fileError && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5" />{fileError}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
        {/* File attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-40"
          title="Attach PDF"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); autoResize(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Ask me anything about government contracting…'}
          disabled={disabled || isLoading}
          rows={1}
          className="flex-1 text-sm bg-transparent resize-none outline-none placeholder-gray-400 text-gray-900 leading-relaxed py-1 disabled:opacity-60"
          style={{ maxHeight: '160px' }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!draft.trim() && !file) || isLoading || disabled}
          className="flex-shrink-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>

      {dragOver && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-blue-50 border-2 border-dashed border-blue-400 pointer-events-none">
          <p className="text-sm font-semibold text-blue-600">Drop PDF here</p>
        </div>
      )}
    </div>
  );
}
