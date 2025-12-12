/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "background-primary": '#f5f5f5',
        "background-secondary": '#ffffff',
        "background-tertiary": '#fafafa',

        "border-primary": '#d9d9d9',
        "border-secondary": '#e8e8e8',

        "text-primary": '#262626',
        "text-secondary": '#595959',
        "text-tertiary": '#8c8c8c',

        "primary": '#1890ff',
        "primary-light": '#40a9ff',
        "primary-dark": '#096dd9',
        
        "secondary": '#52c41a',
        "secondary-light": '#73d13d',
        "secondary-dark": '#389e0d',
        
        "success": '#52c41a',
        "success-hover": '#73d13d',
        
        "fail": '#ff4d4f',
        "fail-hover": '#ff7875',
        
        "warn": '#faad14',
        "warn-hover": '#ffc53d',
        
        "gray-200": '#f0f0f0',
        "gray-300": '#d9d9d9',
        "gray-400": '#bfbfbf',
        
        "menu": '#001529',
        "menu-dark": '#000c17',
        "menu-light": '#002140',
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false
  }
}
