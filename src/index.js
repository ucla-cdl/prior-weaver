import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
window.BACKEND_ADDRESS = process.env.NODE_ENV === 'production' ? process.env.REACT_APP_BACKEND_URL : 'http://localhost:8000';
window.POST_TASK_SURVEY_URL = process.env.REACT_APP_POST_TASK_SURVEY_URL;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
