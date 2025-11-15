/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './src/**/*.{js,ts,jsx,tsx}',
    './dist/index.js', // Include built file for production
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        'none': '0',
        'sm': 'calc(var(--radius) * 0.5)',
        DEFAULT: 'var(--radius)',
        'md': 'var(--radius)',
        'lg': 'calc(var(--radius) * 1.5)',
        'xl': 'calc(var(--radius) * 2)',
        '2xl': 'calc(var(--radius) * 3)',
        'full': '9999px',
      },
      transitionDuration: {
        DEFAULT: 'var(--animation-duration, 150ms)',
      },
      padding: {
        'density-card': 'var(--density-card-p, 1.5rem)',
        'density-table-y': 'var(--density-table-py, 0.75rem)',
        'density-table-x': 'var(--density-table-px, 1rem)',
        'density-header-y': 'var(--density-header-py, 0.75rem)',
        'density-header-x': 'var(--density-header-px, 1rem)',
      },
      fontSize: {
        'density-table': 'var(--density-table-fs, 0.875rem)',
        'density-card': 'var(--density-card-fs, 1rem)',
      },
      colors: {
        'button-primary-bg': 'var(--color-button-primary-bg, #2563eb)',
        'button-primary-bg-dark': 'var(--color-button-primary-bg-dark, #60a5fa)',
        'button-muted-bg': 'var(--color-button-muted-bg, #e5e7eb)',
        'button-muted-bg-dark': 'var(--color-button-muted-bg-dark, #4b5563)',

        'brand-primary': 'var(--color-button-primary-bg, #2563eb)',
        'brand-secondary': 'var(--color-button-primary-bg, #2563eb)',

        // New semantic colors
        'app-bg': 'var(--color-app-bg, #f3f4f6)',
        'app-bg-dark': 'var(--color-app-bg-dark, #111827)',
        'container-bg': 'var(--color-container-bg, #ffffff)',
        'container-bg-dark': 'var(--color-container-bg-dark, #1f2937)',
        'container-muted-bg': 'var(--color-container-muted-bg, #f9fafb)',
        'container-muted-bg-dark': 'var(--color-container-muted-bg-dark, #374151)',
        'input-bg': 'var(--color-input-bg, #f3f4f6)',
        'input-bg-dark': 'var(--color-input-bg-dark, #374151)',
        'input-filter-bg': 'var(--color-input-filter-bg, #ffffff)',
        'input-filter-bg-dark': 'var(--color-input-filter-bg-dark, #4b5563)',
        'card-bg': 'var(--color-card-bg, #ffffff)',
        'card-bg-dark': 'var(--color-card-bg-dark, #1f2937)',
        'card-image-bg': 'var(--color-card-image-bg, #ffffff)',
        'card-image-bg-dark': 'var(--color-card-image-bg-dark, #e5e7eb)',
        'hover-bg': 'var(--color-hover-bg, #f3f4f6)',
        'hover-bg-dark': 'var(--color-hover-bg-dark, #374151)',
        'selected-bg': 'var(--color-selected-bg, #dbeafe)',
        'selected-bg-dark': 'var(--color-selected-bg-dark, #1e40af)',
        'inner-block-bg': 'var(--color-inner-block-bg, #ffffff)',
        'inner-block-bg-dark': 'var(--color-inner-block-bg-dark, #1f2937)',
        
        'status-success-bg': 'var(--color-status-success-bg, #dcfce7)',
        'status-success-text': 'var(--color-status-success-text, #166534)',
        'status-info-bg': 'var(--color-status-info-bg, #dbeafe)',
        'status-info-text': 'var(--color-status-info-text, #1e40af)',
        'status-warning-bg': 'var(--color-status-warning-bg, #fef9c3)',
        'status-warning-text': 'var(--color-status-warning-text, #854d0e)',
        'status-danger-bg': 'var(--color-status-danger-bg, #fee2e2)',
        'status-danger-text': 'var(--color-status-danger-text, #991b1b)',
        'status-success-bg-dark': 'var(--color-status-success-bg-dark, #14532d)',
        'status-success-text-dark': 'var(--color-status-success-text-dark, #bbf7d0)',
        'status-info-bg-dark': 'var(--color-status-info-bg-dark, #1e3a8a)',
        'status-info-text-dark': 'var(--color-status-info-text-dark, #93c5fd)',
        'status-warning-bg-dark': 'var(--color-status-warning-bg-dark, #713f12)',
        'status-warning-text-dark': 'var(--color-status-warning-text-dark, #fef08a)',
        'status-danger-bg-dark': 'var(--color-status-danger-bg-dark, #7f1d1d)',
        'status-danger-text-dark': 'var(--color-status-danger-text-dark, #fca5a5)',

        'action-primary': 'var(--color-button-primary-bg, #2563eb)',
        'action-primary-hover': 'var(--color-action-primary-hover, #1d4ed8)',
        'action-primary-dark': 'var(--color-button-primary-bg-dark, #60a5fa)',
        'action-primary-hover-dark': 'var(--color-action-primary-hover-dark, #93c5fd)',
        
        'action-danger': 'var(--color-action-danger, #dc2626)',
        'action-danger-hover': 'var(--color-action-danger-hover, #b91c1c)',
        'action-danger-dark': 'var(--color-action-danger-dark, #f87171)',
        'action-danger-hover-dark': 'var(--color-action-danger-hover-dark, #fca5a5)',

        // Worksheet colors
        'worksheet-bg': 'var(--color-worksheet-bg)',
        'worksheet-text': 'var(--color-worksheet-text)',
        'worksheet-header-bg': 'var(--color-worksheet-header-bg)',
        'worksheet-total-bg': 'var(--color-worksheet-total-bg)',

        // Original colors (can be overridden by the above)
        'base-100': 'var(--color-container-bg, #ffffff)',
        'base-200': 'var(--color-app-bg, #f3f4f6)',
        'base-300': 'var(--color-container-muted-bg, #e5e7eb)',
        'base-dark': 'var(--color-app-bg-dark, #111827)',
        'base-dark-200': 'var(--color-container-bg-dark, #1f2937)',
        'base-dark-300': 'var(--color-container-muted-bg-dark, #374151)',
        'card-100': 'var(--color-card-bg, #ffffff)',
        'card-dark-100': 'var(--color-card-bg-dark, #1f2937)',
      },
      borderColor: {
        'default': 'var(--color-border-default)',
        'worksheet': 'var(--color-worksheet-border)',
      },
      boxShadow: {
          sm: '0 1px 2px 0 rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.05))',
          DEFAULT: '0 1px 3px 0 rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.1)), 0 1px 2px -1px rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.1))',
          md: '0 4px 6px -1px rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.1)), 0 2px 4px -2px rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.1))',
          lg: '0 10px 15px -3px rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.1)), 0 4px 6px -4px rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.1))',
          xl: '0 20px 25px -5px rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.1)), 0 8px 10px -6px rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.1))',
          '2xl': '0 25px 50px -12px rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.25))',
          inner: 'inset 0 2px 4px 0 rgb(var(--shadow-rgb) / var(--shadow-opacity, 0.05))',
      },
      textColor: {
        'button-primary': 'var(--color-button-primary-text, #ffffff)',
        'button-primary-dark': 'var(--color-button-primary-text-dark, #111827)',
        'button-muted': 'var(--color-button-muted-text, #1f2937)',
        'button-muted-dark': 'var(--color-button-muted-text-dark, #f9fafb)',
        'base': 'var(--color-text-base, #1f2937)',
        'base-dark': 'var(--color-text-base-dark, #f9fafb)',
        'muted': 'var(--color-text-muted, #6b7280)',
        'muted-dark': 'var(--color-text-muted-dark, #9ca3af)',
        'link': 'var(--color-text-link, #2563eb)',
        'link-dark': 'var(--color-text-link-dark, #60a5fa)',
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
