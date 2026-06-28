// ============================================================
// FWL CRM CRM — Utilities
// Safe formatting and shared helpers
// ============================================================

window.LP = window.LP || {};

LP.utils = (() => {
  function formatNumber(value, fallback = '0') {
    if (value == null || isNaN(value)) return fallback;
    return new Intl.NumberFormat('en-IN').format(value);
  }

  function formatCurrency(value, fallback = '₹0') {
    if (value == null || isNaN(value)) return fallback;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatPercent(value, fallback = '0%') {
    if (value == null || isNaN(value) || !isFinite(value)) return fallback;
    return `${Math.round(value)}%`;
  }

  function formatDelta(value, positivePrefix = '↑', negativePrefix = '↓') {
    if (value == null || isNaN(value)) return '';
    if (value > 0) return `${positivePrefix} ${formatNumber(value)}`;
    if (value < 0) return `${negativePrefix} ${formatNumber(Math.abs(value))}`;
    return '0';
  }

  function formatDuration(seconds, fallback = '—') {
    if (seconds == null || isNaN(seconds)) return fallback;
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }

  function formatRelativeTime(isoStr, fallback = 'No recent activity') {
    if (!isoStr) return fallback;
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return fallback;
    
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return {
    formatNumber,
    formatCurrency,
    formatPercent,
    formatDelta,
    formatDuration,
    formatRelativeTime,
  };
})();
