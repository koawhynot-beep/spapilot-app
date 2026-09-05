// ═══════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════
// Lives apart from App.js so the screens in views.js can use it too. App.js
// imports views.js, so anything views.js needs from App.js would be a cycle.
import React, { useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useT } from './i18n';

export function Modal({ title, onClose, children }) {
  const t = useT();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="btn btn-ghost"
            style={{ minHeight: 'auto', padding: '8px 12px' }}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Search box with a leading icon and an inline clear button.
export function SearchField({ value, onChange, placeholder }) {
  const t = useT();
  return (
    <div className="search-wrap">
      <Search size={17} className="search-icon" />
      <input
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          onClick={() => onChange('')}
          aria-label={t('common.clearSearch')}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
