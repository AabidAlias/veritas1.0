export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { ink: '#1B2430', paper: '#F4F6F8', rule: '#D5DAE1', seal: '#1F4E5F', ok: '#2F6B4F', bad: '#A23B3B', warn: '#8A6410', judge: '#5B4B8A', mute: '#5B6573' },
    fontFamily: { serif: ['"IBM Plex Serif"', 'Georgia', 'serif'], sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'] },
  } },
  plugins: [],
};
