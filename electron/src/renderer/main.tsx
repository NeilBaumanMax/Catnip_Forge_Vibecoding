import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { notifyWhenRendererInteractive } from './startup-preload';
import './styles/global.less';
import './styles/apple.less';
import './styles/explore.less';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
void notifyWhenRendererInteractive();
